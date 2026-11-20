# Folder Forge

**English** ｜ [简体中文](#简体中文)

Create folder trees and Markdown notes from an indented outline or a name list. Built on the Obsidian Vault API, so everything appears in the file explorer immediately — no restart needed.

## Features

- Four input modes: Auto, Tree, Folders, Notes
- Vault-relative target path with a folder picker
- Existing note handling: ask / skip / overwrite / abort
- Folder index notes (folder notes): same name as the folder or `README.md`
- Separate content for new notes and index notes: empty / custom text / template file / multiple templates
- Per-folder templates with a visual editor
- Structure presets stored as normal Markdown notes
- Placeholders for file names, folders, paths and date/time
- Chinese and English UI, following Obsidian's language
- Works on desktop and mobile

## Modes

### Auto (default)

No `.md` needed: nodes with children become folders, leaves become `.md` notes. Append `/` to force a folder.

```
ProjectA
  Docs
    readme
  Code
ProjectB
  Backup/
  Notes
```

Creates `ProjectA/Docs/readme.md`, `ProjectA/Code.md`, `ProjectB/Backup/` (empty folder), `ProjectB/Notes.md`.

### Tree

Indentation defines the hierarchy; names ending in `.md` are notes, everything else is a folder. Dots in names (`v1.2 Specs`) no longer turn a folder into a note.

```
ProjectA
  Docs
    readme.md
  Code
ProjectB
  Notes.md
```

### Folders / Notes

Separate entries with commas or newlines; a line starting with `# ` is a comment. Nested paths are supported:

```
ProjectA, ProjectB, Archive/
Notes/2026/11
```

## Installation

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/Gowntn/obsidian-folder-forge/releases)
2. Put them in `<vault>/.obsidian/plugins/folder-forge/`
3. Open **Settings → Community plugins** and enable **Folder Forge**

### BRAT

Add `Gowntn/obsidian-folder-forge` in BRAT, then enable the plugin.

## Usage

1. Open **Settings → Folder Forge**
2. Choose the target folder (empty = vault root) and a create mode
3. Paste an outline or a name list into the text box
4. Click **Create now**

Example: choose **Auto**, paste

```
Journal
  2026
    January
    February
```

and the plugin creates `Journal/2026/January.md` and `Journal/2026/February.md`.

Same-name conflicts, missing target folders and existing index notes are all reported in a summary notice at the end.

## Settings

| Setting | Description |
| --- | --- |
| Target folder | Vault-relative path; empty = vault root |
| Create mode | Auto / Tree / Folders / Notes |
| Content source | Empty / custom text / template file / multiple templates |
| Replace placeholders | Placeholder replacement for new notes |
| Templates by folder | Edit per-folder template rules in a dialog |
| When a note already exists | Ask / Skip / Overwrite / Abort |
| When the target folder is missing | Ask / Create / Abort |
| Create index notes | Add an index note for every new folder |
| Index file name | Same as folder / README.md |
| Scope | Every folder / bottom level only / top level only |
| Index content source | Separate content settings for index notes |
| Preset location | Parent folder; presets live in a `folder-forge` subfolder (empty = vault root) |
| Preset | Dropdown to switch presets, or choose "Don't use a preset" |
| Date order and separator | Year-month-day, month-day-year (US), day-month-year (EU) |
| Month style | Numbers (11) / short name (Nov) / full name (November) |
| Time | Include or not, minutes or seconds, separator |
| Show ribbon button | Show or hide the sidebar button |

## Structure presets

A preset is a normal Markdown note. Its body is the folder tree; its frontmatter stores the settings. Keep the body as a plain tree and do not start it with a `#` heading.

Presets live in a `folder-forge` folder. By default that is `/folder-forge` at the vault root; set **Preset location** to any folder and the plugin uses `<that folder>/folder-forge` instead. The folder is created on the first save.

Use the **Preset** dropdown to switch or disable the active preset. **Read external preset** loads any note in the vault; **Save** overwrites the current preset and **Save as preset** creates a new one.

