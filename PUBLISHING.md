# Marketplace publishing

This file is the publisher checklist. It does not publish anything by itself.

## What "listing" means

The DSH plugin market is backed by the curated **awesome-dsh-plugin** registry.
To appear in the market you need:

1. A public GitHub repository containing this package.
2. A `dsh.bundle` manifest in `package.json` (already present).
3. A `dsh-plugin` topic on the repository.
4. A pull request adding **one YAML file** to the registry:
   `data/plugins/<owner>__<repo>.yml`.

The registry is here:

- https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
- https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md

Publishing to npm is optional but recommended: it lets storefronts show a
download count and gives users a prebuilt package.

## Required account work

These steps need credentials this agent does not have:

- Create/sign in to GitHub, create the repository, push this directory, add
  the `dsh-plugin` topic.
- Open the registry pull request.
- Optionally sign in to npm (`npm login`) before `npm publish`.

The GitHub repository must be at least **1 day old** before the registry PR can
pass CI. A repository created today can be submitted tomorrow.

## 1. Fill in the repository metadata

Replace `OWNER` and `xhs-job-hunter` in `package.json`:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/OWNER/xhs-job-hunter.git"
},
"homepage": "https://github.com/OWNER/xhs-job-hunter#readme",
"bugs": {
  "url": "https://github.com/OWNER/xhs-job-hunter/issues"
}
```

Remove `"private": true` before an npm publish. Keep it if you are only
publishing through GitHub.

## 2. Build and verify

```powershell
pnpm install --config.node-linker=hoisted
pnpm typecheck
pnpm build
pnpm test
```

Check what npm will pack:

```powershell
npm pack --dry-run
```

The package should contain `dist/`, `README.md`, `LICENSE`,
`cordis.patch.yml`, `locale/`, `icon.svg`, and `package.json`; it must not
contain `node_modules/`.

## 3. Push to GitHub

```powershell
git init
git add .
git commit -m "feat: xhs-job-hunter 0.1.0"
git branch -M main
git remote add origin https://github.com/OWNER/xhs-job-hunter.git
git push -u origin main
```

Then add the repository topic `dsh-plugin` in the GitHub repository settings.

## 4. Publish to npm (optional, recommended)

```powershell
npm login
npm publish --access public
```

Before publishing:

- `package.json` must not have `"private": true`.
- `repository` must point at the same GitHub repository listed in the
  registry, or npm and the catalog will not be linked.
- `name` is currently `xhs-job-hunter`; it was available on the public npm
  registry when this was prepared.
- `prepack` runs the TypeScript build, so `dist/` is rebuilt.

## 5. Submit the registry entry

Create exactly one file here:

```text
data/plugins/OWNER__xhs-job-hunter.yml
```

Use `publishing/awesome-dsh-plugin-entry.yml` as the template. Replace `OWNER`
with the GitHub account, then open a PR against
`awesome-dsh-plugin/awesome-dsh-plugin`. If you want the custom tile, also
replace `OWNER` in the commented `icon:` line and uncomment it.

Do **not** edit the generated READMEs by hand and do **not** add an `npm:`
field. The npm mapping is discovered automatically from the published
package's `repository` field.

## 6. Review

CI checks the manifest, repository age, and YAML. A maintainer then reads the
source and verifies the description. Keep the description factual:

- one tool: `xhs_job_scrape`
- reads an already logged-in Chrome session through CDP
- filters by region/job
- writes to `dsh-data-table` when available
- falls back to CSV/XLSX
- does not bypass login/captcha/slider

## Listing copy

Suggested description:

```yaml
description:
  en: Collects recent Xiaohongshu job notes from an already logged-in Chrome session, filters them by region and role, and writes them to a DSH data table or CSV/Excel files.
  zh: 从已登录的小红书页面采集招聘笔记，按地区和岗位筛选，并写入 DSH 数据表格或导出 CSV/Excel。
```

Category: `browser`.

## Known blockers before submitting

- A real Xiaohongshu scrape has not been exercised in this environment
  because no CDP Chrome/login session was available. Run
  `pnpm smoke -- --region 北京 --job 前端 --max 3` after logging in, and fix
  selectors if the live page differs.
- The package currently has no screenshots. Screenshots are optional; the
  market falls back to README images or the owner's avatar.
- The plugin icon for the market tile is optional. Without an `icon:` field,
  the storefront uses the GitHub owner's avatar.
