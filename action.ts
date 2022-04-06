import 'source-map-support/register'
import * as core from '@actions/core'

async function run() {
  const chalk = new (await import('chalk')).Chalk({
    level: 3
  })

  try {
    await (await import('./api')).runZjuHealthReport(core.getInput('username'), core.getInput('password'))
  } catch (error) {
    core.setFailed(chalk.red((error as Error)?.message ?? '未知错误'));
  }
}

run();
