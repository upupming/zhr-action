import gradientString from 'gradient-string'

export const banner = gradientString([
  { color: '#ffb86c', pos: 0 },
  { color: '#ff79c6', pos: 0.5 },
  { color: '#bd93f9', pos: 1 }
])(`
zju-health-report (ZHR) - 浙江大学健康打卡自动化脚本

Action: https://github.com/zju-health-report/action
Demo: https://github.com/zju-health-report/zju-health-report-action-demo
`)
