"use strict";

/*
 * Folder Forge（目录生成器）
 * 从缩进文本或名称列表批量生成文件夹与 Markdown 笔记。
 *
 * 这是可直接加载的 main.js（CommonJS），不需要构建步骤。
 */

const obsidian = require("obsidian");
const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  Modal,
  FuzzySuggestModal,
  TFile,
  TFolder,
  normalizePath,
} = obsidian;

/* ------------------------------------------------------------------ */
/* 默认设置                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  basePath: "",
  createType: "auto",
  showRibbon: true,
  treeStructure: "",
  autoStructure: "",
  folderNames: "",
  fileNames: "",
  contentMode: "blank",
  contentText: "",
  templatePath: "",
  indexContentMode: "blank",
  indexContentText: "",
  indexTemplatePath: "",
  indexReplacePlaceholders: true,
  replacePlaceholders: true,
  dateOrder: "ymd",
  dateSeparator: "-",
  monthStyle: "number",
  includeTime: false,
  timePrecision: "minute",
  timeSeparator: ":",
  onFileConflict: "ask",
  onMissingBase: "ask",
  folderIndexEnabled: false,
  folderIndexName: "same",
  folderIndexScope: "all",
};

const MODE_KEYS = {
  tree: "treeStructure",
  auto: "autoStructure",
  folder: "folderNames",
  file: "fileNames",
};

const MODE_ORDER = ["auto", "tree", "folder", "file"];

/* ------------------------------------------------------------------ */
/* 界面文案（跟随 Obsidian 语言）                                       */
/* ------------------------------------------------------------------ */

let LANG = "zh";

