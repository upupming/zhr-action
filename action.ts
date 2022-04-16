import 'source-map-support/register'
import * as core from '@actions/core'

async function run() {

  try {
    await (await import('./api')).runZjuHealthReport(core.getInput('username'), core.getInput('password'), core.getInput('dingtalk_token'))
  } catch (error) {
    core.setFailed((error as Error)?.message ?? '未知错误');
  }
}

run();
