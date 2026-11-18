# Changelog

所有值得记录的变更都写在这里。版本号遵循 semver；本包在 0.x 阶段不承诺 API 稳定。

## 0.3.6 — 2026-11-18

### 新增
- **「重新生成」改成一键投递**：点一下就把重写指令经 `sessionController.prompt` 送进当前会话（不需要再复制粘贴），消息带 `[出稿面板] 重写 <draftId>` 前缀，不会伪装成用户手打；投递失败自动退回复制，并说明原因。
- **设置面板（⚙，在刷新旁边）**：默认语气、界面语言、重写指令是否附带 facts / 语气约束、恢复默认；全部存 localStorage。
- **网页工作台也有中英切换**：与侧栏面板共用同一张词表（140 键）和同一个 localStorage 语言键，切一次两边都变。

### 修复
- **编辑保存报 `Unexpected end of JSON input`**：根因是运行中的 DSH 进程还没注册新路由（`GET /draft` 404、`POST /draft` 405，body 全空），客户端又直接 `response.json()`。现在：保存改走 POST（服务端 PUT/POST 都收）；`ROUTE_PATHS` 由 `routes()` 派生，不会再漏登记；客户端先看 `response.ok` 与 `content-type`，空 body/非 JSON 时显示「保存失败（HTTP 4xx）：…」；旧宿主时面板顶部直接提示「宿主还是旧版本，请重启 DSH」。

### 测试
- 126/126 通过。

## 0.3.5 — 2026-11-18

### 新增
- **侧栏面板加「重新生成」**：一键把重写指令复制到剪贴板（含这条稿的 facts、现有正文、选定的语气），粘进对话由模型重写后覆盖原稿。面板是纯客户端，调不到模型，所以不做「假装能重跑」。
- **侧栏面板加「直接编辑」**：EN / ZH 两个输入框原地改，实时显示计权字数；超 280 禁用保存。保存会落盘、重算权重、在 history 记一条 `manual edit`，并把该稿标为「已改」，与 AI 原稿区分。
- **四档语气**（中性 / 更口语 / 更技术 / 更短）进入重写指令；定义来自 `lib/rewrite.mjs`，不另造词库。
- **界面语言切换（中文 / English）**：面板全部文案走 `lib/i18n.mjs` 单一词表（49 个键），选择存 localStorage；有测试防止 client 内联副本与词表漂移。

### 测试
- 98/98 通过，新增编辑保存/超限拒绝/语气进入指令/i18n 表完整性等用例。

## 0.3.4 — 2026-11-18

### 新增
- `bin` 入口：`post-draft-auto`（网页工作台）、`post-draft-tool`（四个工具的 CLI）、`post-draft`（出稿 CLI），装成全局包后可直接运行。

### 变更
- **准备 npm 首发**：去掉 `private: true`；补 `repository`（改为真实仓库地址）、`homepage`（npm 包页）、`bugs`、`author`、`engines.dsh`。
- `files` 改为**白名单**：只打包 `bin/` `lib/` `public/` `skills/` `data/fixtures/mock.json` `cordis.patch.yml` `config.json` `config.local.example.json` `voice.md` `README.md` `LICENSE` `CHANGELOG.md`。
  本机的 `config.local.json`、`state/`、`drafts/`、`media/`、`.env*`、`*.log`、`docs/`、`tests/` 一律不进包。
- 新增 `prepublishOnly: npm test`：`npm publish` 前必须跑完整测试。

### 文档
- README（中英）：安装一节补 npm 装法（`npm i -g dsh-post-draft-auto` / `npx`）与三个 bin 名。

### 测试
- 80/80 通过（发布门禁即此命令）。

## 0.3.3 — 2026-11-18

### 新增
- **侧栏面板把「已发 / 丢弃」收进折叠组**：顶部只留待发与已复制，归档的稿子合并为一行「▸ 已发 3 · 丢弃 1」，默认收起，点开才展开；展开状态记在 `localStorage`，刷新和重开都保持。
- 点「已发」后卡片**即时**从顶部挪进折叠组（乐观更新，失败回滚），不用再手点「刷新」。
- 归档组里的卡片用紧凑样式：只留标题、来源标签和计权字数，不再重复给复制按钮。

### 测试
- 新增 6 项分组用例（无归档不出现该组、已发 3 + 丢弃 1 的文案、只有一种状态不出现 0、默认收起、状态读写）；80/80 通过。

## 0.3.2 — 2026-11-18