const I18N = {
  zh: {
    ribbon: "目录生成器：批量生成文件夹与笔记",
    command: "批量生成文件夹与笔记",
    mode: {
      auto: {
        name: "自动识别",
        label: "🧠 自动识别（有下级=文件夹，最底层=md）",
        title: "目录树（不写 .md）",
        desc: [
          "用缩进表示层级；",
          "有下级的当文件夹，",
          "最底层的当 md 文件。",
          "名字后面加 / 可强制当文件夹。",
        ],
        example: "项目A\n  文档\n    readme\n  代码\n项目B\n  备注/\n  笔记",
      },
      tree: {
        name: "树形结构",
        label: "🌳 树形结构（用 .md 区分文件）",
        title: "目录树",
        desc: ["用缩进表示层级；", "名字以 .md 结尾的是文件，", "其余是文件夹。"],
        example: "项目A\n  文档\n    readme.md\n  代码\n项目B\n  笔记.md",
      },
      folder: {
        name: "简单文件夹",
        label: "📂 简单文件夹（默认文件夹，也支持 a/b.md）",
        title: "文件夹列表",
        desc: ["用逗号、顿号或换行分隔；", "默认建文件夹，", "也可以写 子目录/名称.md 建文件。"],
        example: "项目A, 项目B, 归档/\n笔记/2026/11",
      },
      file: {
        name: "简单文件",
        label: "📄 简单文件（默认 md，也支持 a/b/）",
        title: "文件列表",
        desc: ["用逗号、顿号或换行分隔；", "默认建 md 文件，", "也可以写 子目录/名称/ 建文件夹。"],
        example: "README, 笔记, 待办\n项目A/说明",
      },
    },
    reason: {
      empty: "名称为空",
      dot: "名称不能是 . 或 ..",
      illegal: "包含非法字符",
      reserved: "是系统保留名称",
      pathEmpty: "路径为空",
      dotPath: "不支持 . 或 .. 路径",
    },
    warning: {
      skipLine: (line, raw, reason) => "第 " + line + " 行「" + raw + "」：" + reason + "，已跳过",
      duplicate: (line, name) => "第 " + line + " 行「" + name + "」：与同级项重名，已跳过",
      folderFromFile: (line, name, stripped) =>
        "第 " + line + " 行「" + name + "」：含有子级，已按文件夹「" + stripped + "」处理",
      folderIsFile: (line, path) =>
        "第 " + line + " 行「" + path + "」：已是文件夹，不能再建同名文件，已跳过",
      fileIsFolder: (line, path) =>
        "第 " + line + " 行「" + path + "」：已是文件，不能再建同名文件夹，已跳过",
      repeated: (line, path) => "第 " + line + " 行「" + path + "」：重复项，已忽略",
    },
    notice: {
      noModeContent: (mode) => "请先在设置里填写「" + mode + "」的内容",
      baseDotDot: "目标目录里不能包含 ..",
      baseBadSegment: (segment, reason) => "目标目录「" + segment + "」" + reason,
      nothing: (first) => (first ? "没有可创建的内容：" + first : "没有可创建的内容"),
      baseOccupied: (path) => "目标位置「" + path + "」已被文件占用",
      cancelled: "已取消，未创建任何内容",
      legacyPath: "检测到旧的绝对路径，已清空，请重新选择目标文件夹",
      templateModeNoFile: (label) => label + "模式已开启，但没有选择模板文件",
      templateMissing: (label) => "没有读取到" + label,
      templateError: (label, message) => "没有读取到" + label + "：" + message,
      runFailed: (message) => "生成失败：" + message,
    },
    report: {
      title: "创建完成！",
      folders: (count) => "✅ 新建文件夹：" + count + " 个",
      files: (count) => "📄 新建文件：" + count + " 个",
      reused: (count) => "♻️ 复用文件夹：" + count + " 个",
      overwritten: (count) => "✏️ 覆盖文件：" + count + " 个",
      skipped: (count) => "⏭️ 跳过：" + count + " 个",
      failed: (count) => "❌ 失败：" + count + " 个",
      warnings: (count, first) => "⚠️ 解析提示 " + count + " 条：" + first,
      errors: (first) => "❌ 失败原因：" + first,
    },
    dialog: {
      baseQuestion: (path) => "目标文件夹「" + path + "」不存在，是否创建？",
      create: "创建",
      cancel: "取消",
      conflictTitle: (count) => "发现 " + count + " 个同名文件",
      conflictDesc: "这些路径上已经有文件。覆盖会替换原文件内容，且无法撤销。",
      skipThese: "跳过这些",
      overwriteThese: "覆盖这些",
      abortAll: "终止整个任务",
      more: (count) => "……还有 " + count + " 个",
      folderPlaceholder: "选择目标文件夹（回车确认）",
      rootFolder: "/（仓库根目录）",
      templatePlaceholderPick: "选择模板文件",
    },
    labels: {
      template: "模板文件",
      indexTemplate: "索引文件模板",
    },
    verify: {
      choose: (label) => "请先选择" + label,
      read: (path, length) => "已读取模板：" + path + "（" + length + " 个字符）",
    },
    errors: {
      folderOccupied: (path) => "「" + path + "」已存在同名文件，无法创建文件夹，已跳过",
      fileOccupied: (path) => "「" + path + "」已存在同名文件夹，无法创建文件，已跳过",
      makeBase: (path, message) => "创建目录「" + path + "」失败：" + message,
      makeFolder: (path, message) => "创建文件夹「" + path + "」失败：" + message,
      makeFile: (path, message) => "创建文件「" + path + "」失败：" + message,
    },
    settings: {
      location: "生成位置",
      create: "创建内容",
      fileContent: "新建文件内容",
      conflictSection: "同名与目录",
      index: "文件夹索引",
      indexContent: "索引文件内容",
      datetime: "日期与时间",
      actions: "操作",
      basePath: "目标目录",
      basePathDesc: "相对仓库根目录，留空表示仓库根目录。例如：日记/2026",
      basePathPlaceholder: "留空 = 仓库根目录",
      chooseFolder: "选择文件夹",
      mode: "创建模式",
      contentSource: "内容来源",
      contentSourceDesc: "新建的每个 md 文件写入什么内容",
      blankFile: "空白文件",
      customText: "自定义文本",
      templateFile: "模板文件",
      textContent: "文本内容",
      textContentDesc: "会原样写入每个新建的 md，可留空",
      textContentPlaceholder: "例如：# {{title}}\n\n创建于 {{date}}",
      templateDesc: "运行时读取这个文件作为新建笔记的内容",
      templatePlaceholder: "仓库内的 md 路径",
      choose: "选择",
      confirm: "确定",
      replacePlaceholders: "替换占位符",
      conflictName: "同名文件已存在时",
      conflictDesc: "只针对文件；已存在的文件夹会被直接复用",
      ask: "弹出对话框询问",
      skip: "跳过",
      overwrite: "覆盖",
      abort: "终止",
      missingBase: "目标目录不存在时",
      missingBaseDesc: "目标目录指上面填写的生成位置",
      createIt: "直接创建",
      indexEnable: "生成索引文件",
      indexEnableDesc: "为本次新建的文件夹同时生成一个索引 md",
      indexName: "索引文件名",
      indexSame: "与文件夹同名",
      indexScope: "生成范围",
      indexScopeDesc: "最底层指没有子文件夹；最顶层指目标目录的下一层",
      scopeAll: "每个文件夹",
      scopeBottom: "只在最底层",
      scopeTop: "只在最顶层",
      indexSource: "索引内容来源",
      indexSourceDesc: "只用于索引文件，与上面普通文件的内容互不影响",
      indexText: "索引文本内容",
      indexTextDesc: "会写入每个新建的索引 md，可留空",
      indexTextPlaceholder: "例如：# {{folderName}}",
      indexTemplate: "索引模板文件",
      indexTemplateDesc: "运行时读取这个文件作为索引笔记的内容",
      dateOrder: "日期顺序",
      dateOrderDesc: "影响 {{date}} 和 {{datetime}}",
      orderYmd: "年月日（2026-11-19）",
      orderMdy: "月日年（美国 11/19/2026）",
      orderDmy: "日月年（欧洲 19/11/2026）",
      dateSep: "日期分隔符",
      dateSepDesc: "选「年月日」时输出 2026年11月19日，并忽略上面的顺序",
      sepDash: "短横线 -",
      sepSlash: "斜杠 /",
      sepDot: "点号 .",
      sepZh: "年月日",
      sepSpace: "空格（月日年时加逗号）",
      monthStyle: "月份写法",
      monthStyleDesc: "英文月份同样使用上面的日期分隔符",
      monthNumber: "数字（11）",
      monthShort: "英文缩写（Nov）",
      monthLong: "英文全称（November）",
      includeTime: "包含时间",
      includeTimeDesc:
        "关闭时 {{datetime}} 只显示日期；{{time}} 始终按上面选择的精度和分隔符输出",
      timePrecision: "时间精度",
      precisionMinute: "到分（14:05）",
      precisionSecond: "到秒（14:05:33）",
      timeSep: "时间分隔符",
      timeSepColon: "冒号 :",
      timeSepDot: "点号 .",
      sample: "当前格式示例",
      showRibbon: "显示侧边栏按钮",
      showRibbonDesc: "关闭后左侧边栏不再显示「目录生成器：批量生成文件夹与笔记」按钮",
      runNow: "立即生成",
      runNowDesc: "按照上面的设置批量创建文件夹和笔记",
      runButton: "立即创建",
    },
    placeholderLines: [
      "{{title}} = 文件名",
      "{{folderName}} = 所在文件夹名",
      "{{parentName}} = 实际文件夹名",
      "{{folder}} = 父路径，{{path}} = 完整路径",
      "{{date}} = 创建日期，{{time}} = 创建时间，{{datetime}} = 日期 + 时间",
    ],
  },
  en: {
    ribbon: "Folder Forge: create folders and notes",
    command: "Create folders and notes",
    mode: {
      auto: {
        name: "Auto",
        label: "🧠 Auto (has children = folder, leaves = md)",
        title: "Tree (no .md)",
        desc: [
          "Indentation defines the hierarchy;",
          "nodes with children become folders,",
          "leaf nodes become .md notes.",
          "Append / to force a folder.",
        ],
        example: "ProjectA\n  Docs\n    readme\n  Code\nProjectB\n  Backup/\n  Notes",
      },
      tree: {
        name: "Tree",
        label: "🌳 Tree (use .md to mark notes)",
        title: "Tree",
        desc: ["Indentation defines the hierarchy;", "names ending in .md are notes,", "everything else is a folder."],
        example: "ProjectA\n  Docs\n    readme.md\n  Code\nProjectB\n  Notes.md",
      },
      folder: {
        name: "Folders",
        label: "📂 Folders (folders by default, a/b.md also works)",
        title: "Folder list",
        desc: [
          "Separate with commas or newlines;",
          "creates folders by default,",
          "you can also write sub/name.md to create notes.",
        ],
        example: "ProjectA, ProjectB, Archive/\nNotes/2026/11",
      },
      file: {
        name: "Notes",
        label: "📄 Notes (md by default, a/b/ also works)",
        title: "Note list",
        desc: [
          "Separate with commas or newlines;",
          "creates .md notes by default,",
          "you can also write sub/name/ to create folders.",
        ],
        example: "README, Notes, TODO\nProjectA/Intro",
      },
    },
    reason: {
      empty: "name is empty",
      dot: "name cannot be . or ..",
      illegal: "contains illegal characters",
      reserved: "is a reserved Windows name",
      pathEmpty: "path is empty",
      dotPath: ". and .. are not supported",
    },
    warning: {
      skipLine: (line, raw, reason) => "Line " + line + "「" + raw + "」: " + reason + ", skipped",
      duplicate: (line, name) => "Line " + line + "「" + name + "」: duplicate sibling, skipped",
      folderFromFile: (line, name, stripped) =>
        "Line " + line + "「" + name + "」: has children, treated as folder「" + stripped + "」",
      folderIsFile: (line, path) =>
        "Line " + line + "「" + path + "」: already a folder, cannot create a note with the same name, skipped",
      fileIsFolder: (line, path) =>
        "Line " + line + "「" + path + "」: already a note, cannot create a folder with the same name, skipped",
      repeated: (line, path) => "Line " + line + "「" + path + "」: duplicate entry, ignored",
    },
    notice: {
      noModeContent: (mode) => "Fill in the「" + mode + "」content in settings first",
      baseDotDot: "Target folder cannot contain ..",
      baseBadSegment: (segment, reason) => "Target folder「" + segment + "」" + reason,
      nothing: (first) => (first ? "Nothing to create: " + first : "Nothing to create"),
      baseOccupied: (path) => "Target location「" + path + "」is occupied by a file",
      cancelled: "Cancelled; nothing was created",
      legacyPath: "Old absolute path detected and cleared; please choose the target folder again",
      templateModeNoFile: (label) => label + " mode is on, but no template file is selected",
      templateMissing: (label) => "Could not read " + label,
      templateError: (label, message) => "Could not read " + label + ": " + message,
      runFailed: (message) => "Failed: " + message,
    },
    report: {
      title: "Done!",
      folders: (count) => "✅ Folders created: " + count,
      files: (count) => "📄 Notes created: " + count,
      reused: (count) => "♻️ Folders reused: " + count,
      overwritten: (count) => "✏️ Notes overwritten: " + count,
      skipped: (count) => "⏭️ Skipped: " + count,
      failed: (count) => "❌ Failed: " + count,
      warnings: (count, first) => "⚠️ " + count + " parse warnings: " + first,
      errors: (first) => "❌ First error: " + first,
    },
    dialog: {
      baseQuestion: (path) => "Folder「" + path + "」does not exist. Create it?",
      create: "Create",
      cancel: "Cancel",
      conflictTitle: (count) => count + " existing note(s) found",
      conflictDesc: "These notes already exist. Overwriting replaces their content and cannot be undone.",
      skipThese: "Skip these",
      overwriteThese: "Overwrite these",
      abortAll: "Abort everything",
      more: (count) => "…and " + count + " more",
      folderPlaceholder: "Choose the target folder (Enter to confirm)",
      rootFolder: "/ (vault root)",
      templatePlaceholderPick: "Choose a template file",
    },
    labels: {
      template: "template file",
      indexTemplate: "index template",
    },
    verify: {
      choose: (label) => "Select " + label + " first",
      read: (path, length) => "Template loaded: " + path + " (" + length + " characters)",
    },
    errors: {
      folderOccupied: (path) => "「" + path + "」is occupied by a file, cannot create the folder, skipped",
      fileOccupied: (path) => "「" + path + "」is occupied by a folder, cannot create the note, skipped",
      makeBase: (path, message) => "Failed to create folder「" + path + "」: " + message,
      makeFolder: (path, message) => "Failed to create folder「" + path + "」: " + message,
      makeFile: (path, message) => "Failed to create note「" + path + "」: " + message,
    },
    settings: {
      location: "Location",
      create: "Content",
      fileContent: "New note content",
      conflictSection: "Conflicts & folders",
      index: "Folder index",
      indexContent: "Index content",
      datetime: "Date & time",
      actions: "Actions",
      basePath: "Target folder",
      basePathDesc: "Vault-relative path; leave empty for the vault root. Example: Journal/2026",
      basePathPlaceholder: "Empty = vault root",
      chooseFolder: "Choose folder",
      mode: "Create mode",
      contentSource: "Content source",
      contentSourceDesc: "What to write into each new note",
      blankFile: "Empty file",
      customText: "Custom text",
      templateFile: "Template file",
      textContent: "Text content",
      textContentDesc: "Written into every new note; can be empty",
      textContentPlaceholder: "Example: # {{title}}\n\nCreated {{date}}",
      templateDesc: "Read at run time and used as the note content",
      templatePlaceholder: "Path to a note in the vault",
      choose: "Choose",
      confirm: "Check",
      replacePlaceholders: "Replace placeholders",
      conflictName: "When a note already exists",
      conflictDesc: "Applies to notes only; existing folders are reused",
      ask: "Ask with a dialog",
      skip: "Skip",
      overwrite: "Overwrite",
      abort: "Abort",
      missingBase: "When the target folder is missing",
      missingBaseDesc: "The target folder is the location set above",
      createIt: "Create it",
      indexEnable: "Create index notes",
      indexEnableDesc: "Create an index note for every new folder",
      indexName: "Index file name",
      indexSame: "Same as folder",
      indexScope: "Scope",
      indexScopeDesc: "Bottom = no subfolders; top = direct children of the target folder",
      scopeAll: "Every folder",
      scopeBottom: "Bottom level only",
      scopeTop: "Top level only",
      indexSource: "Index content source",
      indexSourceDesc: "Used only for index notes; independent from note content",
      indexText: "Index text content",
      indexTextDesc: "Written into every new index note; can be empty",
      indexTextPlaceholder: "Example: # {{folderName}}",
      indexTemplate: "Index template",
      indexTemplateDesc: "Read at run time and used as index note content",
      dateOrder: "Date order",
      dateOrderDesc: "Affects {{date}} and {{datetime}}",
      orderYmd: "Year-month-day (2026-11-19)",
      orderMdy: "Month-day-year (US 11/19/2026)",
      orderDmy: "Day-month-year (EU 19/11/2026)",
      dateSep: "Date separator",
      dateSepDesc: "Outputs 2026年11月19日 and ignores the date order above",
      sepDash: "Hyphen -",
      sepSlash: "Slash /",
      sepDot: "Dot .",
      sepZh: "Chinese characters",
      sepSpace: "Space (works for Month-day-year)",
      monthStyle: "Month style",
      monthStyleDesc: "English month names use the date separator above too",
      monthNumber: "Numbers (11)",
      monthShort: "Short name (Nov)",
      monthLong: "Full name (November)",
      includeTime: "Include time",
      includeTimeDesc: "When off, {{datetime}} shows only the date; {{time}} always uses the precision and separator above",
      timePrecision: "Time precision",
      precisionMinute: "Minutes (14:05)",
      precisionSecond: "Seconds (14:05:33)",
      timeSep: "Time separator",
      timeSepColon: "Colon :",
      timeSepDot: "Dot .",
      sample: "Current format",
      showRibbon: "Show ribbon button",
      showRibbonDesc: "Hide the「Folder Forge: create folders and notes」button in the sidebar",
      runNow: "Generate now",
      runNowDesc: "Create folders and notes using the settings above",
      runButton: "Create now",
    },
    placeholderLines: [
      "{{title}} = file name",
      "{{folderName}} = parent folder name",
      "{{parentName}} = actual folder name",
      "{{folder}} = parent path, {{path}} = full path",
      "{{date}} = created date, {{time}} = created time, {{datetime}} = date + time",
    ],
  },
};

