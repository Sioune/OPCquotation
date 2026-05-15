# OPC 报价卡

面向 OPC 撮合交易平台的结构化报价卡 MVP。它把软件外包报价从“人天 × 单价”拆成三层：

- 基准层：D1-D5 范围维度决定系统规模底价
- 调整层：C1-C4 风险系数给不确定性定价
- 可选层：维护包、保证金、里程碑奖金、收入分成等长期责任 SKU

## 本地运行

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run serve
```

默认访问：

```text
http://127.0.0.1:4173
```

如需局域网访问：

```powershell
node scripts/serve.mjs --root dist --port 4173 --host 0.0.0.0
```

然后用本机内网 IP 访问，例如：

```text
http://192.168.1.17:4173
```

## 验证

```powershell
npm.cmd run verify
npm.cmd run e2e
```

`verify` 会执行模型测试与构建；`e2e` 会启动浏览器烟测，覆盖桌面交互和移动端布局溢出检查。

## 主要文件

- `index.html`：应用入口
- `src/quoteModel.mjs`：报价模型、默认状态、格式化和结构化输出
- `src/app.mjs`：报价填报、草稿、提交、对比表交互
- `src/styles.css`：响应式界面样式
- `scripts/build.mjs`：静态构建脚本
- `scripts/serve.mjs`：本地/局域网静态服务
- `tests/`：模型测试与 Playwright 浏览器烟测
