import puppeteer, { JSONObject } from 'puppeteer-core'
import { Launcher } from 'chrome-launcher';
import { banner } from './banner';
import { Console } from 'console'
import { PassThrough } from 'stream'
import fs from 'fs'
import tmp from 'tmp'
import commandExists from 'command-exists'
import { spawnSync } from 'child_process'

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

export async function runZjuHealthReport(username?: string, password?: string, dingtalkToken?: string) {
  // All logs will be saved to logString for further usage for dingtalk msg sender
  let logString: string = ''
  const createPassThrough = (stream: NodeJS.WriteStream) => {
    const passThrough = new PassThrough()
    passThrough.pipe(stream)
    passThrough.on('data', (chunk) => {
      chunk && (logString += Buffer.from(chunk).toString())
    });
    passThrough.on('error', (err) => { throw (err) });
    return passThrough
  }

  const console = new Console(createPassThrough(process.stdout), createPassThrough(process.stderr))

  if (!username) {
    throw new Error('❌ 请配置环境变量 username，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
  }
  if (!password) {
    throw new Error('❌ 请配置环境变量 password，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
  }

  const dev = process.env.NODE_ENV === 'development'

  const browser = await puppeteer.launch({
    executablePath: Launcher.getInstallations()[0],
    headless: process.env.CI || !dev,
    devtools: dev
  });
  const page = await browser.newPage();
  await page.goto('https://healthreport.zju.edu.cn/ncov/wap/default/index', {
    waitUntil: 'networkidle2',
  });

  const chalk = new (await import('chalk')).Chalk({
    level: 3
  })


  let verifyCodeImgFile = ''
  let verifyCode = ''
  page.on('response', async response => {
    const url = response.url();
    if (response.request().resourceType() === 'image') {
      response.buffer().then(file => {
        let fileName = url.split('/').pop();
        if (!fileName) return
        fileName = fileName.split('?')[0]
        if (!(/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(fileName)) fileName += '.png'

        console.log(`📷 捕获到图片请求 ${url.split('?')[0]}, ${fileName}`)
        // currently we only need code.png
        if (fileName === 'code.png') {
          verifyCodeImgFile = tmp.tmpNameSync({ postfix: fileName })
          const writeStream = fs.createWriteStream(verifyCodeImgFile);
          writeStream.write(file);
        }
      });
    }
  });

  const login = async (page: puppeteer.Page, __username: string, __password: string) => {
    let errMsg = await page.evaluate((__username: string, __password: string): string | undefined => {
      try {
        (document.getElementById('username') as HTMLInputElement)!.value = __username;
        (document.getElementById('password') as HTMLInputElement)!.value = __password;
        (document.querySelector('.login-button > button') as HTMLButtonElement).click()
      } catch (err) {
        return (err as Error)?.message
      }
    }, __username, __password);

    await page.waitForTimeout(3000)

    errMsg ??= await page.evaluate((): string | undefined => {
      const errMsg = document.getElementById('msg')?.textContent
      if (errMsg) {
        return errMsg
      }
    })

    if (errMsg) throw new Error(`❌ 登录失败，网页报错为: ${chalk.red(errMsg)}`)
    console.log(`✅ ${__username} ${chalk.green('登陆成功！')}\n`)
  }

  let ocrRecognizeVerifyCodeRetryTimes = 0
  const MAX_OCR_RETRY_TIMES = 10, EXPECTED_VERIFY_CODE_LENGTH = 4
  const ocrRecognizeVerifyCode = async (): Promise<void> => {
    if (ocrRecognizeVerifyCodeRetryTimes > MAX_OCR_RETRY_TIMES) {
      throw new Error(`❌ 验证码识别超过最大重试次数 ${MAX_OCR_RETRY_TIMES}`)
    }
    ocrRecognizeVerifyCodeRetryTimes++
    if (ocrRecognizeVerifyCodeRetryTimes > 1) {
      console.log(`验证码识别失败，重试第 ${ocrRecognizeVerifyCodeRetryTimes} 次...`)
    }
    await waitFor(() => !!verifyCodeImgFile)
    if (!await commandExists('tesseract')) {
      throw new Error('❌ 请参考安装 tesseract 命令行工具，用于验证码识别，参考链接: https://tesseract-ocr.github.io/tessdoc/Installation.html')
    }
    const args = `tesseract ${verifyCodeImgFile} stdout -l eng --psm 7 -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.split(' ')
    const tesseractProcess = spawnSync(args[0], args.slice(1))
    const tesseractOutput = tesseractProcess.stdout.toString()
    verifyCodeImgFile = ''
    // GitHub Action will report warning here, but it's not a problem
    // const tesseractError = tesseractProcess.stderr.toString()
    // if (tesseractError) throw new Error(`❌ tesseract 识别验证码失败，错误信息为: ${tesseractError}`)
    verifyCode = tesseractOutput.trim()
    if (verifyCode.length !== EXPECTED_VERIFY_CODE_LENGTH) {
      console.log(`识别出的验证码 ${verifyCode} 不符合长度为 ${EXPECTED_VERIFY_CODE_LENGTH} 的要求`)
      await page.evaluate(() => {
        const { vm } = window
        vm.change()
      })
      return ocrRecognizeVerifyCode()
    }
    console.log(`当前验证码识别结果为: ${chalk.green(verifyCode)}`)
  }

  const submit = async (page: puppeteer.Page, dev: boolean): Promise<void> => {
    let errMsg = await page.evaluate((__verifyCode: string): string | undefined => {
      try {
        const { vm } = window
        for (const key in vm.oldInfo) {
          // if it is an empty value ('', null, undefined), skip assigning
          if (!vm.oldInfo[key]) continue
          vm.info[key] = vm.oldInfo[key]
        }
        vm.info.verifyCode = __verifyCode
        // vm.confirm()
        vm.save()
        document.querySelector<HTMLObjectElement>('.wapcf-btn-ok')?.click()
      } catch (err) {
        return (err as Error)?.message
      }
    }, verifyCode)
    await page.waitForTimeout(1000)
    errMsg ??= await page.evaluate(() => {
      let popup = document.getElementById('wapat')
      if (popup) {
        if (getComputedStyle(popup).display !== 'none') {
          return document.querySelector('.wapat-title')?.textContent ?? undefined
        }
      }
    })

    if (errMsg?.includes('验证码错误')) {
      // 这里不需要手动刷新，页面会自动刷新验证码
      await ocrRecognizeVerifyCode()
      return await submit(page, dev)
    }
    console.log()

    let oldInfo = await page.evaluate(() => (window.vm.oldInfo as JSONObject))
    let errorGuide = `常见错误：
    1. 今天已经打过卡了，可以忽略此报错。
    2. 表单可能新增了内容，请检查之前的提交是否缺少了什么信息，如有必要请手动打一次卡。`
    if (errMsg) throw new Error(`❌ 打卡提交失败，网页报错为：${chalk.red(errMsg)}
  ${dev ? `你前一次打卡的信息为：

  ${JSON.stringify(oldInfo, null, 2)}

  ${errorGuide}

  如果遇到问题，请附上脱敏后的 oldInfo 前往 GitHub 提交 issue: https://github.com/zju-health-report/action/issues/new
  ` : `
  ${errorGuide}

  将环境变量 NODE_ENV 设置为 development 可以获得 oldInfo 的详细信息，请参考官方文档: https://github.com/zju-health-report/action#报告问题`}
`)
    console.log(`${chalk.green(`✅ 打卡成功！`)}\n`)
  }

  const notifyDingtalk = async (dingtalkToken?: string) => {
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
${removeColorModifier(logString).trim()}
${process.env.ACTION_URL ? `
GitHub workflow: ${process.env.ACTION_URL}` : ''}
`.trim()
        },
      }
    })
    if (status !== 200) {
      throw new Error(`❌ 钉钉消息推送失败，状态码：${chalk.red(status)}`)
    }
    const response = JSON.parse(data)
    if (response.errcode != 0) {
      throw new Error(`❌ 钉钉消息推送失败，错误：${chalk.red(response.errmsg)}`)
    }
    console.log(`${chalk.green('✅ 钉钉消息推送成功！')}\n`)
  }


  let mainErrorMsg = ''
  try {
    console.log(banner)

    await login(page, username, password)
    await ocrRecognizeVerifyCode()
    await submit(page, dev)
  } catch (mainError) {
    logString += (mainError as Error)?.message
    mainErrorMsg += (mainError as Error)?.message
    throw (mainError)
  } finally {
    try {
      await notifyDingtalk(dingtalkToken)
    } catch (notifyErrorMsg) {
      throw (new Error(`
${mainErrorMsg}
${(notifyErrorMsg as Error)?.message}
      `.trim()))
    } finally {
      await browser.close();
    }
  }
}

import { RequestOptions, request as httpsRequest } from 'https'
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