function lookupString(table, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), table);
}

function t(key, ...args) {
  let value = lookupString(I18N[LANG], key);
  if (value === undefined) value = lookupString(I18N.zh, key);
  if (typeof value === "function") return value(...args);
  return value === undefined ? key : value;
}

function setLanguage(value) {
  LANG = value === "en" ? "en" : "zh";
}

function detectLanguage() {
  try {
    const raw = String(window.localStorage.getItem("language") || "").toLowerCase();
    if (raw.startsWith("zh")) return "zh";
    if (raw) return "en";
  } catch (error) {
    /* ignore */
  }
  try {
    const momentLib = typeof window !== "undefined" && window.moment ? window.moment : null;
    if (momentLib) {
      return String(momentLib.locale()).toLowerCase().startsWith("zh") ? "zh" : "en";
    }
  } catch (error) {
    /* ignore */
  }
  return "zh";
}

function modeName(mode) {
  return t("mode." + mode + ".name");
}

function modeLabel(mode) {
  return t("mode." + mode + ".label");
}

function modeTitle(mode) {
  return t("mode." + mode + ".title");
}

function modeDesc(mode) {
  return t("mode." + mode + ".desc");
}

function modeExample(mode) {
  return t("mode." + mode + ".example");
}


/* ------------------------------------------------------------------ */
/* 名称与路径工具                                                       */
/* ------------------------------------------------------------------ */

const ILLEGAL_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function sanitizeName(raw) {
  let name = String(raw == null ? "" : raw).trim();
  name = name.replace(/[. ]+$/, "");
  if (!name) return { ok: false, reason: "empty" };
  if (name === "." || name === "..") return { ok: false, reason: "dot" };
  if (ILLEGAL_CHARS.test(name)) return { ok: false, reason: "illegal" };
  if (WINDOWS_RESERVED.test(name.split(".")[0])) return { ok: false, reason: "reserved" };
  return { ok: true, name };
}

function normalizeVaultPath(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  const normalized = normalizePath(text.replace(/\\/g, "/"));
  return normalized === "/" ? "" : normalized;
}

function joinPath(parent, name) {
  return parent ? parent + "/" + name : name;
}