### 修复
- **草稿列表的“AI 生成 / 模板生成”徽标恒显示为「模板生成」**：`/api/drafts` 与面板用的 `/post-draft/list` 各自手抄了一份字段清单，都漏了 `generatedBy`，前端读不到就按 `template` 兜底。
  现在两个接口共用 `lib/store.mjs` 的 `draftRow` / `listRows` 作为列表字段的**唯一来源**，以后加字段不会再出现「一个接口有、另一个接口没有」。

### 测试
- 新增真实 HTTP 用例：`generatedBy: "model"` 的草稿经 `/api/drafts` 返回后仍为 `model`；74/74 通过。

## 0.3.1 — 2026-11-18

### 新增
- **`config.local.json` 覆盖层（不入库）**：在 `config.json` 之上做深合并，用来把本机或内部的真实端点、版本文件路径填进去，而不必污染公开仓库。合并规则：对象 → 深合并；对象数组 → 按 index 逐个合并；原始值数组 → 整体替换；需要整体替换某个对象时用 `$replace` 兜底。
- `config.local.example.json`：只有键名与注释，不含任何真实地址。

### 修复
- 版本类事实的 `label` / `sourceKey` 不再硬编码产品名，改从 `config.brand.name` 与 `config.site.id` 读取，因此仓库里可以只留中性默认值。

### 测试
- 新增 7 项覆盖层合并测试；73/73 通过。

## 0.3.0 — 2026-11-18

### 新增
- **侧栏「出稿」面板**（DSH 客户端插件）：在 DSH 右侧栏注册一个页签，列出草稿，每行「复制 EN / 复制 ZH / 已发」，不用再打开本地网页工作台。
  - 宿主半部分通过 `ctx.webServer.register` 暴露三个同源接口：`GET /post-draft/list`、`GET /post-draft/copy`、`POST /post-draft/mark-posted`。
  - 浏览器半部分（`lib/client.js`）不依赖构建工具，由 DSH 的模块加载器直接加载；React 由宿主注入。
  - 复制三级降级：`navigator.clipboard` → 临时 `textarea` + `execCommand("copy")` → 保留选中并提示按 ⌘C。
- `package.json` 增加 `dsh.client` 与 `exports["./client"]`；`lib/plugin.mjs` 的 `inject` 增加 `webServer`。

### 文档
- `docs/侧栏面板.md`：面板的接线方式、验证步骤；`docs/panel-harness.*` 用于在不重启 DSH 的情况下渲染同一份面板代码并验证复制链路。

## 0.2.0 — 2026-11-17

### 新增
- **AI 写稿链路**：四个模型可调用工具 `post_facts` / `post_save` / `post_list` / `post_mark_posted`，插件与 CLI 共用 `lib/tools.mjs` 一份实现。
  - `post_facts` 抓带 `sourceUrl` 的真实事实：bioRxiv/medRxiv DOI、产品版本（线上端点 + 本地版本文件双源）、npm 包、任意 URL、一句话。
  - `post_save` 由模型自己写 EN 主推 + ZH 回复 + 卡片文案；模板只作 fallback，草稿上用 `generatedBy: "model" | "template"` 标出来。
  - 计权长度在落盘时就校验（CJK 按 2 计），超标直接拦。
- 事实与正文的一致性校验：正文里出现的版本号/日期/百分数/作者名必须能在 facts 里找到，找不到就标「待补」并写进 `pending`。
- 双源一致性守卫：线上版本端点与本地版本文件不一致时，复制与「已发」都会被拒绝（本地新 → `pending-rollout`；线上新 → 提醒核对）。
- 发布说明事实链路：功能点只从配置的 `releaseNotesFiles` 里取；没有该版条目就退到参考文件原文；两处都没有则留「待补」，不编。

## 0.1.0 — 2026-11-16

### 新增
- 本地出稿工作台（零依赖 HTTP 服务 + 单页 UI）：草稿列表、EN/ZH 计权、卡片图、事实表、复制、标记已发、本地台账。
- 采集器：npm / GitHub Releases / bioRxiv（json-api）/ RSS / arXiv / 站点版本，都能用配置开关启停。
- 卡片图渲染：本地 Chrome 无头截图，缺 Chrome 时退回 SVG。
- X（Twitter）计权长度实现：CJK 与 emoji 按 2 计，URL 统一按 23 计。

### 说明
- 不调用任何 X 写接口，不需要 cookie、token 或 API key；发布由人手动复制粘贴完成。