```markdown
---
folder-forge-preset: true
basePath: Journal/2026
mode: auto
contentMode: template
templates:
  "": Templates/Journal.md
  "Journal/2026": Templates/Year.md
replacePlaceholders: true
indexEnabled: true
indexName: readme
indexScope: bottom
indexContentMode: text
indexContentText: |
  # {{folderName}}
indexTemplate: ""
replaceIndexPlaceholders: true
dateOrder: mdy
dateSeparator: /
monthStyle: short
includeTime: true
timePrecision: second
timeSeparator: ":"
---

January
  01
  02
```

| Field | Meaning |
| --- | --- |
| `basePath` | Target folder |
| `mode` | `tree` / `auto` / `folder` / `file` |
| `contentMode` | New note content: `blank` / `text` / `template` / `multi` |
| `contentText` | Text content (block scalar supported) |
| `replacePlaceholders` | Placeholder replacement for notes |
| `indexEnabled` | Create folder index notes |
| `indexName` / `indexScope` | Index file name (`same` / `readme`) and scope |
| `indexContentMode` | Index content: `blank` / `text` / `template` |
| `indexContentText` | Index text content (block scalar supported) |
| `indexTemplate` | Template path for index notes |
| `replaceIndexPlaceholders` | Placeholder replacement for index notes |
| `dateOrder` / `dateSeparator` / `monthStyle` | Date format |
| `includeTime` / `timePrecision` / `timeSeparator` | Time format |
| `templates` | Per-folder templates; the empty key `""` is the default template |

Older presets may still contain a `template` field; it is read as the default template and saved back as `templates[""]`.

`contentMode: multi` uses only the per-folder templates; a folder without a matching rule gets an empty note.

Loading a preset applies these settings to the settings tab; **Save** writes the current settings back into the frontmatter. When a preset is active, the settings tab shows a toggle button to switch between the preset settings and the settings you had before loading it. The command **Create from a preset** runs a preset directly from the command palette.

### Per-folder templates

Click **Edit** next to **Templates by folder** in the settings tab to open the rule editor: add a folder, pick its template, and repeat. Leave the folder empty to set the default template. A rule key can be a full path (`Journal/2026`) or just a folder name (`2026`); a name matches that folder at any depth. Full-path rules win over name rules, and `""` is the fallback.

The same rules are stored in the preset frontmatter:

```markdown
templates:
  "Journal": "Templates/Journal.md"
  "Journal/2026": "Templates/Year.md"
  "": "Templates/Default.md"
```

## Date and time

- ISO 8601: `2026-11-19`
- US: `11/19/2026`
- Europe: `19/11/2026` or `19.11.2026`
- English months: `Nov 19, 2026`, `19 Nov 2026`, `Nov/19/2026`
- Time in 24-hour format: `14:05` or `14:05:33`

## Placeholders

`{{title}}`, `{{folderName}}`, `{{parentName}}`, `{{folder}}`, `{{path}}`, `{{date}}`, `{{time}}`, `{{datetime}}`

For index notes, `{{title}}` is the index file name (for example `README`), while `{{folderName}}` and `{{parentName}}` are the folder name.

## Folder index notes

An index note is the usual folder note: an entry point for the folder where you keep an overview, links, tags or TODOs. Only folders created in the current run get one; existing folders are left alone.

## Behavior notes

- A read-only preflight runs first; all dialogs appear before anything is written
- Existing folders are reused, never recreated
- Overwriting an existing note cannot be undone
- A note and a folder with the same name can coexist (`A.md` and `A/`)
- File names are compared case-insensitively, so `README.md` conflicts with an existing `readme.md`
- Tab inserts indentation, Shift+Tab outdents
- Illegal characters, reserved Windows names and `..` paths are skipped and summarized

## Compatibility

- Obsidian 1.5.0 or newer
- Desktop and mobile (no Node `fs`)

## License and credits

Released under the [MIT](LICENSE) license.

