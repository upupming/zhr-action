#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config()
import { runZjuHealthReport } from "./api";


const username = process.env.username
const password = process.env.password
runZjuHealthReport(username, password)
