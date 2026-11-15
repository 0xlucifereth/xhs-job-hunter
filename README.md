# xhs-job-hunter

DSH Host 插件：从**已登录**的小红书页面采集招聘笔记，按地区和岗位筛选，写入 `dsh-data-table` 工作簿；表格不可用时自动写出 CSV / XLSX。

> 插件不登录、不处理验证码/滑块、不绕过风控。登录和验证环节必须由人工完成。

## 功能

- 工具：`xhs_job_scrape`
- 输入：`region`（必填）、`job`（必填）、`max_notes`（可选，默认 30，上限 50）
- 搜索：`{region} {job} 招聘`
- 字段：标题、链接、发布时间、正文摘要、作者昵称、地区、岗位
- 去重：单次运行内按 id/URL/标题+作者去重；跨天有 `seen` 状态
- 输出：`{ notes, meta }`，`notes` 是统一字段的 JSON 数组
- 表格：优先 `dsh-data-table` 的 `workbook_edit`，失败时写 CSV/XLSX

## 环境要求

- DSH `>= 0.2.2-rc.1 < 0.3.0`
- Node.js `>= 20`
- Chrome，且已安装 Playwright 兼容版本（插件使用 `playwright-core`）
- 可选：`dsh-data-table@0.2.0-alpha.10`，用于交互式表格

## 1. 安装依赖并构建

```powershell
cd D:\Documents\deepseek-harness\default-workspace\xhs-job-hunter
pnpm install --config.node-linker=hoisted
pnpm build
```

`node-linker=hoisted` 是为了避免 Windows 上 pnpm isolated junction 导致 `exceljs` 依赖解析失败。如果 pnpm 仍使用 isolated，请显式加 `--config.node-linker=hoisted`。

构建产物在 `dist/`。

## 2. 启动带 CDP 的专用 Chrome

普通方式启动的 Chrome 没有开放调试端口，Playwright 无法附加。使用：

```powershell
.\scripts\launch-chrome.ps1
```

脚本会以 `--remote-debugging-port=9222` 和专用 `--user-data-dir` 启动 Chrome。第一次打开后，在这个窗口里**人工登录小红书**。登录态保存在专用 profile，之后复用。

验证 CDP：

```powershell
Invoke-RestMethod http://127.0.0.1:9222/json/version
```

注意：

- 不要把 9222 暴露到局域网。
- 不要用日常 Chrome 默认 profile 直接开调试端口。
- 插件不会关闭你的 Chrome，只会关闭自己创建的 page。

## 3. 不开 DSH 的冒烟测试

```powershell
pnpm smoke -- --region 北京 --job 前端 --max 3
```

它会：

1. 连接 `http://127.0.0.1:9222`
2. 打开搜索页
3. 采集最多 3 张卡片
4. 打开第一条详情并打印字段

如果未登录或遇到验证码，会直接停止并提示人工处理。

## 4. 安装到 DSH

构建完成后，在 DSH 的 **Plugin Manager** 选择 **Install bundle**，target 填这个包的绝对路径：

```text
D:\Documents\deepseek-harness\default-workspace\xhs-job-hunter
```

安装后新开一个会话，确认工具列表里有 `xhs_job_scrape`，然后说：

> 抓取北京的前端招聘笔记，最多 3 条

不要手工改 profile 的 `package.json` 或 `cordis.patch.yml`；用 Plugin Manager 安装，避免破坏其它插件配置。

## 5. 接入 dsh-data-table（推荐）

当前 profile 默认没有安装。安装 alpha 版本并固定：

```text
plugin_manager install_bundle target = dsh-data-table@0.2.0-alpha.10
```

安装后应出现 `workbook_catalog`、`workbook_edit`。

插件会自动：

1. `workbook_catalog action=list` 查找工作簿
2. 不存在则 `action=create`，创建 `xhs-jobs` / “小红书招聘笔记”
3. `workbook_edit` 以 `append_rows` 追加到“招聘笔记” sheet

写入的列：

| 列 | 类型 |
|---|---|
| 地区 | string |
| 岗位 | string |
| 标题 | string |
| 链接 | string |
| 发布日期 | date |
| 正文摘要 | string |
| 作者 | string |

`opId` 由“日期 + 地区/岗位哈希 + 内容哈希”组成，重试同一批数据是幂等的；同一天多次采集不同内容会生成不同的 `opId`。

表格不可用或写入失败时，插件会回退到：

```text
<workspace>/xhs-job-hunter/<YYYY-MM-DD>/xhs-jobs-*.xlsx
<workspace>/xhs-job-hunter/<YYYY-MM-DD>/xhs-jobs-*.csv
```

CSV 使用 UTF-8 BOM，并对 `= + - @` 开头的单元格做公式注入防护。

## 6. 自动执行

### 推荐：DSH 原生定时任务

当前 profile 已有 `schedule_create`。每天 09:00：