The first version was based on the "auto generate folders" plugin by the Bilibili creator 拈花赛博行; this version is a rewrite and extension of that idea.

---

## 简体中文

把目录树写出来，让插件帮你建好文件夹和笔记。

从一段缩进文本或名称列表，批量创建文件夹与 Markdown 笔记。基于 Obsidian 的 Vault API，创建后立即出现在文件浏览器里，不需要重启。

### 功能

- 四种输入模式：自动识别、树形结构、简单文件夹、简单文件
- 目标位置用仓库相对路径，默认仓库根目录，也可以用文件夹选择器
- 同名文件处理：询问 / 跳过 / 覆盖 / 终止
- 文件夹索引（folder note）：与文件夹同名或 `README.md`
- 新建笔记和索引笔记的初始内容分开设置：空白 / 自定义文本 / 模板文件 / 多个模板
- 按文件夹指定模板，可在设置页里可视化编辑
- 结构预设，用普通 Markdown 笔记保存目录树和设置
- 占位符：文件名、文件夹名、路径、日期时间
- 界面中英文，跟随 Obsidian 语言
- 桌面端和移动端都能用

### 四种模式

**自动识别（默认）**：不写 `.md`，有下级的当文件夹，最底层的当 md 文件；名字后面加 `/` 可以强制当文件夹。

```
项目A
  文档
    readme
  代码
项目B
  备份/
  笔记
```

生成：`项目A/文档/readme.md`、`项目A/代码.md`、`项目B/备份/`、`项目B/笔记.md`。

**树形结构**：用缩进表示层级，`.md` 结尾的是文件，其余是文件夹。

**简单文件夹 / 简单文件**：用逗号、顿号或换行分隔，支持 `a/b/c` 嵌套和 `a/b.md` 显式文件。

### 安装

