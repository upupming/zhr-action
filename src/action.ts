import 'source-map-support/register'
import * as core from '@actions/core'
import * as exec from '@actions/exec';

async function run() {
  let cmd0, cmd1
  if (process.platform == "linux") {
    cmd0 = "apt-get update"
    cmd1 = "apt-get install tesseract-ocr libtesseract-dev -y"
  } else if (process.platform == "darwin") {
    cmd0 = "brew update"
    cmd1 = "brew install tesseract"
  }
  await exec.exec("sudo " + cmd0, [], { silent: true })
  await exec.exec("sudo " + cmd1, [], { silent: true })

  try {
    const username = core.getInput('username')
    const password = core.getInput('password')
    const cookieEaiSess = core.getInput('cookie_eai_sess')
    const dingtalkToken = core.getInput('dingtalk_token')
    await new (await import('../src/api')).ZjuHealthReporter({
      username,
      password,
      dingtalkToken,
      cookieEaiSess
    }).runReport()
  } catch (error) {
    core.setFailed((error as Error)?.message ?? '未知错误');
  }
}

run();