function parentOf(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function uniqueChildKey(parent, name) {
  if (!parent.children.has(name)) return name;
  let counter = 2;
  while (parent.children.has(name + "\u0000" + counter)) counter += 1;
  return name + "\u0000" + counter;
}

function findChildByName(node, name) {
  const target = name.toLowerCase();
  for (const child of node.children.values()) {
    if (child.name.toLowerCase() === target) return child;
  }
  return null;
}

function descriptionFragment(lines) {
  const list = Array.isArray(lines) ? lines : [String(lines)];
  const fragment = document.createDocumentFragment();
  list.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement("br"));
    fragment.appendChild(document.createTextNode(line));
  });
  return fragment;
}

function getScrollParent(element) {
  if (!element) return null;
  if (typeof element.closest === "function") {
    const content = element.closest(".vertical-tab-content");
    if (content) return content;
  }
  let node = element.parentElement;
  while (node) {
    if (node.scrollHeight > node.clientHeight + 4) return node;
    node = node.parentElement;
  }
  return null;
}

function handleTabKey(inputEl, event) {
  const value = inputEl.value;
  const start = inputEl.selectionStart;
  const end = inputEl.selectionEnd;
  event.preventDefault();

  if (!event.shiftKey) {
    if (start === end) {
      inputEl.value = value.slice(0, start) + "\t" + value.slice(end);
      inputEl.selectionStart = start + 1;
      inputEl.selectionEnd = start + 1;
    } else {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const replaced = block
        .split("\n")
        .map((line) => "\t" + line)
        .join("\n");
      inputEl.value = value.slice(0, lineStart) + replaced + value.slice(end);
      inputEl.selectionStart = lineStart;
      inputEl.selectionEnd = lineStart + replaced.length;
    }
  } else {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newlineIndex = value.indexOf("\n", end);
    const lineEnd = newlineIndex === -1 ? value.length : newlineIndex;
    const block = value.slice(lineStart, lineEnd);
    const replaced = block
      .split("\n")
      .map((line) => line.replace(/^\t/, "").replace(/^ {1,4}/, ""))
      .join("\n");

    if (replaced === block) return;

    const delta = block.length - replaced.length;
    inputEl.value = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
    inputEl.selectionStart = Math.max(lineStart, start - delta);
    inputEl.selectionEnd = Math.max(inputEl.selectionStart, end - delta);
  }

  inputEl.dispatchEvent(new Event("input"));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDateValue(date, settings) {
  const year = String(date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (settings.monthStyle === "short" || settings.monthStyle === "long") {
    const names = settings.monthStyle === "short" ? MONTH_NAMES_SHORT : MONTH_NAMES_LONG;
    const monthName = names[month - 1];

    if (settings.dateSeparator === "zh") {
      return year + "年" + monthName + "月" + day + "日";
    }

    if (settings.dateSeparator === "space") {
      if (settings.dateOrder === "mdy") return monthName + " " + day + ", " + year;
      if (settings.dateOrder === "dmy") return day + " " + monthName + " " + year;
      return year + " " + monthName + " " + day;
    }

    const sep = settings.dateSeparator;
    if (settings.dateOrder === "mdy") return monthName + sep + day + sep + year;
    if (settings.dateOrder === "dmy") return day + sep + monthName + sep + year;
    return year + sep + monthName + sep + day;
  }

  if (settings.dateSeparator === "zh") {
    return year + "年" + month + "月" + day + "日";
  }

  const mm = pad2(month);
  const dd = pad2(day);
  const sep = settings.dateSeparator;

  if (settings.dateOrder === "mdy") return mm + sep + dd + sep + year;
  if (settings.dateOrder === "dmy") return dd + sep + mm + sep + year;
  return year + sep + mm + sep + dd;
}

function formatTimeValue(date, settings) {
  const sep = settings.timeSeparator;
  let text = pad2(date.getHours()) + sep + pad2(date.getMinutes());
  if (settings.timePrecision === "second") {
    text += sep + pad2(date.getSeconds());
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* 解析：缩进树（tree / auto）                                          */
/* ------------------------------------------------------------------ */

function parseIndentedTree(text, mode) {
  const warnings = [];
  const root = { name: "", kind: "folder", children: new Map(), parent: null, depth: 0, line: 0 };
  const stack = [{ node: root, indent: -1 }];
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const expanded = line.replace(/\t/g, "    ");
    const indent = expanded.match(/^ */)[0].length;
    const raw = expanded.trim();
    if (!raw) return;

    const explicitFolder = raw.endsWith("/");
    const explicitFile = /\.md$/i.test(raw);
    const cleaned = raw.replace(/\/+$/, "").trim();
    const check = sanitizeName(cleaned);
    if (!check.ok) {
      warnings.push(t("warning.skipLine", index + 1, raw, t("reason." + check.reason)));
      return;
    }

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    const name = check.name;

    const node = {
      name,
      kind: "folder",
      explicitFile,
      explicitFolder,
      children: new Map(),
      parent,
      line: index + 1,
      skip: false,
    };
    parent.children.set(uniqueChildKey(parent, name), node);
    stack.push({ node, indent });
  });

  assignKinds(root, mode, warnings);
  return { root, warnings };
}

function assignKinds(parent, mode, warnings) {
  const taken = new Map();

  for (const node of parent.children.values()) {
    const hasChildren = node.children.size > 0;
    let name = node.name;
    let kind;

    if (hasChildren) {
      kind = "folder";
      if (node.explicitFile) {
        const stripped = name.replace(/\.md$/i, "");
        warnings.push(t("warning.folderFromFile", node.line, name, stripped));
        name = stripped;
      }
    } else if (node.explicitFolder) {
      kind = "folder";
    } else if (mode === "tree") {
      kind = node.explicitFile ? "file" : "folder";
    } else {
      kind = "file";
      if (!/\.md$/i.test(name)) name += ".md";
    }

    const key = name.toLowerCase();
    if (taken.has(key)) {
      warnings.push(t("warning.duplicate", node.line, name));
      node.skip = true;
      continue;
    }
    taken.set(key, node);
    node.name = name;
    node.kind = kind;

    if (kind === "folder") {
      assignKinds(node, mode, warnings);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 解析：条目列表（folder / file）                                      */
/* ------------------------------------------------------------------ */

function parseItemList(text, mode) {
  const warnings = [];
  const root = { name: "", kind: "folder", children: new Map(), parent: null, depth: 0, line: 0 };
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^#\s/.test(trimmed)) return;

    for (const chunk of trimmed.split(/[,，、]/)) {
      const raw = chunk.trim();
      if (!raw) continue;
      const parsed = parseItemPath(raw, mode);
      if (!parsed.ok) {
        warnings.push(t("warning.skipLine", index + 1, raw, t("reason." + parsed.reason)));
        continue;
      }
      insertItemPath(root, parsed.segments, parsed.kind, warnings, index + 1);
    }
  });

  return { root, warnings };
}

function parseItemPath(raw, mode) {
  let text = String(raw == null ? "" : raw).trim();
  if (!text) return { ok: false, reason: "empty" };

  const explicitFolder = text.endsWith("/");
  text = text.replace(/\/+$/, "");
  const explicitFile = /\.md$/i.test(text);
  const rawSegments = text
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!rawSegments.length) return { ok: false, reason: "pathEmpty" };

  const segments = [];
  for (const segment of rawSegments) {
    if (segment === "." || segment === "..") {
      return { ok: false, reason: "dotPath" };
    }
    const check = sanitizeName(segment);
    if (!check.ok) return { ok: false, reason: check.reason };
    segments.push(check.name);
  }

  let kind;
  if (explicitFolder) kind = "folder";
  else if (explicitFile) kind = "file";
  else kind = mode === "folder" ? "folder" : "file";

  if (kind === "file" && !/\.md$/i.test(segments[segments.length - 1])) {
    segments[segments.length - 1] += ".md";
  }

  return { ok: true, segments, kind };
}

function insertItemPath(root, segments, kind, warnings, line) {
  let current = root;
  const walked = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const wanted = isLast ? kind : "folder";
    walked.push(segment);

    const existing = current.children.get(segment);
    if (!existing) {
      const node = { name: segment, kind: wanted, children: new Map(), parent: current, line, skip: false };
      current.children.set(segment, node);
      current = node;
      continue;
    }

    const isFolderNode = existing.kind === "folder" || existing.children.size > 0;
    if (isFolderNode && wanted === "file") {
      warnings.push(t("warning.folderIsFile", line, walked.join("/")));
      return;
    }
    if (!isFolderNode && wanted === "folder") {
      warnings.push(t("warning.fileIsFolder", line, walked.join("/")));
      return;
    }
    if (!isFolderNode && wanted === "file") {
      warnings.push(t("warning.repeated", line, walked.join("/")));
      return;
    }
    current = existing;
  }
}

/* ------------------------------------------------------------------ */
/* 结构标注                                                             */
/* ------------------------------------------------------------------ */

function annotateTree(node, depth) {
  node.depth = depth;
  let hasSubfolder = false;

  for (const child of node.children.values()) {
    if (child.skip) continue;
    if (child.kind === "folder") hasSubfolder = true;
  }
  node.hasSubfolder = hasSubfolder;

  for (const child of node.children.values()) {
    if (child.skip) continue;
    annotateTree(child, depth + 1);
  }
}

function indexScopeMatches(node, settings) {
  if (!settings.folderIndexEnabled) return false;
  if (node.kind !== "folder" || node.depth === 0) return false;

  if (settings.folderIndexScope === "bottom") return !node.hasSubfolder;
  if (settings.folderIndexScope === "top") return node.depth === 1;
  return true;
}

/* ------------------------------------------------------------------ */
/* 对话框                                                               */
/* ------------------------------------------------------------------ */

class MissingBaseModal extends Modal {
  constructor(app, path, resolve) {
    super(app);
    this.path = path;
    this.resolve = resolve;
    this.done = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: t("dialog.baseQuestion", this.path) });

    const row = contentEl.createDiv({ cls: "folder-forge-modal-buttons" });
    const cancel = row.createEl("button", { text: t("dialog.cancel") });
    cancel.addEventListener("click", () => this.finish("abort"));

    const confirm = row.createEl("button", { text: t("dialog.create") });
    confirm.addClass("mod-cta");
    confirm.addEventListener("click", () => this.finish("create"));
  }

  finish(value) {
    if (this.done) return;
    this.done = true;
    this.resolve(value);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (!this.done) {
      this.done = true;
      this.resolve("abort");
    }
  }
}