1. 从 [Releases](https://github.com/Gowntn/obsidian-folder-forge/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 放进仓库的 `.obsidian/plugins/folder-forge/` 目录
3. 打开「设置 → 第三方插件」，启用 **Folder Forge**

BRAT：添加 `Gowntn/obsidian-folder-forge` 后启用。

### 使用

1. 打开「设置 → Folder Forge」
2. 选择目标目录（留空 = 仓库根目录）和创建模式
3. 把目录树或名称列表粘贴进输入框
4. 点「立即创建」

例如选「自动识别」，粘贴：

```
日记
  2026
    一月
    二月
```

会生成 `日记/2026/一月.md`、`日记/2026/二月.md`。

同名冲突、目标目录缺失、索引文件是否存在，最后都会汇总在一条通知里。

### 结构预设

预设就是一个普通的 Markdown 笔记：正文是目录树，frontmatter 保存设置。正文请直接写目录树，不要以 `# 标题` 开头。

预设放在 `folder-forge` 文件夹里。默认是仓库根目录的 `/folder-forge`；在「预设位置」里选一个父目录，就会改用「父目录/folder-forge」。文件夹在首次保存时自动创建。

用「预设」下拉直接切换或停用；「读取外部预设」可以从全库任意笔记加载；「保存」覆盖当前预设，「另存为预设」新建一个。

```markdown
---
folder-forge-preset: true
basePath: 日记/2026
mode: auto
contentMode: template
templates:
  "": 模板/日记.md
  "日记/2026": 模板/年度.md
replacePlaceholders: true
indexEnabled: true
indexName: readme
indexScope: bottom
indexContentMode: text
indexContentText: |
  # {{folderName}}
indexTemplate: ""
replaceIndexPlaceholders: true
dateOrder: mdy
dateSeparator: /
monthStyle: short
includeTime: true
timePrecision: second
timeSeparator: ":"
---

一月
  01
  02
```

| 字段 | 说明 |
| --- | --- |
| `basePath` | 目标目录 |
| `mode` | `tree` / `auto` / `folder` / `file` |
| `contentMode` | 新笔记内容来源：`blank` / `text` / `template` / `multi` |
| `contentText` | 自定义文本，支持多行块 |
| `replacePlaceholders` | 普通笔记是否替换占位符 |
| `indexEnabled` | 是否生成文件夹索引 |
| `indexName` / `indexScope` | 索引文件名（`same` / `readme`）与范围 |
| `indexContentMode` | 索引内容来源：`blank` / `text` / `template` |
| `indexContentText` | 索引文本，支持多行块 |
| `indexTemplate` | 索引笔记的模板路径 |
| `replaceIndexPlaceholders` | 索引笔记是否替换占位符 |
| `dateOrder` / `dateSeparator` / `monthStyle` | 日期格式 |
| `includeTime` / `timePrecision` / `timeSeparator` | 时间格式 |
| `templates` | 按文件夹模板；键 `""` 表示默认模板 |

旧预设里可能还有 `template` 字段，读取时会当作默认模板，保存时合并进 `templates[""]`。

`contentMode: multi` 只使用按文件夹模板，没有匹配到规则的文件夹生成空白笔记。

读取预设会把 frontmatter 里的设置套用到设置页；点「保存」会把当前设置写回 frontmatter。预设生效时，设置页里有一个切换按钮，可以在预设设置和读取前的设置之间来回对比。

设置页「结构预设」里：**预设** 下拉直接切换、**读取外部预设** 加载全库任意笔记、**保存** 写回当前预设、**另存为预设** 新建；命令面板里有「**从预设生成**」，选完直接跑。

按文件夹套用模板：在设置页「按文件夹模板」旁点「编辑」，添加文件夹、选择模板即可；文件夹留空表示默认模板。规则里的文件夹可以写完整路径（`日记/2026`），也可以只写文件夹名（`2026`）——只写名字时，任意层级下同名的文件夹都会匹配；完整路径优先于名字，`""` 是最后的默认值。也可以直接写在预设 frontmatter 里：

```markdown
templates:
  "日记": "模板/日记.md"
  "日记/2026": "模板/年度.md"
  "": "模板/默认.md"
```

匹配顺序：完整路径优先，其次是文件夹名，最后是 `""` 默认模板。`日记/2026/01.md` 用「年度」，`日记/其他.md` 用「日记」，其余用 `""` 的默认模板；只写「属性」也能匹配到「输入/属性」。

### 日期与时间

- 年月日：`2026-11-19`
- 月日年（美国）：`11/19/2026`
- 日月年（欧洲）：`19/11/2026` 或 `19.11.2026`
- 英文月份：`Nov 19, 2026`、`19 Nov 2026`、`Nov/19/2026`
- 时间 24 小时制：`14:05` 或 `14:05:33`

### 占位符

`{{title}}`、`{{folderName}}`、`{{parentName}}`、`{{folder}}`、`{{path}}`、`{{date}}`、`{{time}}`、`{{datetime}}`

索引笔记里 `{{title}}` 是索引文件名（如 `README`），`{{folderName}}` 和 `{{parentName}}` 都是文件夹名。

### 文件夹索引

给文件夹配一个入口笔记，用来写概述、链接、标签或待办。只给本次新建的文件夹生成，已有文件夹不补。

### 行为说明

- 创建前先做只读预检，所有对话框都在写入之前弹完
- 已存在的文件夹会被复用，不会重复创建
- 覆盖已有笔记不可撤销
- 同名文件和文件夹可以并存（`A.md` 和 `A/`）
- 文件名按不区分大小写比较，`README.md` 与已有的 `readme.md` 视为同名
- 输入框里 Tab 缩进，Shift+Tab 反缩进
- 非法字符、Windows 保留名、`..` 路径会被跳过并汇总

### 兼容性

- 最低 Obsidian 1.5.0
- 桌面端和移动端均可使用

### 许可证与鸣谢

[MIT](LICENSE) 协议开源。最初版本基于 B 站 UP 主「拈花赛博行」的自动生成文件夹插件，本版本在其思路上重写并扩展。
