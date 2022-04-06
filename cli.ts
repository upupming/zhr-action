#!/usr/bin/env node
import 'source-map-support/register'
import dotenv from 'dotenv'
dotenv.config()
import { runZjuHealthReport } from "./api";

async function run() {
  const username = process.env.username
  const password = process.env.password

  const chalk = (await import('chalk')).default
  try {
    await runZjuHealthReport(username, password)
  } catch (error) {
    console.log(chalk.red((error as Error)?.message ?? '未知错误'));
  }
}

run()
