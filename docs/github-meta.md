# GitHub 门面：取值、理由与执行记录

> 2026-11-18。参照对象：本仓库作者刚发布的 npm 包 [`dsh-claude-project-ui@0.2.0`](https://github.com/your-org/dsh-claude-project-ui)
> （2026-11-17 发布）。本文件记录「按它那套规范，本仓库的 About / homepage / topics / tag+release / package.json 应该长什么样、为什么、以及实际应用了什么」。
> 本轮只改 `README.md` 与 `docs/`；`package.json` 的建议写在 §5，**未应用**（另一个讨论串可能在改它的 scripts）。

## 0. 参照包的规范（逐项抓取，不是凭记忆）

| 维度 | `dsh-claude-project-ui` 的做法 | 本仓库怎么照 |
|---|---|---|
| npm `description` | 英文一句话，`定位：细节` 用冒号分隔，约 180 字符 | 见 §5（如果将来发 npm，description 要换成英文一句） |
| npm `homepage` | `https://github.com/your-org/dsh-claude-project-ui#readme` | 见 §5 |
| npm `keywords` | 10 个，生态词打头（`deepseek-harness`、`dsh`、`dsh-plugin`…） | §5 建议同一批词，与 topics 对齐 |
| GitHub About `description` | **中英双语**：中文在前、英文在后，中间用 ` ｜ ` 分隔，约 330 字符 | §1，同样双语同分隔符 |
| GitHub `homepageUrl` | **空**（npm 的 homepage 指回 README，GitHub 侧不填） | §2，同样留空 |
| GitHub `topics` | 10 个，全小写连字符，生态词 + 形态词 + 领域词各占几个 | §3，同样 10 个 |
| README 结构 | H1 → `**简体中文** · [English](#english)` → 一句话定位 → blockquote 一句话 → 对比/强化表 → 功能表 → 安装（含 desktop profile 的「不能用 CLI 装」告示）→ 配置 yaml → 数据目录 → 已知限制 → 验收记录（带证据表）→ `<a id="english"></a>` + 英文全译 | §4（README 已重写，结构对齐） |
| README 语气 | 中文为主 + 英文技术词；克制、写实测与限制，不写宣传语 | 同 |
| tag / release | `v0.2.0` 一个 tag = `package.json` 的 version；release 标题 `v0.2.0`；正文 = 中文要点列表 + 一行英文总结；标 Latest | §4 同样规则，版本号 `v0.2.0` |
| 仓库根文件 | `LICENSE` / `CHANGELOG.md` / `INSTALL-LOCAL.md` / `README.md` | 本仓库**缺 LICENSE 与 CHANGELOG**，见 §6（本轮无权新增根目录文件） |

## 1. repo description（**已应用**）

实际值（296 字符，GitHub 上限 350）：

```
本地出稿工作台 + DSH 插件：模型用 post_facts 抓带 source_url 的真实事实（bioRxiv DOI / Acme 版本 / npm 包 / URL），自己写中英双语推文与卡片图，你手动复制到 X。不发推、不调 X API、零依赖。 ｜ A local draft desk for DeepSeek Harness: sourced facts in, EN + ZH posts and a card out — you paste it into X yourself. No X API, no credentials, zero dependencies.
```

为什么这样写：

- **双语 + ` ｜ ` 分隔**：与参照包同一格式，中文读者和把仓库当 npm 包看的英文读者都读得懂。
- **中文段先给结论**（本地出稿工作台 + DSH 插件），再给机制（`post_facts` 抓带 `source_url` 的事实），再给交付物（中英双语 + 卡片图），最后给边界（手动复制、不发推、零依赖）。
- **保留「不发推 / 不调 X API」**：这是本仓库最容易被误解的一点——名字里有 `post`，必须第一屏就掐掉「又一个自动发帖 bot」的预期。
- 不写 star / 下载量 / 性能数字。写这一版 About 时侧栏面板还没上线，所以 About 里没提它；
  面板上线后（v0.3.0）About 也不跟着改——它是仓库门面，不追每个功能，功能细节归 README。

命令（已执行）：

```sh
gh repo edit your-org/dsh-post-draft-auto --description "<上面那段>"
```

## 2. homepage（决定：**留空**）

参照包 GitHub 侧 `homepageUrl` 是空字符串，只把 npm 的 `homepage` 指到 `<repo>#readme`。

本仓库同样**不填 homepage**，理由：

1. 这个工具没有官网；它唯一「界面」是 `http://127.0.0.1:4789` 的本地服务——填上去是死链，别人点开只会 404。
2. `example.com` 是作者产品的站点，不是这个工具的落地页；指过去会把「Acme 用户」当成「这个插件的用户」，属于误导。
3. 仓库私有 + 未发 npm，About 里的 homepage 对发现性没有任何作用；等有了公开落地页（比如 README 一页的静态站）再填，届时按参照包的做法指 `#readme`。

## 3. topics（**已应用**，10 个）

| topic | 为什么选（一句话） |
|---|---|
| `deepseek-harness` | 宿主生态的主关键词，和参照包同一个，搜 DSH 插件的人第一眼就能归类 |
| `dsh` | 生态短名，参照包也同时挂了它；GitHub 搜索里 `dsh` 是实际被用的词 |
| `dsh-plugin` | 说明形态是插件（cordis bundle + 四个工具），不是独立 app |
| `ai-agent` | 核心链路是「模型调工具抓事实 → 模型写稿」，不是模板生成 |
| `twitter` | 产物平台；比 `x` 更容易被搜到（README 里仍写 X） |
| `content-generation` | 任务类别：出稿/文案生成，属于能带来同类项目检索的宽词 |
| `biorxiv` | 最常用的真实事实源（DOI → 标题/作者/摘要），科研发布场景的入口词 |
| `human-in-the-loop` | 设计底线：永不自动发布，人手动复制——这个词把「不是 bot」写进元数据 |
| `fact-checking` | 溯源闸门（正文数字必须在 facts 里、每条带 source_url）是主要卖点 |
| `nodejs` | 运行时事实：零依赖、Node ≥ 18，纯 `.mjs` |

命名规则（照参照包）：全部小写、连字符分词、不用空格/下划线/大小写混合；**8–12 个**，宁可少而准；
不挂 `npm-package`（本仓库是 `private: true`，与参照包不同），也不挂没实现的能力词。

命令（已执行）：

```sh
gh repo edit your-org/dsh-post-draft-auto \
  --add-topic deepseek-harness --add-topic dsh --add-topic dsh-plugin \
  --add-topic ai-agent --add-topic twitter --add-topic content-generation \
  --add-topic biorxiv --add-topic human-in-the-loop --add-topic fact-checking \
  --add-topic nodejs
```

## 4. tag 与 release

### 版本号：`v0.2.0`（不是 `v0.1.0`）

- 参照包的规则是 **tag = `package.json` 的 version**（`0.2.0` → `v0.2.0`），一个仓库只有一个 Latest。
- 本仓库 `package.json` 已经是 `0.2.0`（对应「方案 v2 + 第三轮 AI 写稿」这条线），所以第一个 release 就是 `v0.2.0`；
  **不追溯造一个 `v0.1.0`**——那会指向一个不存在的历史提交，或者凭空多一个和代码状态不符的标签。
- tag 从远端 `main` 当前 HEAD 建（`318cf93`），**不 push 任何 commit**：`gh release create` 自己会建 tag。

### 实际落地：`v0.3.0`（**已建；`v0.2.0` 已撤**）

2026-11-18 晚侧栏「✍ 出稿」面板随 `f33e3e1` 上线，`package.json` 升到 **`0.3.0`**。收尾时按同一规则（tag = version）处理成：

- 删掉先前建的 `v0.2.0` tag / release——该版本从未单独发布（`gh api .../git/ref/tags/v0.2.0` 现在返回 404，`gh release view v0.2.0` 也查不到）
- 建 `v0.3.0`：tag 指向 `f33e3e1`，标题「v0.3.0 — 侧栏「✍ 出稿」面板」，标 Latest
  https://github.com/your-org/dsh-post-draft-auto/releases/tag/v0.3.0
- 版本历史与「未单独发布」的说明统一写在 `CHANGELOG.md`；release 正文只讲这一版的新增 / 文档 / 验证 / 注意

### release notes 正文（实际使用）

```text
首个版本：本地出稿工作台 + DSH 插件（出稿，不发推）。

- 四个模型可调用工具：post_facts（DOI / Acme 版本 / npm 包 / URL / 一句话，每条事实带 source_url）、post_save、post_list、post_mark_posted；插件与 CLI 共用 lib/tools.mjs 一份实现
- 模型写稿取代模板填空：生成中英双语文案 + 卡片文案，草稿标 generatedBy=model，模板降级为采集器 fallback
- 硬性约束：正文数字必须来自 facts（否则进 blockers）、280 计权（CJK=2 / URL=23）、抽不到就写 ⟨待补⟩
- 网页工作台（127.0.0.1:4789）：草稿列表 / 独立复制按钮 / 实时计权 / 1200×675 卡片图 / 事实表可点回来源 / 已发台账
- Acme 双源守卫：线上与本地 version.json 不一致时，复制与「已发」都是 409
- 零依赖、无凭据、不调 X API；测试 53/53 通过；一次真实端到端 EN 274/280、ZH 219/280

First release: a local draft desk (not a posting bot) — sourced facts in, EN + ZH drafts and a card out, published by hand. Four tools, zero dependencies, 53 tests.
```

格式与参照包一致：中文要点列表 + 最后一行英文总结；标题就是 tag 名。

## 5. `package.json` 元数据（**已应用：2026-11-18**）

补了四项；`private: true`、`version: 0.3.0`、`scripts`、`exports`、`dsh` 一律没动。

```json
{
  "description": "Local draft desk for DeepSeek Harness: post_facts pulls sourced facts (bioRxiv DOI / Acme version / npm package / URL), the model writes EN + ZH posts and a card, and you paste them into X yourself. Zero dependencies, no X API, no credentials.",
  "repository": { "type": "git", "url": "https://github.com/your-org/dsh-post-draft-auto.git" },
  "keywords": ["deepseek-harness", "dsh", "dsh-plugin", "ai-agent", "twitter", "content-generation", "biorxiv", "human-in-the-loop", "fact-checking", "nodejs"],
  "license": "MIT"
}
```

说明：

- `description` 用**英文一句**（npm 页面是英文语境），中英双语留给 GitHub About。
- `keywords` 与 §3 的 topics **同一批词**——参照包就是 topics 与 keywords 完全重合的 10 个。
- `repository` 的 URL 按用户给的写法（`https://…git`）；npm 惯用 `git+https://…git`，真要发 npm 时再改也不迟。
- **`homepage` 故意不填**：本工具没有官网，填 `example.com` 会误导（见 §2）。`bugs` / `author` 这轮也没加，
  要发 npm 时一起补。
- `license: MIT` 与根目录 [LICENSE](../LICENSE) 一致（参照包也是 MIT）；版权行用 `Copyright (c) 2026 Lane Guolan Chen`，
  按用户指定（参照包写的是 `lanechen`）。

### 如果将来真要发 npm（现在不做，只列清单）

1. 删掉 `"private": true`（它会让 `npm publish` 直接报错）；**不要**顺手加 `publishConfig`——参照包也没有。
2. 补 §5 那批字段（否则 npm 页面是空白，reference 包能查到的 repository/homepage 都没有）。
3. 确认包名是否还在：2026-11-18 实测 `npm view dsh-post-draft-auto` 返回 **404（未被占用）**；发之前再查一次。
4. `files` 现在已包含 `bin/` `lib/` `public/` `config.json` `voice.md` `README.md` `skills/` `cordis.patch.yml`；
   如果要连 `docs/` 一起发，得显式加 `"docs/**/*"`（现在没加，npm 包会只有代码和说明）。
5. 已有 `engines.node: ">=18"`，参照包是 `>=20`；本仓库代码只用 Node 内置模块，18 够用，**保持 18 不必对齐 20**。

## 6. 未做 / 待办

| 项 | 状态 | 原因 |
|---|---|---|
| `LICENSE` 文件 | **已做** | MIT 纯文本（参照包同为 MIT），`Copyright (c) 2026 Lane Guolan Chen`；README 中英两版都改成链到 `LICENSE`，GitHub 首页会显示许可证 |
| `CHANGELOG.md` | **已做** | Keep a Changelog 1.1.0 + SemVer；`0.1.0` / `0.2.0`（标「未单独发布（已并入 0.3.0）」）/ `0.3.0`，日期只取提交日期或 release 发布时间 |
| 把本轮改动提交进 main | **未做（等你提交）** | 硬约束：不 `git add/commit/push`。工作区现有：`README.md`（两轮改动）、`package.json`（元数据）、`docs/github-meta.md`，外加新增未跟踪的 `LICENSE`、`CHANGELOG.md` |
| 侧栏面板写进 README | **已做（第二轮修正）** | 面板已随 `f33e3e1` 上线（v0.3.0），README 中英两版都改成「已上线 + 需重启 + 只读视图」；测试数同步 53 → 66 |
| `v0.3.0` release | **已建** | 见 §4「实际落地」；tag `v0.3.0` → `f33e3e1`，标 Latest；`v0.2.0` 已撤 |
| `package.json` 改字段 | **已做（只补元数据）** | 补 `description` / `repository` / `keywords` / `license`；`private`、`version`、`scripts`、`exports`、`dsh` 一律没动 |
| homepage 填 `example.com` | **决定不填** | 见 §2 |
