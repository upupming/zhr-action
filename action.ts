import 'source-map-support/register'
import * as core from '@actions/core'

async function run() {
  try {
    (await import('./api')).runZjuHealthReport(core.getInput('username'), core.getInput('password'))
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
