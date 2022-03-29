#!/usr/bin/env node
import 'source-map-support/register'
import dotenv from 'dotenv'
dotenv.config()
import { runZjuHealthReport } from "./api";


const username = process.env.username
const password = process.env.password
runZjuHealthReport(username, password)