class ConflictModal extends Modal {
  constructor(app, paths, resolve) {
    super(app);
    this.paths = paths;
    this.resolve = resolve;
    this.done = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: t("dialog.conflictTitle", this.paths.length) });
    contentEl.createEl("p", {
      text: t("dialog.conflictDesc"),
      cls: "folder-forge-hint",
    });

    const list = contentEl.createDiv({ cls: "folder-forge-conflict-list" });
    for (const path of this.paths.slice(0, 200)) {
      list.createDiv({ text: path, cls: "folder-forge-conflict-item" });
    }
    if (this.paths.length > 200) {
      list.createDiv({
        text: t("dialog.more", this.paths.length - 200),
        cls: "folder-forge-hint",
      });
    }

    const row = contentEl.createDiv({ cls: "folder-forge-modal-buttons" });
    const skip = row.createEl("button", { text: t("dialog.skipThese") });
    skip.addEventListener("click", () => this.finish("skip"));

    const overwrite = row.createEl("button", { text: t("dialog.overwriteThese") });
    overwrite.addClass("mod-warning");
    overwrite.addEventListener("click", () => this.finish("overwrite"));

    const abort = row.createEl("button", { text: t("dialog.abortAll") });
    abort.addEventListener("click", () => this.finish("abort"));
  }

  finish(value) {
    if (this.done) return;
    this.done = true;
    this.resolve(value);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (!this.done) {
      this.done = true;
      this.resolve("abort");
    }
  }
}

class FolderSuggestModal extends FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("dialog.folderPlaceholder"));
  }

  onOpen() {
    super.onOpen();
    // 每次打开都从空白开始，不预填上次的选择
    this.inputEl.value = "";
  }

  getItems() {
    return this.app.vault.getAllFolders(true);
  }

  getItemText(item) {
    return item.path ? item.path : t("dialog.rootFolder");
  }

  onChooseItem(item) {
    this.onChoose(item.path || "");
  }
}

class TemplateSuggestModal extends FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("dialog.templatePlaceholderPick"));
  }

  getItems() {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(item) {
    return item.path;
  }

  onChooseItem(item) {
    this.onChoose(item.path);
  }
}

/* ------------------------------------------------------------------ */
/* 插件主体                                                             */
/* ------------------------------------------------------------------ */

class FolderForgePlugin extends Plugin {
  async onload() {
    setLanguage(detectLanguage());
    await this.loadSettings();
    this.applyRibbon();

    this.addCommand({
      id: "run",
      name: t("command"),
      callback: () => this.runCreate(),
    });

    this.addSettingTab(new FolderForgeSettingTab(this.app, this));
  }

  async loadSettings() {
    const loaded = (await this.loadData()) || {};
    const isLegacyData = !Object.prototype.hasOwnProperty.call(loaded, "autoStructure");
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    this.settings.basePath = this.migrateBasePath(loaded.basePath);
    if (isLegacyData) this.settings.createType = "auto";
    this._running = false;
    this._template = null;
    this._indexTemplate = null;
  }

