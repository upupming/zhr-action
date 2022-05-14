import puppeteer, { JSONObject } from 'puppeteer-core'
import { Launcher } from 'chrome-launcher';
import { banner } from './banner';
import { Console } from 'console'
import { PassThrough } from 'stream'
import fs from 'fs'
import tmp from 'tmp'
import commandExists from 'command-exists'
import { spawnSync } from 'child_process'
import { RequestOptions, request as httpsRequest } from 'https'
import { ChalkInstance } from 'chalk';

declare global {
  interface Window {
    vm: any
  }
  namespace NodeJS {
    interface ProcessEnv {
      CI: boolean
    }
  }
}

const waitFor = async (condFunc: () => boolean) => {
  return new Promise((resolve) => {
    if (condFunc()) {
      resolve(undefined);
    }
    else {
      setTimeout(async () => {
        await waitFor(condFunc);
        resolve(undefined);
      }, 100);
    }
  });
};

export class ZjuHealthReporter {
  config: Required<ZjuHealthReportConfig>
  logString: string = ''
  console: Console;
  browser!: puppeteer.Browser;
  chalk!: ChalkInstance;
  page!: puppeteer.Page;
  ocrRecognizeVerifyCodeRetryTimes = 0
  MAX_ocrRecognizeVerifyCodeRetryTimes = 100
  verifyCodeImgFile = ''
  verifyCode = ''
  EXPECTED_VERIFY_CODE_LENGTH = 4
  dev: boolean
  NETWORK_ERROR_KEYWORDS = ['net::ERR_INTERNET_DISCONNECTED', 'Navigation timeout', 'Execution context was destroyed, most likely because of a navigation.']
  constructor(config: ZjuHealthReportConfig) {
    this.config = {
      username: '',
      password: '',
      dingtalkToken: '',
      networkErrorRetryTimes: 5,
      ...config,
    }
    this.console = new Console(this.createPassThrough(process.stdout), this.createPassThrough(process.stderr))
    this.dev = process.env.NODE_ENV === 'development'
  }
  createPassThrough(stream: NodeJS.WriteStream) {
    const passThrough = new PassThrough()
    passThrough.pipe(stream)
    passThrough.on('data', (chunk) => {
      chunk && (this.logString += Buffer.from(chunk).toString())
    });
    passThrough.on('error', (err) => { throw (err) });
    return passThrough
  }

