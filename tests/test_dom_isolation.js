#!/usr/bin/env node
/**
 * 零外部依赖 DOM 隔离与翻译引擎回归测试套件。
 * 直接在 Node vm 中加载真实 locales/zh-CN.json 与 engine/dom-translator.js，
 * 验证 2.34.0 对话 Markdown 隔离、斜杠/@ 菜单防护、侧边栏自定义标题保护、
 * Swarm 伴生面板汉化与成员/消息隔离、Shadow DOM 及无 value <option> 保护。
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LOCALE_PATH = path.join(ROOT, 'locales', 'zh-CN.json');
const ENGINE_PATH = path.join(ROOT, 'engine', 'dom-translator.js');

const NodeFilter = {
  SHOW_ELEMENT: 1,
  SHOW_TEXT: 4,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
};

function splitTopLevelCommas(selector) {
  const parts = [];
  let cur = '';
  let bracket = 0;
  let paren = 0;
  let quote = '';
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      cur += ch;
      if (ch === quote && selector[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === '[') {
      bracket++;
      cur += ch;
    } else if (ch === ']') {
      bracket--;
      cur += ch;
    } else if (ch === '(') {
      paren++;
      cur += ch;
    } else if (ch === ')') {
      paren--;
      cur += ch;
    } else if (ch === ',' && bracket === 0 && paren === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function matchSimpleSelector(el, simple) {
  if (!el || el.nodeType !== 1) return false;
  let rest = simple.trim();
  if (!rest) return false;

  const tagMatch = rest.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tagMatch) {
    if (el.tagName !== tagMatch[0].toUpperCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }

  while (rest.length > 0) {
    if (rest[0] === '.') {
      const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m) return false;
      if (!el.classList.contains(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === '#') {
      const m = rest.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m) return false;
      if (el.getAttribute('id') !== m[1]) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === '[') {
      const end = rest.indexOf(']');
      if (end === -1) return false;
      const body = rest.slice(1, end).trim();
      rest = rest.slice(end + 1);
      const kv = body.match(/^([a-zA-Z0-9_-]+)(?:(\^=|=)(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?$/);
      if (!kv) return false;
      const attrName = kv[1];
      const op = kv[2];
      const expected = kv[3] !== undefined ? kv[3] : kv[4] !== undefined ? kv[4] : kv[5];
      if (!el.hasAttribute(attrName)) return false;
      if (op === '=' && el.getAttribute(attrName) !== expected) return false;
      if (op === '^=' && !(el.getAttribute(attrName) || '').startsWith(expected)) return false;
    } else {
      return false;
    }
  }
  return true;
}

function matchCompoundSelector(el, compound) {
  const tokens = compound.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (!matchSimpleSelector(el, tokens[tokens.length - 1])) return false;
  let idx = tokens.length - 2;
  let cur = el.parentElement;
  while (idx >= 0 && cur) {
    if (matchSimpleSelector(cur, tokens[idx])) {
      idx--;
    }
    cur = cur.parentElement;
  }
  return idx < 0;
}

function matchesSelector(el, selectorList) {
  const list = splitTopLevelCommas(selectorList);
  for (let i = 0; i < list.length; i++) {
    if (matchCompoundSelector(el, list[i])) return true;
  }
  return false;
}

class FakeNode {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentNode = null;
    this.childNodes = [];
    this.isConnected = true;
  }
  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  get previousSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1] : null;
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx >= 0 && idx + 1 < this.parentNode.childNodes.length ? this.parentNode.childNodes[idx + 1] : null;
  }
  get previousElementSibling() {
    let p = this.previousSibling;
    while (p && p.nodeType !== 1) p = p.previousSibling;
    return p;
  }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  get textContent() {
    if (this.nodeType === 3) return this.nodeValue;
    return this.childNodes.map((c) => c.textContent).join('');
  }
}

class FakeText extends FakeNode {
  constructor(val) {
    super(3);
    this.nodeValue = String(val);
  }
}

class FakeElement extends FakeNode {
  constructor(tag, attrs = {}, children = []) {
    super(1);
    this.tagName = tag.toUpperCase();
    this._attrs = Object.create(null);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) this._attrs[k] = String(v);
    }
    this.shadowRoot = null;
    this.classList = {
      contains: (cls) => (this._attrs.class || '').split(/\s+/).includes(cls),
    };
    for (const ch of children) {
      this.appendChild(typeof ch === 'string' ? new FakeText(ch) : ch);
    }
  }
  hasAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this._attrs, k);
  }
  getAttribute(k) {
    return this.hasAttribute(k) ? this._attrs[k] : null;
  }
  setAttribute(k, v) {
    this._attrs[k] = String(v);
  }
  get lang() {
    return this.getAttribute('lang') || '';
  }
  set lang(v) {
    this.setAttribute('lang', v);
  }
  matches(sel) {
    return matchesSelector(this, sel);
  }
  closest(sel) {
    let p = this;
    while (p && p.nodeType === 1) {
      if (p.matches(sel)) return p;
      p = p.parentElement;
    }
    return null;
  }
  attachShadow(init) {
    const sr = new FakeNode(11);
    sr.mode = init && init.mode ? init.mode : 'open';
    sr.host = this;
    this.shadowRoot = sr;
    return sr;
  }
}

function createTreeWalker(root, whatToShow, filter) {
  const flat = [];
  function visit(node) {
    for (const child of node.childNodes) {
      let accept = NodeFilter.FILTER_ACCEPT;
      if (filter && typeof filter.acceptNode === 'function') {
        accept = filter.acceptNode(child);
      }
      if (accept === NodeFilter.FILTER_REJECT) continue;
      const want =
        (child.nodeType === 1 && (whatToShow & NodeFilter.SHOW_ELEMENT)) ||
        (child.nodeType === 3 && (whatToShow & NodeFilter.SHOW_TEXT));
      if (want && accept === NodeFilter.FILTER_ACCEPT) flat.push(child);
      if (child.nodeType === 1) visit(child);
    }
  }
  visit(root);
  let pos = -1;
  return {
    nextNode() {
      pos++;
      return pos < flat.length ? flat[pos] : null;
    },
  };
}

function runEngineOnDom(bodyChildren) {
  const locale = JSON.parse(fs.readFileSync(LOCALE_PATH, 'utf8'));
  const engineSrc = fs.readFileSync(ENGINE_PATH, 'utf8');
  const htmlEl = new FakeElement('html', { lang: 'en' });
  const bodyEl = new FakeElement('body', {}, bodyChildren);
  htmlEl.appendChild(bodyEl);

  const documentObj = {
    readyState: 'complete',
    documentElement: htmlEl,
    body: bodyEl,
    title: 'Settings',
    addEventListener: () => {},
    createElement: (tag) => new FakeElement(tag),
    createTreeWalker,
  };

  const sandbox = {
    __AG_ZH_LOCALE__: locale,
    window: { addEventListener: () => {} },
    document: documentObj,
    Element: FakeElement,
    NodeFilter,
    MutationObserver: function () {
      return { observe: () => {} };
    },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval,
    requestAnimationFrame: (fn) => fn(),
    console,
    String,
    RegExp,
    Object,
    Array,
    Set,
    Map,
    WeakMap,
    WeakSet,
    Math,
    Number,
    Error,
    JSON,
    Promise,
  };
  sandbox.self = sandbox.window;
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(engineSrc, sandbox);
  // 连续二次执行验证防重入幂等
  vm.runInNewContext(`if (!window.__AG_ZH_ENGINE_LOADED__) {\n${engineSrc}\n}`, sandbox);
  return { htmlEl, bodyEl, documentObj, windowObj: sandbox.window };
}

const el = (tag, attrs, ...children) => new FakeElement(tag, attrs, children);

function runTests() {
  // 1. 常规 UI + lang="zh-CN"
  const normalBtn = el('button', { title: 'Settings' }, 'Settings');

  // 2. 2.34.0 data-markdown-root 对话正文隔离 vs 内部按钮放行 vs 非对话 Markdown 正常翻
  const chatProseText = new FakeText('Settings');
  const chatInnerBtnText = new FakeText('Copy');
  const chatAlertTitleText = new FakeText('Warning');
  const userActionTimeText = new FakeText('19m ago');
  const userMsgProseText = new FakeText('Settings');
  const convView = el(
    'div',
    { 'data-testid': 'conversation-view' },
    el(
      'div',
      { 'data-testid': 'agent-response' },
      el(
        'div',
        { 'data-markdown-root': '' },
        el('p', {}, chatProseText),
        el('button', {}, chatInnerBtnText),
        el('div', { class: 'markdown-alert-title' }, chatAlertTitleText)
      )
    ),
    el(
      'div',
      { 'data-testid': 'user-input-step' },
      el('div', { 'data-testid': 'user-message' }, el('div', { 'data-markdown-root': '' }, el('p', {}, userMsgProseText))),
      el('div', { 'data-testid': 'user-message-actions' }, el('span', {}, userActionTimeText))
    )
  );
  const nonChatMdText = new FakeText('Settings');
  const settingsPageMd = el('div', { 'data-testid': 'settings-panel' }, el('div', { 'data-markdown-root': '' }, el('p', {}, nonChatMdText)));

  // 3. 语音实时转录正文隔离 vs 工作状态行放行
  const transcriptSpeechText = new FakeText('Settings');
  const transcriptWorkText = new FakeText('Thinking');
  const liveTranscript = el(
    'ol',
    { 'data-testid': 'live-transcript' },
    el('li', {}, el('p', { 'data-testid': 'transcript-line-text' }, transcriptSpeechText)),
    el('li', { 'data-testid': 'transcript-work-line' }, transcriptWorkText)
  );

  // 4. 斜杠/@ 提及菜单：命令名保护 vs 分类行放行
  const slashCmdLabel = new FakeText('Settings');
  const mentionCatLabel = new FakeText('Rules');
  const slashMenu = el(
    'div',
    {},
    el('div', {}, el('span', { 'data-testid': 'menu-option-label' }, slashCmdLabel)),
    el('div', { 'data-testid': 'menu-category-row' }, el('span', { 'data-testid': 'menu-option-label' }, mentionCatLabel))
  );

  // 5. 侧边栏自定义会话标题/项目名保护 vs 固定占位符放行 vs 行内操作按钮放行
  const customConvTitle = new FakeText('Settings');
  const customConvLink = el('a', { 'aria-label': 'Settings' });
  const placeholderConvTitle = new FakeText('New conversation');
  const stopBtn = el('button', { 'aria-label': 'Stop execution' });
  const customProjectLabel = new FakeText('Settings');
  const systemProjectLabel = new FakeText('Standalone Conversations');
  const sidebar = el(
    'div',
    { 'data-testid': 'conversation-list-sidebar' },
    el(
      'div',
      { 'data-testid': 'conversation-row-sidebar' },
      customConvLink,
      el('span', { class: 'truncate text-left w-full' }, customConvTitle),
      stopBtn
    ),
    el(
      'div',
      { 'data-testid': 'conversation-row-sidebar' },
      el('span', { class: 'truncate text-left w-full' }, placeholderConvTitle)
    ),
    el('button', { 'data-testid': 'project-header', 'data-project-card': 'true' }, el('span', { class: 'truncate' }, customProjectLabel)),
    el('button', { 'data-testid': 'project-header', 'data-project-card': 'true' }, el('span', { class: 'truncate' }, systemProjectLabel))
  );

  // 6. Swarm 面板汉化 + 短词作用域限定 + 成员/发言正文隔离 + Swarm 自定义标题保护
  const mainWorldBoardText = new FakeText('Board');
  const swarmTabBoard = new FakeText('Board');
  const swarmTabMembers = new FakeText('Members');
  const swarmDynamicMeta = new FakeText('12 posts · 4 members');
  const swarmAlertErr = new FakeText('@worker-1 hit an error');
  const swarmExportBtn = new FakeText('Export GIF');
  const swarmCustomTitle = new FakeText('Settings');
  const swarmUntitled = new FakeText('Untitled swarm');
  const swarmMsgBody = new FakeText('Board');
  const swarmMemberAuthor = new FakeText('Members');
  const swarmHiveNow = new FakeText('Settings');
  const swarmBoard = el(
    'div',
    { 'data-testid': 'swarm-board' },
    el('h1', { 'data-testid': 'swarm-title' }, swarmCustomTitle),
    el('h1', { 'data-testid': 'swarm-title' }, swarmUntitled),
    el('button', {}, swarmTabBoard),
    el('button', {}, swarmTabMembers),
    el('div', {}, swarmDynamicMeta),
    el('div', {}, swarmAlertErr),
    el('button', {}, swarmExportBtn),
    el('div', { class: 'msg-body' }, swarmMsgBody),
    el('span', { class: 'msg-author' }, swarmMemberAuthor),
    el('div', { class: 'o2-mnow' }, swarmHiveNow)
  );

  // 7. 代码块、无 value <option> 与 Shadow DOM 穿透
  const codeText = new FakeText('Settings');
  const codeBlock = el('pre', {}, el('code', {}, codeText));
  const optNoValText = new FakeText('Settings');
  const optWithValText = new FakeText('Settings');
  const selectEl = el('select', {}, el('option', {}, optNoValText), el('option', { value: 'settings' }, optWithValText));
  const shadowHost = el('div', {});
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  const shadowBtnText = new FakeText('Settings');
  shadowRoot.appendChild(el('button', {}, shadowBtnText));

  // 8. v1.5.14 Sentence-case 设置项、Inbox 模式与动态模板
  const v1514Setting = new FakeText('Automatic check for updates');
  const v1514Inbox = new FakeText('Inbox Mode');
  const v1514MoveModal = new FakeText('Move this conversation to "Backend"?');
  const v1514ModelsSel = new FakeText('3 models selected');
  const v1514NativeLang = new FakeText('Deutsch');

  const { htmlEl, documentObj } = runEngineOnDom([
    normalBtn,
    convView,
    settingsPageMd,
    liveTranscript,
    slashMenu,
    sidebar,
    el('span', {}, mainWorldBoardText),
    swarmBoard,
    codeBlock,
    selectEl,
    shadowHost,
    el('div', {}, v1514Setting, v1514Inbox, v1514MoveModal, v1514ModelsSel, v1514NativeLang),
  ]);

  // 断言 1：基础与 lang
  assert.strictEqual(htmlEl.getAttribute('lang'), 'zh-CN', '应设置 html lang="zh-CN"');
  assert.strictEqual(normalBtn.textContent, '设置', '普通按钮应正常翻译');
  assert.strictEqual(normalBtn.getAttribute('title'), '设置', '普通 title 属性应正常翻译');
  assert.strictEqual(documentObj.title, '设置', 'document.title 应正常翻译');

  // 断言 2：data-markdown-root 作用域隔离与内部 UI 放行
  assert.strictEqual(chatProseText.nodeValue, 'Settings', 'agent-response 下的 data-markdown-root 正文不得被翻译');
  assert.strictEqual(userMsgProseText.nodeValue, 'Settings', 'user-message 下的 data-markdown-root 正文不得被翻译');
  assert.strictEqual(chatInnerBtnText.nodeValue, '复制', 'Markdown 内部按钮应放行翻译');
  assert.strictEqual(chatAlertTitleText.nodeValue, '警告', 'Markdown Alert 标题应放行翻译');
  assert.notStrictEqual(userActionTimeText.nodeValue, '19m ago', 'user-message-actions 时间戳应放行翻译');
  assert.strictEqual(nonChatMdText.nodeValue, '设置', '非对话区的 data-markdown-root 说明页不应被误杀');

  // 断言 3：语音转录正文隔离 vs 工作行放行
  assert.strictEqual(transcriptSpeechText.nodeValue, 'Settings', 'transcript-line-text 语音正文不得被翻译');
  assert.strictEqual(transcriptWorkText.nodeValue, '思考中', 'transcript-work-line 状态行应放行翻译');

  // 断言 4：斜杠/@ 菜单隔离
  assert.strictEqual(slashCmdLabel.nodeValue, 'Settings', '非分类行的 menu-option-label 命令/文件名不得被翻译');
  assert.strictEqual(mentionCatLabel.nodeValue, '规则', 'menu-category-row 分类行应正常翻译');

  // 断言 5：侧边栏自定义会话标题/项目名保护
  assert.strictEqual(customConvTitle.nodeValue, 'Settings', '自定义会话标题不得被翻译');
  assert.strictEqual(customConvLink.getAttribute('aria-label'), 'Settings', '自定义会话链接 aria-label 不得被翻译');
  assert.strictEqual(placeholderConvTitle.nodeValue, '新建对话', '固定占位会话名应正常翻译');
  assert.strictEqual(stopBtn.getAttribute('aria-label'), '停止执行', '会话行内停止按钮 aria-label 应正常翻译');
  assert.strictEqual(customProjectLabel.nodeValue, 'Settings', '自定义项目名不得被翻译');
  assert.notStrictEqual(systemProjectLabel.nodeValue, 'Standalone Conversations', '系统固定分组名应正常翻译');

  // 断言 6：Swarm 面板翻译 + 隔离 + 非 Swarm 零短词污染
  assert.strictEqual(mainWorldBoardText.nodeValue, 'Board', '非 Swarm 区域的 Board 不得受 Swarm 短词影响');
  assert.strictEqual(swarmTabBoard.nodeValue, '公告板', 'Swarm 面板 Board 标签应翻译为公告板');
  assert.strictEqual(swarmTabMembers.nodeValue, '成员', 'Swarm 面板 Members 标签应翻译为成员');
  assert.strictEqual(swarmDynamicMeta.nodeValue, '12 条消息 · 4 名成员', 'Swarm 动态统计句应正确翻译');
  assert.strictEqual(swarmAlertErr.nodeValue, '@worker-1 发生错误', 'Swarm 动态告警应正确翻译');
  assert.strictEqual(swarmExportBtn.nodeValue, '导出 GIF', 'Swarm Export GIF 应正确翻译');
  assert.strictEqual(swarmCustomTitle.nodeValue, 'Settings', 'Swarm 自定义标题不得被翻译');
  assert.strictEqual(swarmUntitled.nodeValue, '未命名 Swarm', 'Swarm 占位标题应正常翻译');
  assert.strictEqual(swarmMsgBody.nodeValue, 'Board', 'Swarm 消息正文 .msg-body 不得被翻译');
  assert.strictEqual(swarmMemberAuthor.nodeValue, 'Members', 'Swarm 成员名 .msg-author 不得被翻译');
  assert.strictEqual(swarmHiveNow.nodeValue, 'Settings', 'Swarm Hive 动态正文 .o2-mnow 不得被翻译');

  // 断言 7：代码、无 value <option>、Shadow DOM
  assert.strictEqual(codeText.nodeValue, 'Settings', '代码块内文本不得被翻译');
  assert.strictEqual(optNoValText.nodeValue, 'Settings', '无显式 value 的 <option> 不得被翻译');
  assert.strictEqual(optWithValText.nodeValue, '设置', '有显式 value 的 <option> 应正常翻译');
  assert.strictEqual(shadowBtnText.nodeValue, '设置', '开放式 Shadow DOM 内部元素应正常翻译');

  // 断言 8：v1.5.14 新增设置、Inbox 模式、动态模板与母语自称白名单
  assert.strictEqual(v1514Setting.nodeValue, '自动检查更新', 'v1.5.14 Sentence-case 设置项应正常翻译');
  assert.strictEqual(v1514Inbox.nodeValue, '收件箱模式', 'v1.5.14 Inbox Mode 应正常翻译');
  assert.strictEqual(v1514MoveModal.nodeValue, '要将此对话移至“Backend”吗？', 'v1.5.14 移动对话弹窗模板应正常翻译');
  assert.strictEqual(v1514ModelsSel.nodeValue, '已选择 3 个模型', 'v1.5.14 多模型计数模板应正常翻译');
  assert.strictEqual(v1514NativeLang.nodeValue, 'Deutsch', '语种母语自称应保留原名');

  console.log('DOM 隔离与翻译引擎回归测试全部通过 (30/30 断言)');
}

runTests();