```json
{
  "title": "每日小红书招聘采集",
  "target": "new_once",
  "rrule": "DTSTART;TZID=Asia/Shanghai:20261112T090000\nRRULE:FREQ=DAILY",
  "prompt": "执行小红书招聘笔记采集：region=北京，job=前端，max_notes=30。\n1) 调用 xhs_job_scrape。\n2) 成功后将 notes 追加到 dsh-data-table 工作簿 xhs-jobs 的“招聘笔记” sheet；若表格不可用，写出 CSV/XLSX 并报告路径。\n3) 若返回 LOGIN_REQUIRED 或 HUMAN_VERIFICATION_REQUIRED，立即停止，不要尝试登录、验证码或滑块，提醒我人工处理。\n4) 最后用一句话报告新增条数、跳过条数和输出位置。"
}
```

`new_once` 会复用同一个专用会话，适合每天一份日报。错过时间只补最新一次。

### 备选：dsh-timed-goal

`dsh-timed-goal@0.6.0` 目前声明的 DSH peerDependencies 仍指向 `0.1.x`，与当前 `0.2.2-rc.1` 不匹配，Plugin Manager 可能拒绝安装。不要用 version exemption 强行绕过，除非你接受崩溃和数据风险。

如果版本兼容后仍想使用：

```text
/timed-goal add 2026-11-12 09:00:00 --daily --rounds 8 执行招聘笔记采集：region=北京，job=前端
```

它默认以 full access 执行定时任务，建议在界面里改成 workspace write。

### 不推荐：插件内 timer

`ctx.setInterval` 只在 DSH 进程存活时有效，重启丢失；到点还需要自己创建 agent turn、选择模型、处理权限，等于重写调度器。

## 7. 配置

配置在 `cordis.patch.yml` 的 `config` 下，也可以在 Plugin Manager 的配置中覆盖。

```yaml
config:
  cdpUrl: http://127.0.0.1:9222
  timezone: Asia/Shanghai
  freshnessHours: 24
  hardMaxNotes: 50
  toolTimeoutMs: 300000
  maxScrolls: 30
  summaryMaxChars: 240
  jobAliases: []
  detailDelayMinMs: 1200
  detailDelayMaxMs: 2600
  scrollDelayMinMs: 1000
  scrollDelayMaxMs: 1800
  dataTable:
    enabled: true
    workbookId: xhs-jobs
    workbookName: 小红书招聘笔记
    sheetName: 招聘笔记
  export:
    enabled: true
    formats: [xlsx, csv]
  safety:
    minIntervalSeconds: 60
    dedupeEnabled: true
    seenWindowDays: 30
```

说明：

- `freshnessHours`：默认最近 24 小时（从本次运行时间往前推，不是自然日 00:00）。要自然日模式需要改代码里的时间窗口。
- `hardMaxNotes`：单次上限，最大 50。
- `jobAliases`：岗位别名，例如 `["前端开发", "FE", "React", "Vue"]`。
- `minIntervalSeconds`：两次成功采集的最小间隔，默认 60 秒；每日频率由定时任务控制。
- `seenWindowDays`：跨天去重窗口，默认 30 天；`dedupeEnabled: false` 可关闭。

## 8. 风险与人工环节

- **必须人工**：首次登录、验证码、滑块、手机验证、账号限制/申诉、页面结构大改后的选择器确认、数据准确性抽查。
- **不要做**：自动登录、自动过验证码、伪造指纹、轮换代理、高频轮询、自动私信/投递。
- **频率**：默认每天一次、单次 30 条以内；滚动和详情页都有随机间隔。
- **合规**：抓取公开页面仍可能受平台协议、著作权和个人信息保护规则约束；不要采集/转发手机号、微信号等联系方式。
- **CDP 安全**：9222 等于浏览器远程控制权，只绑定 `127.0.0.1`，使用专用 profile，不用时关闭。

如果检测到登录墙、验证码、滑块或“访问频繁”，插件会抛错并停止，**不会重试或绕过**。

## 9. 开发与测试

```powershell
pnpm typecheck
pnpm build
pnpm test
```

测试覆盖：

- 中文相对时间/绝对时间解析
- 岗位/地区匹配
- 去重
- 配置默认值与非法值
- 表格行映射
- `workbook_edit` payload
- CSV/XLSX 写出

真实抓取需要 CDP 和已登录账号，无法在单元测试里覆盖。

## 目录

```text
src/
├─ index.ts              apply()、name、inject
├─ config.ts             手动配置解析与校验
├─ tool.ts               xhs_job_scrape 注册与结果渲染
├─ scraper/
│  ├─ connect.ts         connectOverCDP
│  ├─ search.ts          搜索页、滚动、卡片提取
│  ├─ detail.ts          详情页字段
│  ├─ selectors.ts       易变选择器
│  └─ human-check.ts     登录/验证码/限流检测
├─ parse/
│  ├─ date.ts            中文时间解析
│  ├─ filters.ts         岗位/地区/去重
│  └─ normalize.ts       文本/URL 清洗
├─ output/
│  ├─ data-table.ts      workbook_catalog / workbook_edit
│  ├─ files.ts           CSV/XLSX 兜底
│  ├─ columns.ts         列定义
│  └─ publish.ts         发布编排
└─ runtime/
   ├─ lock.ts            单飞锁 + 冷却 + CDP 复用
   ├─ state.ts           seen 去重
   └─ paths.ts           工作区路径
```

## 上架到应用市场

见 [PUBLISHING.md](PUBLISHING.md)。市场收录由 `awesome-dsh-plugin` 注册表维护，需要公开 GitHub 仓库和 PR；npm 发布是可选的加速项。
