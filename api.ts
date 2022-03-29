import puppeteer, { JSONObject } from 'puppeteer-core'
import { Launcher } from 'chrome-launcher';

declare global {
  interface Window {
    vm: any
  }
}

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
    console.log('errMsg', errMsg)
    if (errMsg) {
      return errMsg
    }
  })

  if (errMsg) throw new Error(`登录失败: ${errMsg}`)
  console.log(`${__username} 登陆成功！`)
  await page.waitForTimeout(3000)
}

const submit = async (page: puppeteer.Page, dev: boolean) => {
  let errMsg = await page.evaluate((): string | undefined => {
    try {
      const { vm } = window
      // 是否在校
      vm.setSfzx('1')
      // 密切接触
      vm.info.sfymqjczrj = 0
      // 本人承诺
      vm.info.sfqrxxss = 1
      if (vm.oldInfo?.geo_api_info == null) {
        return `vm.oldInfo.geo_api_info 为空，请先手动打一次卡，确保有地理位置信息存在。`
      }
      vm.locatComplete(JSON.parse(vm.oldInfo.geo_api_info))
      vm.save()
    } catch (err) {
      return (err as Error)?.message
    }
  })
  await page.waitForTimeout(1000)
  errMsg ??= await page.evaluate(() => {
    let popup = document.getElementById('wapat')
    if (popup) {
      if (getComputedStyle(popup).display !== 'none') {
        return document.querySelector('.wapat-title')?.textContent ?? undefined
      }
    }
  })
  let oldInfo = await page.evaluate(() => (window.vm.oldInfo as JSONObject))
  if (errMsg) throw new Error(`打卡提交失败：${errMsg}

${dev ? `你前一次打卡的信息为：

${JSON.stringify(oldInfo, null, 2)}

请检查之前的提交是否缺少了什么信息，如有必要请手动打一次卡。` : '将环境变量 NODE_ENV 设置为 development 可以获得 oldInfo 的详细信息，请参考官方文档: https://github.com/zju-health-report/action#%E5%91%BD%E4%BB%A4%E8%A1%8C-cli'}
`)
  console.log(`打卡成功！`)
  await page.waitForTimeout(3000)
}

export async function runZjuHealthReport(username?: string, password?: string) {
  if (!username) {
    throw new Error('请配置环境变量 username，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
  }
  if (!password) {
    throw new Error('请配置环境变量 password，详情请阅读项目 README.md: https://github.com/zju-health-report/action')
  }

  const dev = process.env.NODE_ENV === 'development'
  const browser = await puppeteer.launch({
    executablePath: Launcher.getInstallations()[0],
    headless: !dev,
    devtools: dev
  });
  const page = await browser.newPage();
  await page.goto('https://healthreport.zju.edu.cn/ncov/wap/default/index', {
    waitUntil: 'networkidle2',
  });

  try {
    await login(page, username, password)
    await submit(page, dev)
  } finally {
    await browser.close();
  }
}
