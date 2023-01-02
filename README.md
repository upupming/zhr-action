# zhr-action (zju-health-report action, ZHR)

浙江大学健康打卡自动打卡脚本，支持 Node.js 本地运行和 GitHub Action 定时运行。

> 原有的打卡脚本 https://github.com/Long0x0/ZJU-nCov-Hitcarder 迫于压力删库，因此在其基础上创建此脚本供大家使用。

- 🔔 2022.12.25 学校已经不再要求打卡，参考 [zhr-action/#7](https://github.com/upupming/zhr-action/issues/7)，可以自行停用此脚本。

    ```txt
    【关于进一步优化校园疫情防控举措的通知】

    1.本校师生员工不再要求每日打卡，可通过人脸识别、校园卡、身份证等多种方式入校，蓝码逐步停止使用，学校加快开发电子校园卡作为师生移动端身份凭证，过渡期认可凭蓝码进入。师生驾驶已备案机动车（凭通行证）可直接进入校园，如驾驶非备案机动车经身份查验后进入校园。离退休同志参照上述方式进入校园。
    ```

## GitHub Action 使用方法（推荐）

- 参考：https://github.com/upupming/zhr-action-demo
- 注意要用 GitHub Action 自动打卡是 Fork `zhr-action-demo` 这个仓库，而不是此仓库，此仓库是 ZHR Action 的源码，而 `zhr-action-demo` 是使用 ZHR Action 的一个 demo。

## 命令行 CLI

如果你安装了 Node.js，可以直接使用 `npx` 手动运行此打卡脚本。需要设置环境变量 `username` 和 `password`，同时需要注意不同的命令行设置环境变量的方式不太一样。

Windows Powershell:

```bash
$env:username="浙大通行证用户名"
$env:password="浙大通行证密码"
npx github:upupming/zhr-action#release
```

Windows CMD:

```bash
set username=浙大通行证用户名
set password=浙大通行证密码
npx github:upupming/zhr-action#release
```

Linux/macOS:

```bash
# Use npm exec to avoid this issue: https://github.com/npm/cli/issues/4003
username=浙大通行证用户名 password=浙大通行证密码 npm exec github:upupming/zhr-action#release
```

## 报告问题

如果想要报告问题，请按照上述运行命令行的方法将环境变量 `NODE_ENV` 设置为 `development`，例如在 Linux/macOS 上可以使用 `NODE_ENV=development` 前缀。然后将打印出的 `oldInfo` 在 issue 中给出（注意隐藏关键的隐私信息），可以帮助我快速地定位问题。

GitHub Action 也可以设置环境变量，但是 GitHub Action 的 log 是公开的，不要在公有仓库里面跑，不然别人会看到你的定位信息和 `uid` 等可能暴露个人隐私的信息。只需要这样修改 GitHub Action 就可以了:

```yml
steps:
  - name: 打卡
    uses: upupming/zhr-action@release
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
npm i github:upupming/zhr-action#release
```

然后使用 API

```js
async function main() {
  const username = '浙大通行证用户名'
  const password = '浙大通行证密码'
  const dingtalkToken = '钉钉群助手 access_token'
  const { ZjuHealthReporter } = await import('zhr-action')

  try {
    await new ZjuHealthReporter({ username, password, dingtalkToken }).runReport()
  } catch (error) {
    console.log((error as Error)?.message ?? '未知错误');
  }
}

main()

```

## 常见问题

### 登录异常

如果遇到浙大通行证报错异常登录的情况，例如 [zhr-action-demo/issues/10](https://github.com/upupming/zhr-action-demo/issues/10)，可以尝试使用 Cookie 方式登录，直接跳过浙大通行证。使用 Cookie 方式登录无需提供 `password`。具体方法如下：

使用 Chrome 浏览器打开 https://healthreport.zju.edu.cn/ncov/wap/default/index ，登录完成之后，F12 打开控制台的网络请求页面，刷新页面之后找到最上面一个请求（`index` 页面）的 Request Headers，复制其中 Cookie 字段中 `eai-sess=xxx;` 中的 `xxx` 部分的内容，作为 `cookieEaiSess` 传给 `ZjuHealthReporter` 对象即可，如果使用命令行 CLI，同上面的操作一样将 `password="浙大通行证密码"` 换成 `cookieEaiSess="xxx"` 即可。如果是 GitHub Action，则是 `cookie_eai_sess` 这个 input，可以直接参考 [zhr-action-demo](https://github.com/upupming/zhr-action-demo/blob/9c7ac053838918b656286674f8449cb8e8663591/.github/workflows/health-report.yml#L20) 进行配置。

![cookieEaiSess](https://user-images.githubusercontent.com/102473739/172088620-54fe16fa-bdf8-4a18-b53d-2a914a6d87cb.png)