  private async login() {
    this.page = await this.browser.newPage();
    this.page.on('response', async response => {
      const url = response.url();
      if (response.request().resourceType() === 'image') {
        response.buffer().then(file => {
          let fileName = url.split('/').pop();
          if (!fileName) return
          fileName = fileName.split('?')[0]
          if (!(/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(fileName)) fileName += '.png'

          if (this.dev) {
            console.log(`📷 捕获到图片请求 ${url.split('?')[0]}, ${fileName}`)
          }
          // currently we only need code.png
          if (fileName === 'code.png') {
            this.verifyCodeImgFile = tmp.tmpNameSync({ postfix: fileName })
            const writeStream = fs.createWriteStream(this.verifyCodeImgFile);
            writeStream.write(file);
          }
        });
      }
    });
    await this.page.goto('https://healthreport.zju.edu.cn/ncov/wap/default/index', {
      waitUntil: 'networkidle2',
    });

    let errMsg = await this.page.evaluate((__username: string, __password: string): string | undefined => {
      try {
        (document.getElementById('username') as HTMLInputElement)!.value = __username;
        (document.getElementById('password') as HTMLInputElement)!.value = __password;
        (document.querySelector('.login-button > button') as HTMLButtonElement).click()
      } catch (err) {
        return (err as Error)?.message
      }
    }, this.config.username, this.config.password);

    await this.page.waitForTimeout(3000)

    errMsg ??= await this.page.evaluate((): string | undefined => {
      const errMsg = document.getElementById('msg')?.textContent
      if (errMsg) {
        return errMsg
      }
    })

    if (errMsg) throw new Error(`❌ 登录失败，网页报错为: ${this.chalk.red(errMsg)}`)
    this.console.log(`✅ ${this.config.username} ${this.chalk.green('登陆成功！')}\n`)
  }

  private async ocrRecognizeVerifyCode(): Promise<void> {
    this.ocrRecognizeVerifyCodeRetryTimes++
    if (this.ocrRecognizeVerifyCodeRetryTimes > this.MAX_ocrRecognizeVerifyCodeRetryTimes) {
      throw new Error(`❌ 验证码识别超过最大重试次数 ${this.MAX_ocrRecognizeVerifyCodeRetryTimes}`)
    }
    if (this.ocrRecognizeVerifyCodeRetryTimes > 1) {
      this.console.log(`验证码识别失败，重试第 ${this.ocrRecognizeVerifyCodeRetryTimes} 次...`)
      await this.page.evaluate(() => {
        const { vm } = window
        vm.change()
      })
    }
    await waitFor(() => !!this.verifyCodeImgFile)
    if (!await commandExists('tesseract')) {
      throw new Error('❌ 请参考安装 tesseract 命令行工具，用于验证码识别，参考链接: https://tesseract-ocr.github.io/tessdoc/Installation.html')
    }
    const args = `tesseract ${this.verifyCodeImgFile} stdout -l eng --psm 7 -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.split(' ')
    const tesseractProcess = spawnSync(args[0], args.slice(1))
    const tesseractOutput = tesseractProcess.stdout.toString()
    this.verifyCodeImgFile = ''
    // GitHub Action will report warning here, but it's not a problem
    // const tesseractError = tesseractProcess.stderr.toString()
    // if (tesseractError) throw new Error(`❌ tesseract 识别验证码失败，错误信息为: ${tesseractError}`)
    this.verifyCode = tesseractOutput.trim()
    if (this.verifyCode.length !== this.EXPECTED_VERIFY_CODE_LENGTH) {
      this.console.log(`识别出的验证码 ${this.verifyCode} 不符合长度为 ${this.EXPECTED_VERIFY_CODE_LENGTH} 的要求`)
      return this.ocrRecognizeVerifyCode()
    }
    this.console.log(`当前验证码识别结果为: ${this.chalk.green(this.verifyCode)}`)
  }

  private async submit(): Promise<void> {
    let errMsg = await this.page.evaluate((__verifyCode: string): string | undefined => {
      try {
        const { vm } = window
        for (const key in vm.oldInfo) {
          // if it is an empty value ('', null, undefined), skip assigning
          if (!vm.oldInfo[key]) continue
          vm.info[key] = vm.oldInfo[key]
        }
        vm.info.verifyCode = __verifyCode
        // confirm 包含一系列前端校验
        vm.confirm()
        // 确认弹窗：「每天只能填报一次，请确认信息是否全部正确？」
        document.querySelector<HTMLObjectElement>('.wapcf-btn-ok')?.click()
        // save 直接发出后端请求
        // vm.save()
      } catch (err) {
        return (err as Error)?.message
      }
    }, this.verifyCode)
    await this.page.waitForTimeout(1000)
    errMsg ??= await this.page.evaluate(() => {
      let popup = document.getElementById('wapat')
      if (popup) {
        if (getComputedStyle(popup).display !== 'none') {
          let errMsg = document.querySelector('.wapat-title')?.textContent ?? undefined
          // 关闭弹窗
          document.querySelector<HTMLObjectElement>('.wapat-btn-ok')?.click()
          return errMsg
        }
      }
    })

    if (errMsg?.includes('验证码错误')) {
      await this.ocrRecognizeVerifyCode()
      return await this.submit()
    }
    this.console.log()

    errMsg ??= await this.page.evaluate(() => {
      // 弹窗：「提交信息成功」
      const { vm } = window
      if (vm.show) {
        return undefined
      }
      return '打卡未报错，但是页面没有显示打卡成功，请手动检查是否真的打卡成功了'
    })

    let oldInfo = await this.page.evaluate(() => (window.vm.oldInfo as JSONObject))
    let errorGuide = `常见错误：
    1. 今天已经打过卡了，可以忽略此报错。
    2. 表单可能新增了内容，请检查之前的提交是否缺少了什么信息，如有必要请手动打一次卡。`
    if (errMsg) throw new Error(`❌ 打卡提交失败，网页报错为：${this.chalk.red(errMsg)}
  ${this.dev ? `你前一次打卡的信息为：

  ${JSON.stringify(oldInfo, null, 2)}

  ${errorGuide}

  如果遇到问题，请附上脱敏后的 oldInfo 前往 GitHub 提交 issue: https://github.com/zju-health-report/action/issues/new
  ` : `
  ${errorGuide}

  将环境变量 NODE_ENV 设置为 development 可以获得 oldInfo 的详细信息，请参考官方文档: https://github.com/zju-health-report/action#报告问题`}
`)
    this.console.log(`${this.chalk.green(`✅ 打卡成功！`)}\n`)
  }

  private async notifyDingtalk(dingtalkToken?: string) {
    if (!dingtalkToken) return
    const { status, data } = await request({
      hostname: 'oapi.dingtalk.com',
      path: `/robot/send?access_token=${dingtalkToken}`,
      port: 443,
      method: 'POST',
      data: {
        msgtype: 'text',
        text: {
          content: `
${removeColorModifier(this.logString).trim()}
${process.env.ACTION_URL ? `
GitHub workflow: ${process.env.ACTION_URL}` : ''}
`.trim()
        },
      }
    })
    if (status !== 200) {
      throw new Error(`❌ 钉钉消息推送失败，状态码：${this.chalk.red(status)}`)
    }
    const response = JSON.parse(data)
    if (response.errcode != 0) {
      throw new Error(`❌ 钉钉消息推送失败，错误：${this.chalk.red(response.errmsg)}`)
    }
    this.console.log(`${this.chalk.green('✅ 钉钉消息推送成功！')}\n`)
  }

  async runReport(): Promise<void> {
    this.logString = ''

    const {
      username,
      password,
      dingtalkToken
    } = this.config

    if (!username) {
      throw new Error('❌ 请配置环境变量 username，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
    }
    if (!password) {
      throw new Error('❌ 请配置环境变量 password，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
    }

    this.chalk = new (await import('chalk')).Chalk({
      level: 3
    })
    this.browser?.close()
    this.browser = await puppeteer.launch({
      executablePath: Launcher.getInstallations()[0],
      headless: process.env.CI || !this.dev,
      devtools: this.dev
    });
    // if any error happens in the following code, we must close the browser to avoid non-exit hanging up of the process
    let mainErrorMsg = ''
    try {
      this.console.log(banner)

      await this.login()
      await this.ocrRecognizeVerifyCode()
      await this.submit()
    } catch (mainError) {
      debugger
      this.logString += (mainError as Error)?.message
      mainErrorMsg += (mainError as Error)?.message

      for (const keyword of this.NETWORK_ERROR_KEYWORDS) {
        if ((mainError as Error)?.message?.includes(keyword)) {
          if (--this.config.networkErrorRetryTimes <= 0) {
            this.console.log(`网络错误超出重试次数上限\n`)
            break
          }
          this.console.log(`遇到网络错误: ${(mainError as Error)?.message}，尝试进行重试，剩余次数 ${this.config.networkErrorRetryTimes}...`)
          return await this.runReport()
        }
      }
    }

    try {
      await this.notifyDingtalk(dingtalkToken)
    } catch (notifyError) {
      mainErrorMsg = `
  ${mainErrorMsg}
  ${(notifyError as Error)?.message}
        `.trim()
    }

    await this.browser.close();
    if (mainErrorMsg) throw new Error(mainErrorMsg)
  }
}

export interface ZjuHealthReportConfig {
  /** ZJU 学号 */
  username?: string
  /** ZJU 密码 */
  password?: string
  /** 钉钉消息通知 access token，如果不传不会进行消息推送 */
  dingtalkToken?: string
  /** 出现意外的网络错误时（例如 puppeteer 出现网络问题 net::ERR_INTERNET_DISCONNECTED）会重试，最大重试次数 */
  networkErrorRetryTimes?: number
}

export interface RequestResult {
  status?: number
  data: string
}
async function request(options: RequestOptions & { data: object }) {
  return new Promise<RequestResult>((resolve, reject) => {
    const requestData = JSON.stringify(options.data)

    if (process.env.NODE_ENV === "development") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      options.hostname = 'localhost';
      options.port = '65292';
    }

    const req = httpsRequest({
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // 因为有中文，所以必须用 Buffer 转一下，当然可以直接不设置 Content-Length
        'Content-Length': Buffer.from(requestData).length,
        ...options.headers,
      },
    }, res => {
      let resData = ''
      res.on('data', d => {
        resData += d
      })
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: resData
        })
      })
    })

    req.on('error', error => {
      reject(error)
    })
    req.write(requestData)
    req.end()
  })

}

function removeColorModifier(str: string) {
  // https://stackoverflow.com/a/29497680/8242705
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}
