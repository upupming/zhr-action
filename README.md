# @zju-health-report/action (ZHR)

浙江大学健康打卡自动打卡脚本，支持 Node.js 本地运行和 GitHub Action 定时运行。

> 原有的打卡脚本 https://github.com/Long0x0/ZJU-nCov-Hitcarder 迫于压力删库，因此以匿名身份创建此脚本供大家使用。

## GitHub Action 使用方法（推荐）

- 参考：https://github.com/zju-health-report/zhr-action-demo
- 注意要用 GitHub Action 自动打卡是 Fork `zhr-action-demo` 这个仓库，而不是此仓库，此仓库是 ZHR Action 的源码，而 `zhr-action-demo` 是使用 ZHR Action 的一个 demo。

## 命令行 CLI

如果你安装了 Node.js，可以直接使用 `npx` 手动运行此打卡脚本。需要设置环境变量 `username` 和 `password`，同时需要注意不同的命令行设置环境变量的方式不太一样。

Windows Powershell:

```bash
$env:username="浙大通行证用户名"
$env:password="浙大通行证密码"
npx github:zju-health-report/action#release
```

Windows CMD:

```bash
set username=浙大通行证用户名
set password=浙大通行证密码
npx github:zju-health-report/action#release
```

Linux/macOS:

```bash
# Use npm exec to avoid this issue: https://github.com/npm/cli/issues/4003
username=浙大通行证用户名 password=浙大通行证密码 npm exec github:zju-health-report/action#release
```

## 报告问题

如果想要报告问题，请按照上述运行命令行的方法将环境变量 `NODE_ENV` 设置为 `development`，例如在 Linux/macOS 上可以使用 `NODE_ENV=development` 前缀。然后将打印出的 `oldInfo` 在 issue 中给出（注意隐藏关键的隐私信息），可以帮助我快速地定位问题。

GitHub Action 也可以设置环境变量，但是 GitHub Action 的 log 是公开的，不要在公有仓库里面跑，不然别人会看到你的定位信息和 `uid` 等可能暴露个人隐私的信息。只需要这样修改 GitHub Action 就可以了:

```yml
steps:
  - name: 打卡
    uses: zju-health-report/action@release
    with:
      username: ${{ secrets[matrix.username] }}
      password: ${{ secrets[matrix.password] }}
      dingtalk_token: ${{ secrets[matrix.dingtalk_token] }}
    env:
      # 注意一定要在私有仓库里面才加这个，不然会 log 是公开的，会暴露你的隐私信息
      NODE_ENV: development
```

## Node.js API

首先从 GitHub 安装此包：

```bash
npm i github:zju-health-report/action#release
```

然后使用 API

```js
async function main() {
  const username = '浙大通行证用户名'
  const password = '浙大通行证密码'
  const dingtalkToken = process.env.dingtalk_token
  const { ZjuHealthReporter } = await import('@zju-health-report/action')

  try {
    await new ZjuHealthReporter({ username, password, dingtalkToken }).runReport()
  } catch (error) {
    console.log((error as Error)?.message ?? '未知错误');
  }
}

main()

```
