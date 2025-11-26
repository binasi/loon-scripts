# loon-scripts
Loon 脚本集合 — 为 Loon（以及类似规则引擎）提供的实用脚本、去水印与响应体处理示例汇总。

## 说明
本仓库收集了一些针对移动端代理工具（例如 Loon）的脚本，用以在请求/响应阶段处理数据（如去水印、修改图片/视频 URL、格式化接口响应等）。脚本以简洁易用、可直接拷贝到 Loon 脚本目录并在规则中引用为目标。

## 特性
- 针对特定 App API 的响应体处理脚本（例如图片去水印）
- 支持解析并修改 JSON 响应体
- 提供可读注释，便于针对不同接口快速调整规则
- 便于在 Loon 中直接作为 script-response-body 使用

## 支持平台
- Loon（主要）
- 许多脚本也可参考改写后用于 Surge / Quantumult X（语法与内置变量需调整）

## 快速开始
1. 克隆仓库或直接下载需要的脚本文件：
   git clone https://github.com/binasi/loon-scripts.git

2. 将所需脚本复制到 Loon 的脚本目录（或在 Loon 中新建脚本并粘贴内容）。

3. 在 Loon 的配置中添加一条 script-response-body 规则，指定匹配的请求/响应 URL。例如（示意）：
   [Script]
   # JingMeng 去水印示例
   script-response-body https://api.jimeng.example/* jingmeng_wm_remover.js

   注意：请根据实际接口地址调整匹配规则与脚本名称。

## 仓库脚本说明（示例）
- jingmeng_wm_remover
  - 文件名：jingmeng_wm_remover
  - 平台：Loon (script-response-body)
  - 功能：解析即梦类 App 的 JSON 响应，尝试通过修改图片/媒体 URL 来获取无水印版本。
  - 主要策略：
    - 移除/修改 URL 中可能与水印相关的查询参数（例如 watermark、wm、logo、stamp）
    - 将路径中的缩略/预览标记（thumb、preview、watermark）替换为 full/original
    - 递归处理 JSON 中所有包含 url/image/download 等关键词的字段
  - 使用示例：将脚本添加为 Loon 的 script-response-body，匹配即梦 App 的图片 API。

（如仓库中还有其他脚本，请告知，我会把每个脚本的用途与配置示例一并补充到 README。）

## 配置示例（Loon）
1. 在 Loon 中新建脚本文件 jingmeng_wm_remover，粘贴脚本内容并保存。
2. 在 Loon 配置文件中添加：
   [Script]
   script-response-body https://api.jimeng.example/* jingmeng_wm_remover

3. 重载 Loon 配置并访问对应 App，以观察脚本是否正确修改响应。

## 常见问题 (FAQ)
- Q: 脚本无法生效？
  - A: 确认规则是否匹配到正确的请求/响应 URL，脚本类型应为 script-response-body，且 Loon 已启用对应配置文件。
- Q: 脚本改动后如何调试？
  - A: 在脚本中使用 console.log 输出调试信息，Loon 日志中查看脚本执行结果；或先在本地用 Node.js 测试 JSON 替换逻辑（注意变量替换）。

## 贡献
欢迎提交 Issue 或 Pull Request：
- 报告 bug 或请求支持新的 App/接口
- 提交新的脚本或优化现有脚本（请附带测试说明与使用示例）
- 提交前请确保代码有足够注释并说明适用场景

## 许可（License）
仓库当前未指定许可证（或请替换为你想要的许可证，例如 MIT）。建议添加 LICENSE 文件以明确使用与贡献许可。如果希望我为你生成 MIT 许可证，也可以告诉我。

## 联系方式
仓库维护者：@binasi
如需快速沟通，请在 Issue 中留言或在 PR 中注明用途与测试步骤。