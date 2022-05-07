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
    await (await import('../src/api')).runZjuHealthReport(core.getInput('username'), core.getInput('password'), core.getInput('dingtalk_token'))
  } catch (error) {
    core.setFailed((error as Error)?.message ?? '未知错误');
  }
}

run();
