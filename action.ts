import * as core from '@actions/core'

async function run() {
  process.env.username = core.getInput('username');
  process.env.password = core.getInput('password');

  try {
    (await import('./api')).runZjuHealthReport()
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
