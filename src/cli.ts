#!/usr/bin/env node
import 'source-map-support/register'
import dotenv from 'dotenv'
dotenv.config()
import { runZjuHealthReport } from "./api";

async function run() {
  const username = process.env.username
  const password = process.env.password
  const dingtalkToken = process.env.dingtalk_token

  try {
    await runZjuHealthReport(username, password, dingtalkToken)
  } catch (error) {
    console.log((error as Error)?.message ?? '未知错误');
  }
}

run()