  applyRibbon() {
    const shouldShow = this.settings.showRibbon !== false;

    if (shouldShow && !this._ribbonEl) {
      this._ribbonEl = this.addRibbonIcon(
        "folder-tree",
        t("ribbon"),
        () => this.runCreate()
      );
    } else if (!shouldShow && this._ribbonEl) {
      if (typeof this._ribbonEl.remove === "function") this._ribbonEl.remove();
      this._ribbonEl = null;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  migrateBasePath(raw) {
    const value = String(raw == null ? "" : raw).trim();
    if (!value) return "";

    const isAbsolute =
      /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("/") || value.startsWith("\\\\");
    if (!isAbsolute) return normalizeVaultPath(value);

    // 旧版本保存的是磁盘绝对路径：不再自动带进来，清空让用户重新选择
    new Notice(t("notice.legacyPath"));
    return "";
  }

  /* ---------------- 入口 ---------------- */

  async runCreate() {
    if (this._running) return;
    this._running = true;

    try {
      const settings = this.settings;
      const mode = settings.createType;
      const text = String(settings[MODE_KEYS[mode]] || "").trim();

      if (!text) {
        new Notice(t("notice.noModeContent", modeName(mode)));
        return;
      }

      const base = normalizeVaultPath(settings.basePath);
      if (base.split("/").some((segment) => segment === "..")) {
        new Notice(t("notice.baseDotDot"));
        return;
      }
      for (const segment of base.split("/")) {
        if (!segment) continue;
        const check = sanitizeName(segment);
        if (!check.ok) {
          new Notice(t("notice.baseBadSegment", segment, t("reason." + check.reason)));
          return;
        }
      }

      const parsed =
        mode === "tree" || mode === "auto"
          ? parseIndentedTree(text, mode)
          : parseItemList(text, mode);

      if (!parsed.root.children.size) {
        new Notice(t("notice.nothing", parsed.warnings[0] || ""));
        return;
      }

      annotateTree(parsed.root, 0);

      this._existingPaths = this.buildExistingIndex();

      // 1. 目标目录是否存在
      const missingBase = this.findMissingBase(base);
      if (missingBase === null) return;

      let baseDecision = settings.onMissingBase;
      if (missingBase.length && baseDecision === "ask") {
        baseDecision = await this.askCreateBase(missingBase[missingBase.length - 1]);
      }
      if (missingBase.length && baseDecision === "abort") {
        new Notice(t("notice.cancelled"));
        return;
      }

      // 2. 预检（只读）
      const plan = { folders: [], files: [], errors: [], seenPaths: new Set() };
      this.planFolder(parsed.root, base, plan);

      // 3. 同名文件冲突
      const conflicts = plan.files.filter((item) => item.action === "conflict");
      if (conflicts.length) {
        let policy = settings.onFileConflict;
        if (policy === "ask") {
          policy = await this.askConflicts(conflicts.map((item) => item.path));
        }
        if (policy === "abort") {
          new Notice(t("notice.cancelled"));
          return;
        }
        for (const item of conflicts) {
          item.action = policy === "overwrite" ? "overwrite" : "skip";
        }
      }

      // 4. 模板预读
      const templatesReady = await this.prepareTemplates();
      if (!templatesReady) return;

      // 5. 执行
      const stats = await this.executePlan(plan, missingBase);

      // 6. 汇总
      this.report(parsed.warnings, plan.errors, stats);
    } catch (error) {
      console.error("[folder-forge]", error);
      new Notice(t("notice.runFailed", error && error.message ? error.message : String(error)), 8000);
    } finally {
      this._running = false;
    }
  }

  /* ---------------- 目标目录 ---------------- */

  buildExistingIndex() {
    const map = new Map();
    const vault = this.app.vault;
    let items = [];
    try {
      if (typeof vault.getAllLoadedFiles === "function") {
        items = vault.getAllLoadedFiles() || [];
      } else {
        if (typeof vault.getFiles === "function") items = items.concat(vault.getFiles());
        if (typeof vault.getAllFolders === "function") {
          items = items.concat(vault.getAllFolders(true));
        }
      }
    } catch (error) {
      items = [];
    }
    for (const item of items) {
      if (!item || typeof item.path !== "string") continue;
      map.set(item.path.toLowerCase(), item);
    }
    return map;
  }

  lookupEntry(path) {
    if (!this._existingPaths) return this.app.vault.getAbstractFileByPath(path);
    return this._existingPaths.get(String(path).toLowerCase()) || null;
  }

  findMissingBase(base) {
    if (!base) return [];

    const missing = [];
    let current = "";

    for (const segment of base.split("/")) {
      if (!segment) continue;
      current = joinPath(current, segment);
      const entry = this.lookupEntry(current);
      if (!entry) {
        missing.push(current);
      } else if (!(entry instanceof TFolder)) {
        new Notice(t("notice.baseOccupied", current));
        return null;
      }
    }

    return missing;
  }

  askCreateBase(path) {
    return new Promise((resolve) => {
      new MissingBaseModal(this.app, path, resolve).open();
    });
  }

  askConflicts(paths) {
    return new Promise((resolve) => {
      new ConflictModal(this.app, paths, resolve).open();
    });
  }

  /* ---------------- 预检 ---------------- */

  planFolder(parent, parentPath, plan) {
    for (const node of parent.children.values()) {
      if (node.skip) continue;

      const path = joinPath(parentPath, node.name);

      if (node.kind === "folder") {
        const entry = this.lookupEntry(path);
        let childBase = path;
        if (entry instanceof TFolder) {
          childBase = entry.path;
          plan.folders.push({ path: entry.path, action: "reuse" });
        } else if (entry) {
          plan.errors.push(t("errors.folderOccupied", path));
          continue;
        } else {
          plan.folders.push({ path, action: "create" });
          if (indexScopeMatches(node, this.settings)) {
            const indexName = this.indexFileName(node);
            if (!findChildByName(node, indexName)) {
              this.planFile(
                joinPath(path, indexName),
                { name: indexName, kind: "file", isIndex: true, indexFor: node.name },
                plan
              );
            }
          }
        }
        this.planFolder(node, childBase, plan);
      } else {
        this.planFile(path, node, plan);
      }
    }
  }

  planFile(path, node, plan) {
    const key = path.toLowerCase();
    if (plan.seenPaths.has(key)) return;
    plan.seenPaths.add(key);

    const entry = this.lookupEntry(path);
    if (!entry) {
      plan.files.push({ path, node, action: "create" });
      return;
    }
    if (entry instanceof TFolder) {
      plan.errors.push(t("errors.fileOccupied", path));
      return;
    }
    plan.files.push({ path, node, entry, action: "conflict" });
  }

  indexFileName(node) {
    if (this.settings.folderIndexName === "readme") return "README.md";
    return node.name.replace(/\.md$/i, "") + ".md";
  }

  /* ---------------- 模板 ---------------- */

  async prepareTemplates() {
    this._template = null;
    this._indexTemplate = null;

    if (this.settings.contentMode === "template") {
      const ok = await this.loadTemplate(
        this.settings.templatePath,
        "_template",
        t("labels.template")
      );
      if (!ok) return false;
    }
    if (this.settings.folderIndexEnabled && this.settings.indexContentMode === "template") {
      const ok = await this.loadTemplate(
        this.settings.indexTemplatePath,
        "_indexTemplate",
        t("labels.indexTemplate")
      );
      if (!ok) return false;
    }
    return true;
  }

  async loadTemplate(pathValue, field, label) {
    const path = normalizeVaultPath(pathValue || "");
    if (!path) {
      new Notice(t("notice.templateModeNoFile", label));
      return false;
    }
    const entry = this.app.vault.getAbstractFileByPath(path);
    if (!(entry instanceof TFile)) {
      new Notice(t("notice.templateMissing", label));
      return false;
    }
    try {
      this[field] = await this.app.vault.cachedRead(entry);
      return true;
    } catch (error) {
      new Notice(
        t("notice.templateError", label, error && error.message ? error.message : String(error))
      );
      return false;
    }
  }

  /* ---------------- 执行 ---------------- */

  async executePlan(plan, missingBase) {
    const stats = { folders: 0, reused: 0, files: 0, overwrites: 0, skipped: 0, failed: 0 };

    for (const path of missingBase) {
      try {
        await this.app.vault.createFolder(path);
        stats.folders += 1;
      } catch (error) {
        plan.errors.push(t("errors.makeBase", path, error.message));
        stats.failed += 1;
        return stats;
      }
    }

    for (const item of plan.folders) {
      if (item.action === "reuse") {
        stats.reused += 1;
        continue;
      }
      try {
        await this.app.vault.createFolder(item.path);
        stats.folders += 1;
      } catch (error) {
        plan.errors.push(t("errors.makeFolder", item.path, error.message));
        stats.failed += 1;
      }
    }

    for (const item of plan.files) {
      if (item.action === "skip") {
        stats.skipped += 1;
        continue;
      }
      try {
        const parentPath = parentOf(item.path);
        const content = this.renderContent(item.node, parentPath, item.path);

        if (item.action === "overwrite") {
          const entry = item.entry || this.app.vault.getAbstractFileByPath(item.path);
          await this.app.vault.process(entry, () => content);
          stats.overwrites += 1;
        } else {
          await this.app.vault.create(item.path, content);
          stats.files += 1;
        }
      } catch (error) {
        plan.errors.push(t("errors.makeFile", item.path, error.message));
        stats.failed += 1;
      }
    }

    return stats;
  }

  renderContent(node, parentPath, fullPath) {
    const settings = this.settings;
    const mode = node.isIndex ? settings.indexContentMode : settings.contentMode;
    if (mode === "blank") return "";

    let text;
    if (mode === "text") {
      text = node.isIndex ? settings.indexContentText : settings.contentText;
    } else {
      text = (node.isIndex ? this._indexTemplate : this._template) || "";
    }
    const replace = node.isIndex
      ? settings.indexReplacePlaceholders
      : settings.replacePlaceholders;
    if (!replace) return text;

    const now = new Date();
    const title = node.name.replace(/\.md$/i, "");
    const actualFolderName = parentPath ? parentPath.split("/").pop() : "";
    const folderName = actualFolderName;
    const dateValue = formatDateValue(now, settings);
    const timeValue = formatTimeValue(now, settings);
    const values = {
      title,
      folderName,
      parentName: actualFolderName,
      folder: parentPath,
      path: fullPath,
      date: dateValue,
      time: timeValue,
      datetime: settings.includeTime ? dateValue + " " + timeValue : dateValue,
    };

    for (const key of Object.keys(values)) {
      const pattern = new RegExp("\\{\\{\\s*" + key + "\\s*\\}\\}", "gi");
      text = text.replace(pattern, () => values[key]);
    }

    return text;
  }

  report(warnings, errors, stats) {
    const lines = [
      t("report.title"),
      t("report.folders", stats.folders),
      t("report.files", stats.files),
      t("report.reused", stats.reused),
      t("report.overwritten", stats.overwrites),
      t("report.skipped", stats.skipped),
      t("report.failed", stats.failed),
    ];

    if (warnings.length) {
      lines.push(t("report.warnings", warnings.length, warnings[0]));
    }
    if (errors.length) {
      lines.push(t("report.errors", errors[0]));
    }

    new Notice(lines.join("\n"), 8000);

    if (warnings.length) console.warn("[folder-forge] warnings", warnings);
    if (errors.length) console.error("[folder-forge] errors", errors);
  }
}

/* ------------------------------------------------------------------ */
/* 设置页                                                               */
/* ------------------------------------------------------------------ */

class FolderForgeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const scroller = getScrollParent(containerEl);
    const scrollTop = scroller ? scroller.scrollTop : 0;

    containerEl.empty();

    /* 生成位置 */
    new Setting(containerEl).setName(t("settings.location")).setHeading();

    let basePathInput = null;
    new Setting(containerEl)
      .setName(t("settings.basePath"))
      .setDesc(t("settings.basePathDesc"))
      .addText((text) => {
        basePathInput = text;
        text
          .setPlaceholder(t("settings.basePathPlaceholder"))
          .setValue(settings.basePath)
          .onChange(async (value) => {
            settings.basePath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass("folder-forge-path-input");
      })
      .addButton((button) => {
        button.setButtonText(t("settings.chooseFolder")).onClick(() => {
          new FolderSuggestModal(this.app, async (path) => {
            settings.basePath = path;
            await this.plugin.saveSettings();
            if (basePathInput) basePathInput.setValue(path);
          }).open();
        });
      });

    /* 创建内容 */
    new Setting(containerEl).setName(t("settings.create")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.mode"))
      .setDesc(modeLabel(settings.createType))
      .addDropdown((dropdown) => {
        for (const key of MODE_ORDER) {
          dropdown.addOption(key, modeLabel(key));
        }
        dropdown.setValue(settings.createType).onChange(async (value) => {
          settings.createType = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const mode = settings.createType;
    const structureSetting = new Setting(containerEl)
      .setName(modeTitle(mode))
      .setDesc(descriptionFragment(modeDesc(mode)))
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder(modeExample(mode))
          .setValue(settings[MODE_KEYS[mode]] || "")
          .onChange(async (value) => {
            settings[MODE_KEYS[mode]] = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.addClass("folder-forge-textarea");
        textArea.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Tab") handleTabKey(textArea.inputEl, event);
        });
      });
    structureSetting.settingEl.addClass("folder-forge-structure-setting");

    /* 文件内容 */
    new Setting(containerEl).setName(t("settings.fileContent")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.contentSource"))
      .setDesc(t("settings.contentSourceDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("blank", t("settings.blankFile"))
          .addOption("text", t("settings.customText"))
          .addOption("template", t("settings.templateFile"))
          .setValue(settings.contentMode)
          .onChange(async (value) => {
            settings.contentMode = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (settings.contentMode === "text") {
      new Setting(containerEl)
        .setName(t("settings.textContent"))
        .setDesc(t("settings.textContentDesc"))
        .addTextArea((textArea) => {
          textArea
            .setPlaceholder(t("settings.textContentPlaceholder"))
            .setValue(settings.contentText)
            .onChange(async (value) => {
              settings.contentText = value;
              await this.plugin.saveSettings();
            });
          textArea.inputEl.addClass("folder-forge-textarea-small");
        });
    }

    if (settings.contentMode === "template") {
      let templateInput = null;
      new Setting(containerEl)
        .setName(t("settings.templateFile"))
        .setDesc(t("settings.templateDesc"))
        .addText((text) => {
          templateInput = text;
          text
            .setPlaceholder(t("settings.templatePlaceholder"))
            .setValue(settings.templatePath)
            .onChange(async (value) => {
              settings.templatePath = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.addClass("folder-forge-path-input");
        })
        .addButton((button) => {
          button.setButtonText(t("settings.choose")).onClick(() => {
            new TemplateSuggestModal(this.app, async (path) => {
              settings.templatePath = path;
              await this.plugin.saveSettings();
              if (templateInput) templateInput.setValue(path);
            }).open();
          });
        })
        .addButton((button) => {
          button.setButtonText(t("settings.confirm")).onClick(() =>
            this.verifyTemplate(settings.templatePath, t("labels.template"))
          );
        });
    }

    if (settings.contentMode !== "blank") {
      new Setting(containerEl)
        .setName(t("settings.replacePlaceholders"))
        .setDesc(descriptionFragment(t("placeholderLines")))
        .addToggle((toggle) => {
          toggle.setValue(settings.replacePlaceholders).onChange(async (value) => {
            settings.replacePlaceholders = value;
            await this.plugin.saveSettings();
          });
        });
    }

    /* 同名与目录 */
    new Setting(containerEl).setName(t("settings.conflictSection")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.conflictName"))
      .setDesc(t("settings.conflictDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", t("settings.ask"))
          .addOption("skip", t("settings.skip"))
          .addOption("overwrite", t("settings.overwrite"))
          .addOption("abort", t("settings.abort"))
          .setValue(settings.onFileConflict)
          .onChange(async (value) => {
            settings.onFileConflict = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.missingBase"))
      .setDesc(t("settings.missingBaseDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", t("settings.ask"))
          .addOption("create", t("settings.createIt"))
          .addOption("abort", t("settings.abort"))
          .setValue(settings.onMissingBase)
          .onChange(async (value) => {
            settings.onMissingBase = value;
            await this.plugin.saveSettings();
          });
      });

    /* 文件夹索引 */
    new Setting(containerEl).setName(t("settings.index")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.indexEnable"))
      .setDesc(t("settings.indexEnableDesc"))
      .addToggle((toggle) => {
        toggle.setValue(settings.folderIndexEnabled).onChange(async (value) => {
          settings.folderIndexEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (settings.folderIndexEnabled) {
      new Setting(containerEl).setName(t("settings.indexName")).addDropdown((dropdown) => {
        dropdown
          .addOption("same", t("settings.indexSame"))
          .addOption("readme", "README.md")
          .setValue(settings.folderIndexName)
          .onChange(async (value) => {
            settings.folderIndexName = value;
            await this.plugin.saveSettings();
          });
      });

      new Setting(containerEl)
        .setName(t("settings.indexScope"))
        .setDesc(t("settings.indexScopeDesc"))
        .addDropdown((dropdown) => {
          dropdown
            .addOption("all", t("settings.scopeAll"))
            .addOption("bottom", t("settings.scopeBottom"))
            .addOption("top", t("settings.scopeTop"))
            .setValue(settings.folderIndexScope)
            .onChange(async (value) => {
              settings.folderIndexScope = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl).setName(t("settings.indexContent")).setHeading();

      new Setting(containerEl)
        .setName(t("settings.indexSource"))
        .setDesc(t("settings.indexSourceDesc"))
        .addDropdown((dropdown) => {
          dropdown
            .addOption("blank", t("settings.blankFile"))
            .addOption("text", t("settings.customText"))
            .addOption("template", t("settings.templateFile"))
            .setValue(settings.indexContentMode)
            .onChange(async (value) => {
              settings.indexContentMode = value;
              await this.plugin.saveSettings();
              this.display();
            });
        });

      if (settings.indexContentMode === "text") {
        new Setting(containerEl)
          .setName(t("settings.indexText"))
          .setDesc(t("settings.indexTextDesc"))
          .addTextArea((textArea) => {
            textArea
              .setPlaceholder(t("settings.indexTextPlaceholder"))
              .setValue(settings.indexContentText)
              .onChange(async (value) => {
                settings.indexContentText = value;
                await this.plugin.saveSettings();
              });
            textArea.inputEl.addClass("folder-forge-textarea-small");
          });
      }

      if (settings.indexContentMode === "template") {
        let indexTemplateInput = null;
        new Setting(containerEl)
          .setName(t("settings.indexTemplate"))
          .setDesc(t("settings.indexTemplateDesc"))
          .addText((text) => {
            indexTemplateInput = text;
            text
              .setPlaceholder(t("settings.templatePlaceholder"))
              .setValue(settings.indexTemplatePath)
              .onChange(async (value) => {
                settings.indexTemplatePath = value;
                await this.plugin.saveSettings();
              });
            text.inputEl.addClass("folder-forge-path-input");
          })
          .addButton((button) => {
            button.setButtonText(t("settings.choose")).onClick(() => {
              new TemplateSuggestModal(this.app, async (path) => {
                settings.indexTemplatePath = path;
                await this.plugin.saveSettings();
                if (indexTemplateInput) indexTemplateInput.setValue(path);
              }).open();
            });
          })
          .addButton((button) => {
            button.setButtonText(t("settings.confirm")).onClick(() =>
              this.verifyTemplate(settings.indexTemplatePath, t("labels.indexTemplate"))
            );
          });
      }

      if (settings.indexContentMode !== "blank") {
        new Setting(containerEl)
          .setName(t("settings.replacePlaceholders"))
          .setDesc(descriptionFragment(t("placeholderLines")))
          .addToggle((toggle) => {
            toggle
              .setValue(settings.indexReplacePlaceholders)
              .onChange(async (value) => {
                settings.indexReplacePlaceholders = value;
                await this.plugin.saveSettings();
              });
          });
      }
    }

    /* 日期与时间 */
    new Setting(containerEl).setName(t("settings.datetime")).setHeading();

    const sampleText = () => {
      const now = new Date();
      const date = formatDateValue(now, settings);
      const time = formatTimeValue(now, settings);
      const datetime = settings.includeTime ? date + " " + time : date;
      return (
        "{{date}} = " + date + "    {{time}} = " + time + "    {{datetime}} = " + datetime
      );
    };
    let refreshSample = () => {};

    new Setting(containerEl)
      .setName(t("settings.dateOrder"))
      .setDesc(t("settings.dateOrderDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ymd", t("settings.orderYmd"))
          .addOption("mdy", t("settings.orderMdy"))
          .addOption("dmy", t("settings.orderDmy"))
          .setValue(settings.dateOrder)
          .onChange(async (value) => {
            settings.dateOrder = value;
            await this.plugin.saveSettings();
            refreshSample();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.dateSep"))
      .setDesc(t("settings.dateSepDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("-", t("settings.sepDash"))
          .addOption("/", t("settings.sepSlash"))
          .addOption(".", t("settings.sepDot"))
          .addOption("space", t("settings.sepSpace"))
          .addOption("zh", t("settings.sepZh"))
          .setValue(settings.dateSeparator)
          .onChange(async (value) => {
            settings.dateSeparator = value;
            await this.plugin.saveSettings();
            refreshSample();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.monthStyle"))
      .setDesc(t("settings.monthStyleDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("number", t("settings.monthNumber"))
          .addOption("short", t("settings.monthShort"))
          .addOption("long", t("settings.monthLong"))
          .setValue(settings.monthStyle || "number")
          .onChange(async (value) => {
            settings.monthStyle = value;
            await this.plugin.saveSettings();
            refreshSample();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.includeTime"))
      .setDesc(t("settings.includeTimeDesc"))
      .addToggle((toggle) => {
        toggle.setValue(settings.includeTime).onChange(async (value) => {
          settings.includeTime = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (settings.includeTime) {
      new Setting(containerEl)
        .setName(t("settings.timePrecision"))
        .addDropdown((dropdown) => {
          dropdown
            .addOption("minute", t("settings.precisionMinute"))
            .addOption("second", t("settings.precisionSecond"))
            .setValue(settings.timePrecision)
            .onChange(async (value) => {
              settings.timePrecision = value;
              await this.plugin.saveSettings();
              refreshSample();
            });
        });

      new Setting(containerEl)
        .setName(t("settings.timeSep"))
        .addDropdown((dropdown) => {
          dropdown
            .addOption(":", t("settings.timeSepColon"))
            .addOption(".", t("settings.timeSepDot"))
            .setValue(settings.timeSeparator)
            .onChange(async (value) => {
              settings.timeSeparator = value;
              await this.plugin.saveSettings();
              refreshSample();
            });
        });
    }

    const sampleSetting = new Setting(containerEl)
      .setName(t("settings.sample"))
      .setDesc(sampleText());
    refreshSample = () => sampleSetting.setDesc(sampleText());

    /* 操作 */
    new Setting(containerEl).setName(t("settings.actions")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.showRibbon"))
      .setDesc(t("settings.showRibbonDesc"))
      .addToggle((toggle) => {
        toggle.setValue(settings.showRibbon !== false).onChange(async (value) => {
          settings.showRibbon = value;
          await this.plugin.saveSettings();
          this.plugin.applyRibbon();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.runNow"))
      .setDesc(t("settings.runNowDesc"))
      .addButton((button) => {
        button
          .setButtonText(t("settings.runButton"))
          .setCta()
          .onClick(() => this.plugin.runCreate());
      });

    if (scroller) {
      scroller.scrollTop = scrollTop;
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          scroller.scrollTop = scrollTop;
        });
      }
    }
  }

  async verifyTemplate(pathValue, label) {
    const name = label || t("labels.template");
    const path = normalizeVaultPath(pathValue || "");
    if (!path) {
      new Notice(t("verify.choose", name));
      return;
    }

    const entry = this.app.vault.getAbstractFileByPath(path);
    if (!(entry instanceof TFile)) {
      new Notice(t("notice.templateMissing", name));
      return;
    }

    try {
      const content = await this.app.vault.cachedRead(entry);
      new Notice(t("verify.read", path, content.length));
    } catch (error) {
      new Notice(t("notice.templateMissing", name));
    }
  }
}

/* ------------------------------------------------------------------ */

module.exports = FolderForgePlugin;
module.exports.default = FolderForgePlugin;
module.exports.__internals = {
  parseIndentedTree,
  parseItemList,
  sanitizeName,
  normalizeVaultPath,
  annotateTree,
  indexScopeMatches,
  assignKinds,
  parentOf,
  handleTabKey,
  descriptionFragment,
  formatDateValue,
  formatTimeValue,
  setLanguage,
  detectLanguage,
  t,
  modeLabel,
  modeName,
};
