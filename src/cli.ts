#!/usr/bin/env node
import 'source-map-support/register'
import dotenv from 'dotenv'
dotenv.config()
import { ZjuHealthReporter } from "./api";

async function run() {
  const username = process.env.username
  const password = process.env.password
  const cookieEaiSess = process.env.cookie_eai_sess
  const dingtalkToken = process.env.dingtalk_token

  try {
    await new ZjuHealthReporter({ username, password, dingtalkToken, cookieEaiSess }).runReport()
  } catch (error) {
    console.log((error as Error)?.message ?? '未知错误');
  }
}

run()
