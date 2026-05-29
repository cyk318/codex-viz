# Codex Viz

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
- 展示 session 列表、标题、模型、CLI 版本、tokens、费用估算、5h/weekly limit 剩余比例。
- 查看单个 session 的 Timeline、工具调用、Token 图表、调用图和原始 JSONL 解析结果。
- 支持跨 session 搜索消息、命令、patch 内容。
- 对 `event_msg.agent_message` 和 `response_item.message` 做去重，避免 Timeline 重复展示同一句 assistant 消息。
- `encrypted_content` 不会解密，只展示 reasoning 事件占位或 summary。

## 数据安全

- 只读取本机 `~/.codex/sessions/` 下的 JSONL 文件。
- 不写入、不修改、不删除任何 `~/.codex` 原始数据。
- 不上传 session 内容，不包含多用户、鉴权或远程部署能力。

## 价格与费用估算

Sessions 列表的 Tokens 列会展示按当前模型价格估算的美元成本。计算时会区分：

- uncached input tokens
- cached input tokens
- output tokens

页面顶部提供 `Refresh pricing` 按钮，会从 OpenAI 官方 `https://platform.openai.com/docs/pricing.md` 拉取最新价格并更新内存价格表。刷新失败时保留内置价格表，避免页面不可用。

费用仅用于本地估算，具体账单以 OpenAI 官方账单为准。
