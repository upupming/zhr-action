#!/usr/bin/env node

import { runZjuHealthReport } from "./api";


const username = process.env.username
const password = process.env.password
runZjuHealthReport(username, password)
