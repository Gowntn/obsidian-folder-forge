# Folder Forge

[简体中文](README.md) ｜ **English**

Write the folder tree once and let the plugin create the folders and notes.

Folder Forge creates folders and Markdown notes in bulk from an indented outline or a name list. It uses the Obsidian Vault API, so everything appears in the file explorer immediately — no restart needed.

## Features

- Four input modes: Auto, Tree, Folders, Notes
- Target location is a vault-relative path, defaulting to the vault root, with a folder picker
- Existing note handling: ask / skip / overwrite / abort
- Missing target folder: ask / create / abort
- Folder index notes (folder notes): same name as the folder or `README.md`, limited to top or bottom level
- Separate content settings for new notes and index notes: empty / custom text / template file
- Placeholders for file name, folder name, paths and date/time, with Chinese and English date styles
- Chinese and English UI, following Obsidian's language
- Works on desktop and mobile

## Modes

### 🧠 Auto (default)

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

### 🌳 Tree

Indentation defines the hierarchy; names ending in `.md` are notes, everything else is a folder. Dots in names (`v1.2 Specs`) no longer turn a folder into a note.

```
ProjectA
  Docs
    readme.md
  Code
ProjectB
  Notes.md
```

### 📂 Folders / 📄 Notes

Separate entries with commas, ideographic commas or newlines; a line starting with `# ` is a comment. Both modes support nested paths:

```
ProjectA, ProjectB, Archive/
Notes/2026/11
```

- Folders mode: creates folders by default, `sub/name.md` creates a note
- Notes mode: creates `.md` notes by default, `sub/name/` creates a folder

## Installation

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/Gowntn/obsidian-folder-forge/releases)
2. Put them in `<vault>/.obsidian/plugins/folder-forge/`
3. Open Settings → Community plugins and enable **Folder Forge**

### BRAT (once the repository is published)

Add `Gowntn/obsidian-folder-forge` in BRAT, then enable the plugin.

### No build step

`main.js` is a plain CommonJS file. Save your changes, then disable and re-enable the plugin.

## Settings

| Setting | Description |
| --- | --- |
| Target folder | Vault-relative path; empty = vault root; picker available |
| Create mode | Auto / Tree / Folders / Notes |
| Content source | Content of new notes: empty / custom text / template file |
| Replace placeholders | Toggles placeholder replacement for new notes |
| Template file | Required in template mode; the Check button validates it |
| When a note already exists | Ask / Skip / Overwrite / Abort (notes only; existing folders are reused) |
| When the target folder is missing | Ask / Create / Abort |
| Create index notes | Also create an index note for every new folder |
| Index file name | Same as folder / README.md |
| Scope | Every folder / bottom level only / top level only |
| Index content source | Separate content settings for index notes |
| Date order | Year-month-day / month-day-year (US) / day-month-year (EU) |
| Date separator | `-` / `/` / `.` / space / Chinese characters |
| Month style | Numbers (11) / short name (Nov) / full name (November) |
| Include time | When off, `{{datetime}}` shows only the date; `{{time}}` still works |
| Time precision | Minutes (14:05) / seconds (14:05:33) |
| Time separator | Colon `:` / dot `.` |
| Show ribbon button | Show/hide the sidebar button |

## Date and time

- Year-month-day (ISO 8601, common in China/Japan/Korea): `2026-11-19`
- Month-day-year (US): `11/19/2026`
- Day-month-year (UK/France/Germany etc.): `19/11/2026`, often `19.11.2026` in German
- English month names (Nov / November):
  - space + month-day-year: `Nov 19, 2026`, `November 19, 2026` (comma added automatically)
  - space + day-month-year: `19 Nov 2026`, `19 November 2026`
  - space + year-month-day: `2026 Nov 19`
  - slash: `Nov/19/2026`, `19/Nov/2026`, `2026/Nov/19`
  - Chinese characters: `2026年Nov月19日`
- Time uses the 24-hour clock: `14:05` or `14:05:33`

The settings tab shows a live "Current format" preview.

## Placeholders

| Placeholder | Regular note | Index note |
| --- | --- | --- |
| `{{title}}` | File name without `.md` | Index file name (`README` or folder name) |
| `{{folderName}}` | Containing folder name | Index file name |
| `{{parentName}}` | Containing folder name | Folder the index belongs to |
| `{{folder}}` | Parent path | Parent path |
| `{{path}}` | Full path | Full path |
| `{{date}}` | Created date, formatted by the date settings | Same |
| `{{time}}` | Created time, formatted by the time settings | Same |
| `{{datetime}}` | Date + time, controlled by Include time | Same |

## Folder index notes

An index note is the usual folder note: an entry point for the folder where you keep an overview, links, tags or TODOs. It also shows up in search, the graph and the outline.

- Same name as the folder is the common convention (`ProjectA/ProjectA.md`)
- `README.md` follows the repository-style convention
- Only folders created in the current run get an index note; existing folders are left alone

## Behavior notes

- A read-only preflight runs first; all dialogs appear before anything is written. Choosing Abort creates nothing
- Existing folders are reused, never recreated
- Existing notes follow your conflict setting; overwriting cannot be undone
- A note and a folder with the same name can coexist: `A.md` and `A/` are different objects
- In the outline textarea, Tab inserts indentation and Shift+Tab outdents
- Illegal characters, reserved Windows names (CON, NUL, …) and `..` paths are rejected or skipped, and summarized in the completion notice

## Compatibility

- Requires Obsidian 1.5.0 or newer
- Works on desktop and mobile (no Node `fs`)

## Upgrading from the old version

The plugin id changed from `auto-gen-fft-plugin` to `folder-forge`; rename the folder accordingly.

Absolute paths in the old `data.json` are cleared, so choose the target folder again. The old `folderNames` list is kept in the Folders mode input.

## License and credits

Released under the [MIT](LICENSE) license.

The first version was based on the "auto generate folders" plugin by the Bilibili creator 拈花赛博行; this version is a rewrite and extension of that idea.

## Development and testing

`main.js` is a single-file plugin with no build step. Logic tests live in `_ff_test` (development only, not shipped):

```powershell
Copy-Item .\main.js .\_ff_test\plugin.js -Force
node .\_ff_test\run.js
```
