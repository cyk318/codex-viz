# Codex Viz

致敬鼻祖版本：[cc-viz](https://github.com/guxingke/cc-viz)。

Codex Viz 是一个纯本地的 Codex session 可视化工具，用于读取并回放本机 `~/.codex/sessions/` 下的 JSONL 日志。

## 运行

```bash
bun install
bun run dev
```

默认访问地址：

```text
http://localhost:3456
```

可选环境变量：

- `PORT=3457`：使用其他端口
- `OPEN_BROWSER=0`：启动后不自动打开浏览器

## 功能

- 按工作目录聚合 Codex sessions。
- Sessions 列表展示标题、模型、CLI 版本、tokens、费用估算、5h/weekly limit 剩余比例。
- 首页顶部提供今日使用概览 Banner，展示今日总 tokens、今日预估费用和 session 数量。
- 点击今日 Banner 可进入统计页，查看最近 30 天的每日 tokens 使用量和每日预估费用图表。
- 查看单个 session 的「对话」「完整事件流」「工具」「Tokens」「调用图」「Raw」视图。
- 「对话」视图只展示 user / assistant 消息，以及可读的 assistant reasoning summary，不展示 `exec_command`、工具输出和 patch。
- 「完整事件流」保留完整 Timeline，包括消息、reasoning、工具调用和工具输出。
- 支持跨 session 搜索消息、命令、patch 内容。
- 对 `event_msg.agent_message` 和 `response_item.message` 做去重，避免重复展示同一句 assistant 消息。
- `encrypted_content` 不会解密，只展示 reasoning 事件占位或 summary。
- 页面可见文案默认使用中文，必要专业词汇保留英文。

## 数据安全

- 只读取本机 `~/.codex/sessions/` 下的 JSONL 文件。
- 不写入、不修改、不删除任何 `~/.codex` 原始数据。
- 不上传 session 内容，不包含多用户、鉴权或远程部署能力。

## 价格与费用估算

Sessions 列表的 Tokens 列会展示按当前模型价格估算的美元成本。计算时会区分：

- uncached input tokens
- cached input tokens
- output tokens

页面顶部提供「同步官方售价」按钮，会从 OpenAI 官方 `https://platform.openai.com/docs/pricing.md` 拉取最新 token 售价并更新内存价格表。刷新失败时保留内置价格表，避免页面不可用。

费用仅用于本地估算，具体账单以 OpenAI 官方账单为准。
