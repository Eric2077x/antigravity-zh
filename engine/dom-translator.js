/**
 * Antigravity v2.15+ Chinese Localization Engine (DOM & Shadow DOM Translator)
 * Injected into dist/preload.js by patcher.py alongside __AG_ZH_LOCALE__.
 *
 * Security & Compatibility Guarantees:
 * - Pure textNode.nodeValue & safe attribute updates (zero innerHTML/eval/XSS surface)
 * - Compatible with Electron contextIsolation: true (no main-world prototype pollution)
 * - Protects code blocks, built-in .code-line diff/file viewers, Monaco, xterm, Lexical editors,
 *   file/branch names, and AI/user chat Markdown prose from accidental translation
 * - Uses NodeFilter.FILTER_REJECT and O(1) node caching to avoid CPU spikes during AI streaming
 */
(function () {
  if (typeof window === 'undefined' || window.__AG_ZH_ENGINE_LOADED__) return;
  try {
    Object.defineProperty(window, '__AG_ZH_ENGINE_LOADED__', {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  } catch (_) {
    window.__AG_ZH_ENGINE_LOADED__ = true;
  }

  const LOCALE =
    typeof __AG_ZH_LOCALE__ !== 'undefined'
      ? __AG_ZH_LOCALE__
      : { exact: {}, fragments: [] };
  const DICT = LOCALE.exact || {};
  const FRAGMENTS = LOCALE.fragments || [];

  // 使用自有属性安全查找，杜绝 constructor/toString 等原型属性泄漏
  function ownLookup(obj, key) {
    return obj && key && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
  }

  const STATUS_MAP = Object.assign(Object.create(null), {
    Working: '工作中',
    Thinking: '思考中',
    Generating: '生成中',
    Waiting: '等待中',
    Idle: '空闲',
    Completed: '已完成',
    Done: '已完成',
    Failed: '失败',
    Error: '错误',
    Errored: '出错',
    Cancelled: '已取消',
    Canceled: '已取消',
    Paused: '已暂停',
    Running: '运行中',
    Connecting: '连接中',
    Connected: '已连接',
    Disconnected: '已断开',
    Queued: '排队中',
    Loading: '加载中',
    Starting: '启动中',
    Stopping: '停止中',
    Pending: '待处理',
    Success: '成功',
    Ready: '就绪',
  });

  function translateDuration(durStr) {
    if (!durStr) return durStr;
    return durStr
      .replace(/(\d+)\s*days?\b/gi, '$1 天')
      .replace(/(\d+)\s*hours?\b/gi, '$1 小时')
      .replace(/(\d+)\s*hr?s?\b/gi, '$1 小时')
      .replace(/(\d+)\s*minutes?\b/gi, '$1 分钟')
      .replace(/(\d+)\s*mins?\b/gi, '$1 分钟')
      .replace(/(\d+)\s*seconds?\b/gi, '$1 秒')
      .replace(/(\d+)\s*secs?\b/gi, '$1 秒')
      .replace(/(^|\s)<\s*1s\b/gi, '$1< 1 秒')
      .replace(/(^|\s)<\s*1m\b/gi, '$1< 1 分钟')
      .replace(/(\d+(?:\.\d+)?)d\b/g, '$1 天')
      .replace(/(\d+(?:\.\d+)?)h\b/g, '$1 小时')
      .replace(/(\d+(?:\.\d+)?)m\b/g, '$1 分钟')
      .replace(/(\d+(?:\.\d+)?)s\b/g, '$1 秒')
      .replace(/(\d+)\s*ms\b/g, '$1 毫秒');
  }

  function translateQuotaDuration(durStr) {
    if (!durStr) return durStr;
    let res = durStr
      .trim()
      .replace(/(?:\bless\s+than\s+(?:a|1)\s+minute\b|<\s*1\s*minute\b)/gi, '不到 1 分钟');
    res = translateDuration(res);
    return res.replace(
      /(\d+\s*(?:天|小时|分钟|秒|毫秒))\s*(?:,\s*and\s+|,\s*|\s+and\s+)(?=\d|<|不到)/gi,
      '$1 '
    );
  }

  function translateQuotaWindow(winStr) {
    const raw = (winStr || '').trim();
    const low = raw.toLowerCase().replace(/\s+/g, ' ');
    if (low === 'weekly') return '每周限额';
    if (low === '5-hour' || low === 'five-hour' || low === 'five hour') return '五小时限额';
    if (low === 'daily') return '每日限额';
    if (low === 'monthly') return '每月限额';
    if (low === 'hourly') return '每小时限额';
    const numMatch = low.match(/^(\d+)[-\s]*(hour|hr|day|minute|min|second|sec|h|d|m|s)s?$/);
    if (numMatch) {
      const unitMap = {
        hour: '小时',
        hr: '小时',
        h: '小时',
        day: '天',
        d: '天',
        minute: '分钟',
        min: '分钟',
        m: '分钟',
        second: '秒',
        sec: '秒',
        s: '秒',
      };
      return `${numMatch[1]} ${unitMap[numMatch[2]] || numMatch[2]}限额`;
    }
    return `${raw} 限额`;
  }

  // 思考强度档位映射（供模型选择器、编排器行及模型触发按钮复用）
  const EFFORT_LEVEL_MAP = Object.assign(Object.create(null), {
    minimal: '极低',
    low: '低',
    medium: '中',
    high: '高',
    extra: '超高',
    xhigh: '超高',
    'extra high': '超高',
    'very high': '极高',
    'ultra high': '极高',
    max: '最高',
    maximum: '最高',
  });

  function mapEffortLabel(raw) {
    if (!raw) return null;
    const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    return ownLookup(EFFORT_LEVEL_MAP, key) || null;
  }

  // 仅在模型选择器/编排器/设置模型下拉上下文中翻译模型名附带的思考强度后缀
  function translateModelEffortText(trimmed) {
    if (!trimmed) return null;
    // 1. 纯思考强度或“思考强度 · 上下文窗口”（如 "Extra High"、"Extra High · 1M"、"Max · 200K"）
    const soloMatch = trimmed.match(
      /^(Extra\s+High|Very\s+High|Ultra\s+High|XHigh|Minimal|Low|Medium|High|Extra|Max|Maximum)(?:\s*·\s*(.+))?$/i
    );
    if (soloMatch) {
      const zh = mapEffortLabel(soloMatch[1]);
      if (zh) return soloMatch[2] ? `${zh} · ${soloMatch[2]}` : zh;
    }
    // 2. 括号内思考强度后缀（如 "GPT-OSS 120B (Medium)"、"Gemini 4 Pro (High Thinking)"）
    const parenMatch = trimmed.match(
      /^(.+?)\s*\((Extra\s+High|Very\s+High|Ultra\s+High|XHigh|Minimal|Low|Medium|High|Max|Maximum)(\s+Thinking)?\)$/i
    );
    if (parenMatch) {
      const zh = mapEffortLabel(parenMatch[2]);
      if (zh) return `${parenMatch[1].trim()}（${zh}${parenMatch[3] ? '思考' : ''}）`;
    }
    // 3. 空格拼接思考强度后缀（如编排器行 "Claude Opus 5.5 High"、"Claude Opus 5.5 Extra High"）
    const suffixMatch = trimmed.match(
      /^(.+?)\s+(Extra\s+High|Very\s+High|Ultra\s+High|XHigh|Minimal|Low|Medium|High|Extra|Max|Maximum)(?:\s*·\s*(.+))?$/i
    );
    if (suffixMatch) {
      const zh = mapEffortLabel(suffixMatch[2]);
      if (zh) {
        const base = suffixMatch[1].trim() === 'Orchestrator' ? '编排器' : suffixMatch[1].trim();
        return `${base} ${zh}${suffixMatch[3] ? ` · ${suffixMatch[3]}` : ''}`;
      }
    }
    return null;
  }

  const CORE_TERMS_FALLBACK = Object.assign(Object.create(null), {
    'Best of N': '多路择优',
    'Best-of-N': '多路择优',
    Worktree: '工作树',
    Artifact: '产物',
    Artifacts: '产物',
    Planning: '规划',
    Coordinator: '协调者',
  });

  function dictLookup(str) {
    if (!str) return null;
    const key = str.trim();
    return ownLookup(DICT, key) || ownLookup(STATUS_MAP, key) || ownLookup(CORE_TERMS_FALLBACK, key);
  }

  function translateRelTime(tStr) {
    if (!tStr) return tStr;
    if (/^just now$/i.test(tStr.trim())) return '刚刚';
    if (/^yesterday$/i.test(tStr.trim())) return '昨天';
    return translateDuration(tStr)
      .replace(/\s*ago$/i, '前')
      .replace(/^in\s+/i, '');
  }

  const CONV_ACTION_MAP = Object.assign(Object.create(null), {
    archive: '归档',
    unarchive: '取消归档',
    delete: '删除',
    rename: '重命名',
    pin: '置顶',
    unpin: '取消置顶',
    load: '加载',
    open: '打开',
    create: '创建',
    fork: '派生',
    export: '导出',
    move: '移动',
    duplicate: '复制',
  });

  const DYNAMIC_RULES = [
    // 设置与语音历史防冲突规则（须置于文件删除/相对时间/分段切分规则之前）
    {
      re: /^Deleted\s+(\d+)\s+recordings?\s*\((.+)\)$/i,
      fn: (m) => `已删除 ${m[1]} 条录制 (${m[2]})`,
    },
    {
      re: /^Started\s+voice\s+chat(?:\s*[·•]\s*(.+))?$/i,
      fn: (m) => (m[1] ? `已开始语音对话 · ${translateRelTime(m[1])}` : '已开始语音对话'),
    },
    {
      re: /^Stopped\s+voice\s+chat(?:\s*[·•]\s*(.+))?$/i,
      fn: (m) => (m[1] ? `已结束语音对话 · ${translateDuration(m[1])}` : '已结束语音对话'),
    },
    // 1. Duration, relative time & thinking headers (placed before file-action rules so "Updated 5m ago" isn't misread as a filename)
    {
      re: /^(Today|Yesterday)(?:\s+at|\s*,)?\s+(.+)$/i,
      fn: (m) => {
        if (!/\d/.test(m[2]) || m[2].length > 32) return null;
        return `${m[1].toLowerCase() === 'today' ? '今天' : '昨天'} ${m[2]}`;
      },
    },
    {
      re: /^(Updated|Created|Modified|Edited|Saved|Last\s+active|Started|Finished|Completed)\s+(.+\s+ago|just\s+now|yesterday)$/i,
      fn: (m) => {
        const pMap = {
          updated: '更新于',
          created: '创建于',
          modified: '修改于',
          edited: '编辑于',
          saved: '保存于',
          'last active': '最后活跃于',
          started: '开始于',
          finished: '完成于',
          completed: '完成于',
        };
        const prefix = ownLookup(pMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1];
        return `${prefix} ${translateRelTime(m[2])}`;
      },
    },
    {
      re: /^(\d+\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days))\s+ago$/i,
      fn: (m) => `${translateDuration(m[1])}前`,
    },
    {
      re: /^Refreshes\s+in\s+(.+)$/i,
      fn: (m) => `将在 ${translateDuration(m[1])}后刷新`,
    },
    {
      re: /^Resets\s+in\s+(.+)$/i,
      fn: (m) => `将在 ${translateDuration(m[1])}后重置`,
    },
    {
      re: /^(Worked|Thought|Thinking|Ran|Waited|Searched|Analyzed|Executed)\s+for\s+(.+)$/i,
      fn: (m) => {
        const verbMap = {
          worked: '工作了',
          thought: '思考了',
          thinking: '已思考',
          ran: '运行了',
          waited: '等待了',
          searched: '搜索了',
          analyzed: '分析了',
          executed: '执行了',
        };
        const verb = ownLookup(verbMap, m[1].toLowerCase()) || m[1];
        return `${verb} ${translateDuration(m[2])}`;
      },
    },
    // 2. Step count & Hidden steps
    {
      re: /^(\d+)\s+steps?\s+hidden$/i,
      fn: (m) => `已折叠 ${m[1]} 个步骤`,
    },
    {
      re: /^Show\s+(\d+)\s+more\s+steps?$/i,
      fn: (m) => `显示另外 ${m[1]} 个步骤`,
    },
    {
      re: /^(\d+)\s+steps?$/i,
      fn: (m) => `${m[1]} 个步骤`,
    },
    {
      re: /^Load\s+(\d+)\s+(earlier|later)\s+steps?$/i,
      fn: (m) => `加载${m[2].toLowerCase() === 'earlier' ? '前' : '后'} ${m[1]} 个步骤`,
    },
    {
      re: /^Load\s+older\s+messages,\s*showing\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `加载更早的消息（当前显示 ${m[1]} / ${m[2]}）`,
    },
    {
      re: /^(?:…|\.\.\.)?\s*\(?(\d+)\s+above\s+hidden\)?$/i,
      fn: (m) => `上方已折叠 ${m[1]} 项`,
    },
    // 3. Tool call step headers
    {
      re: /^Searched\s+for\s+files:\s*(.+)$/i,
      fn: (m) => `搜索了文件：${m[1]}`,
    },
    {
      re: /^Searched\s+web:\s*(.+)$/i,
      fn: (m) => `搜索了网页：${m[1]}`,
    },
    {
      re: /^Searched\s+for\s+(.+?)(?:\s+in\s+(.+))?$/i,
      fn: (m) => (m[2] ? `在 ${m[2]} 中搜索了 ${m[1]}` : `搜索了 ${m[1]}`),
    },
    {
      re: /^Found\s+(\d+)\s+(results?|matches|files?|items?)(?:\s+in\s+(.+))?$/i,
      fn: (m) => {
        const unitMap = {
          result: '个结果',
          results: '个结果',
          matches: '处匹配',
          file: '个文件',
          files: '个文件',
          item: '项',
          items: '项',
        };
        const unit = ownLookup(unitMap, m[2].toLowerCase()) || m[2];
        return m[3] ? `在 ${m[3]} 中找到 ${m[1]} ${unit}` : `找到 ${m[1]} ${unit}`;
      },
    },
    {
      re: /^Listed\s+directory\s+(.+)$/i,
      fn: (m) => `列出了目录 ${m[1]}`,
    },
    {
      re: /^Ran\s+(?:background\s+)?command:\s*(.+)$/i,
      fn: (m) => `执行了命令：${m[1]}`,
    },
    {
      re: /^Running\s+command:\s*(.+)$/i,
      fn: (m) => `正在运行命令：${m[1]}`,
    },
    {
      re: /^Used\s+tool:\s*(.+)$/i,
      fn: (m) => `使用了工具：${m[1]}`,
    },
    {
      re: /^Invoked\s+subagent:\s*(.+)$/i,
      fn: (m) => `调用了子智能体：${m[1]}`,
    },
    {
      re: /^Executing\s+task:\s*(.+)$/i,
      fn: (m) => `正在执行任务：${m[1]}`,
    },
    {
      re: /^Browser\s+task:\s*(.+)$/i,
      fn: (m) => `浏览器任务：${m[1]}`,
    },
    {
      re: /^Code\s+search:\s*(.+)$/i,
      fn: (m) => `代码搜索：${m[1]}`,
    },
    {
      re: /^Internal\s+search:\s*(.+)$/i,
      fn: (m) => `内部搜索：${m[1]}`,
    },
    {
      re: /^Generated\s+image:\s*(.+)$/i,
      fn: (m) => `已生成图片：${m[1]}`,
    },
    {
      re: /^Opened\s+browser:\s*(.+)$/i,
      fn: (m) => `已打开浏览器：${m[1]}`,
    },
    {
      re: /^Read\s+URL:\s*(.+)$/i,
      fn: (m) => `已读取 URL：${m[1]}`,
    },
    {
      re: /^App\s+view\s+for\s+(.+)$/i,
      fn: (m) => `应用视图：${m[1]}`,
    },
    {
      re: /^Waiting\s+for\s+command\s+completion\s+\(up\s+to\s+(\d+)\s+seconds?\)$/i,
      fn: (m) => `正在等待命令完成（最多 ${m[1]} 秒）`,
    },
    {
      re: /^Working\s+directory:\s*(.+)$/i,
      fn: (m) => `工作目录：${m[1]}`,
    },
    // 4. Interactive Permissions & Allow/Deny Rules
    {
      re: /^Yes,\s+and\s+always\s+allow\s+['"“”]?(.+?)['"“”]?\s+(in\s+this\s+workspace|globally|in\s+this\s+conversation|in\s+this\s+project|when\s+not\s+in\s+a\s+project)$/i,
      fn: (m) => {
        const scopeMap = {
          'in this workspace': '在当前工作区',
          globally: '在全局',
          'in this conversation': '在当前对话中',
          'in this project': '在此项目中',
          'when not in a project': '在未归属项目时',
        };
        const sc = ownLookup(scopeMap, m[2].toLowerCase().replace(/\s+/g, ' ')) || m[2];
        return `允许，并${sc}始终允许 '${m[1]}'`;
      },
    },
    {
      re: /^Yes,\s+and\s+always\s+allow\s+(in\s+this\s+project|when\s+not\s+in\s+a\s+project)$/i,
      fn: (m) =>
        `允许，并${m[1].toLowerCase().replace(/\s+/g, ' ') === 'in this project' ? '在此项目中' : '在未归属项目时'}始终允许`,
    },
    {
      re: /^Yes,\s+and\s+always\s+allow\s+access\s+to\s+(.+?)\s+in\s+this\s+workspace$/i,
      fn: (m) => `允许，并在当前工作区始终允许访问 ${m[1]}`,
    },
    {
      re: /^Yes,\s+and\s+always\s+allow\s+access\s+to\s+(.+?)\s+globally$/i,
      fn: (m) => `允许，并在全局始终允许访问 ${m[1]}`,
    },
    {
      re: /^Yes,\s+and\s+always\s+allow\s+['"“”]?(.+?)['"“”]?$/i,
      fn: (m) => `允许，并始终允许 '${m[1]}'`,
    },
    {
      re: /^Yes,\s+save\s+rule\s+for\s+['"“”]?(.+?)['"“”]?\s+(globally|in\s+this\s+workspace|in\s+this\s+conversation|in\s+this\s+project|when\s+not\s+in\s+a\s+project)$/i,
      fn: (m) => {
        const scopeMap = {
          'in this workspace': '在当前工作区',
          globally: '在全局',
          'in this conversation': '在当前对话中',
          'in this project': '在此项目中',
          'when not in a project': '在未归属项目时',
        };
        const sc = ownLookup(scopeMap, m[2].toLowerCase().replace(/\s+/g, ' ')) || m[2];
        return `是，${sc}为 '${m[1]}' 保存规则`;
      },
    },
    {
      re: /^Yes,\s+save\s+rule\s+(in\s+this\s+project|when\s+not\s+in\s+a\s+project)$/i,
      fn: (m) =>
        `是，${m[1].toLowerCase().replace(/\s+/g, ' ') === 'in this project' ? '在此项目中' : '在未归属项目时'}保存规则`,
    },
    {
      re: /^Yes,\s+save\s+rule\s+for\s+['"“”]?(.+?)['"“”]?$/i,
      fn: (m) => `是，为 '${m[1]}' 保存规则`,
    },
    {
      re: /^Always\s+allow\s+['"“”]?(.+?)['"“”]?\s+in\s+this\s+workspace$/i,
      fn: (m) => `在当前工作区始终允许 '${m[1]}'`,
    },
    {
      re: /^Always\s+allow\s+['"“”]?(.+?)['"“”]?\s+globally$/i,
      fn: (m) => `在全局始终允许 '${m[1]}'`,
    },
    {
      re: /^Save\s+rule\s+to\s+always\s+allow\s+['"“”]?(.+?)['"“”]?\s+in\s+this\s+workspace\?$/i,
      fn: (m) => `保存规则以在当前工作区始终允许 '${m[1]}'？`,
    },
    {
      re: /^Save\s+rule\s+to\s+always\s+allow\s+['"“”]?(.+?)['"“”]?\s+globally\?$/i,
      fn: (m) => `保存规则以在全局始终允许 '${m[1]}'？`,
    },
    {
      re: /^Save\s+rule\s+to\s+always\s+allow\s+(.+)\?$/i,
      fn: (m) => `保存规则以始终允许 ${m[1]}？`,
    },
    {
      re: /^Agent\s+needs\s+permission\s+to\s+run:\s*(.+)$/i,
      fn: (m) => `智能体需要权限以运行：${m[1]}`,
    },
    {
      re: /^Agent\s+needs\s+permission\s+to\s+execute\s+JavaScript\s+on\s+(.+)$/i,
      fn: (m) => `智能体需要权限以在 ${m[1]} 上执行 JavaScript`,
    },
    {
      re: /^Agent\s+needs\s+permission\s+to\s+act\s+on\s+(.+)$/i,
      fn: (m) => `智能体需要权限以操作 ${m[1]}`,
    },
    {
      re: /^Agent\s+needs\s+permission\s+to\s+(.+)$/i,
      fn: (m) => `智能体需要权限以执行：${m[1]}`,
    },
    // 5. Customizations, Budget, Feedback & Settings dynamic rules
    {
      re: /^(\d+(?:\.\d+)?)%\s+of\s+the\s+customization\s+budget\s+is\s+available\.?$/i,
      fn: (m) => `${m[1]}% 的自定义项预算可用。`,
    },
    {
      re: /^(\d+)\s*%\s*left$/i,
      fn: (m) => `剩余 ${m[1]}%`,
    },
    {
      re: /^(\d+(?:\.\d+)?)\s*x\s+playback\s+speed$/i,
      fn: (m) => `${m[1]} 倍播放速度`,
    },
    {
      re: /^Show\s+(\d+)\s+breakdowns?$/i,
      fn: (m) => `展开 ${m[1]} 项明细`,
    },
    {
      re: /^Show\s+more\s*\((.+)\)$/i,
      fn: (m) => `显示更多 (${m[1]})`,
    },
    {
      re: /^Show\s+submitted\s*\((.+)\)$/i,
      fn: (m) => `显示已提交 (${m[1]})`,
    },
    {
      re: /^(\d+)\s+tools?$/i,
      fn: (m) => `${m[1]} 个工具`,
    },
    {
      re: /^\(([\d,]+)\s+tokens?\)$/i,
      fn: (m) => `(${m[1]} Token)`,
    },
    {
      re: /^([\d,]+)\s+tokens?$/i,
      fn: (m) => `${m[1]} Token`,
    },
    {
      re: /^Unused\s+capacity:\s*([\d,]+)\s+tokens?$/i,
      fn: (m) => `剩余可用容量：${m[1]} Token`,
    },
    {
      re: /^(.+?):\s*([\d,]+)\s+tokens?$/i,
      fn: (m) => `${dictLookup(m[1]) || m[1]}：${m[2]} Token`,
    },
    {
      re: /^Send\s+feedback\s+as\s+(.+)$/i,
      fn: (m) => `以 ${m[1]} 的身份发送反馈`,
    },
    {
      re: /^Available\s+AI\s+Credits:\s*(.+)$/i,
      fn: (m) => `可用 AI 积分：${m[1]}`,
    },
    {
      re: /^Your\s+Plan:\s*(.+)$/i,
      fn: (m) => `当前套餐：${m[1]}`,
    },
    {
      re: /^Shared\s+with:\s*(.+)$/i,
      fn: (m) => `共享配额模型：${m[1]}`,
    },
    {
      re: /^Your\s+plan's\s+baseline\s+quota\s+will\s+refresh\s+on\s+(.+?)\.?$/i,
      fn: (m) => `您套餐的基础配额将于 ${m[1]} 刷新。`,
    },
    {
      re: /^Reset\s+(\d+)\s+overrides?$/i,
      fn: (m) => `重置 ${m[1]} 项覆盖设置`,
    },
    {
      re: /^(.+?)\s+\(disabled\s+by\s+admin\)$/i,
      fn: (m) => `${dictLookup(m[1]) || m[1]}（已被管理员禁用）`,
    },
    {
      re: /^(.+?)\s+\(Experimental\)$/i,
      fn: (m) => `${dictLookup(m[1]) || translateString(m[1]) || m[1]}（实验性）`,
    },
    {
      re: /^(Child\s+Subagents|Subagents|Generation\s+Steps|Message\s+History|Tool\s+Calls|Tools|System\s+Prompt\s+Sections|Executions|Invocations|Terminal|Comment|Changes\s+Overview|Best\s+of\s+N|See\s+all|Send\s+all|Select\s+Environment|Start|End)\s*\((.+)\)$/i,
      fn: (m) => {
        const pMap = {
          'child subagents': '子智能体',
          subagents: '子智能体',
          'generation steps': '生成步骤',
          'message history': '消息历史',
          'tool calls': '工具调用',
          tools: '工具',
          'system prompt sections': '系统提示词分段',
          executions: '执行记录',
          invocations: '调用记录',
          terminal: '终端',
          comment: '评论',
          'changes overview': '变更概览',
          'best of n': '多路择优',
          'see all': '查看全部',
          'send all': '全部发送',
          'select environment': '选择环境',
          start: '开始',
          end: '结束',
        };
        const k = m[1].toLowerCase().replace(/\s+/g, ' ');
        return `${ownLookup(pMap, k) || m[1]} (${m[2]})`;
      },
    },
    {
      re: /^System\s+default\s*\((.+)\)$/i,
      fn: (m) => `系统默认 (${m[1]})`,
    },
    {
      re: /^Artifacts\s*\((\d+)\s+Files?\s+for\s+Conversation\)$/i,
      fn: (m) => `产物（当前对话共 ${m[1]} 个文件）`,
    },
    {
      re: /^Start\s+Best-of-(\d+)$/i,
      fn: (m) => `启动 ${m[1]} 路择优`,
    },
    {
      re: /^Best\s+of\s+N\s+\((.+?)\)$/i,
      fn: (m) => `多路择优 (${m[1]})`,
    },
    {
      re: /^(\d+)\s+Background\s+Process(?:es)?\s+Running$/i,
      fn: (m) => `${m[1]} 个后台进程运行中`,
    },
    {
      re: /^(\d+)\s+Files?\s+With\s+Changes$/i,
      fn: (m) => `${m[1]} 个文件有更改`,
    },
    {
      re: /^(\d+)\s+Side\s+Questions?$/i,
      fn: (m) => `${m[1]} 个旁路提问`,
    },
    {
      re: /^View\s+(\d+)\s+side\s+questions?$/i,
      fn: (m) => `查看 ${m[1]} 个旁路提问`,
    },
    {
      re: /^(\d+)\s+Comments?$/i,
      fn: (m) => `${m[1]} 条评论`,
    },
    {
      re: /^Mark\s+all\s+(\d+)\s+conversations?\s+as\s+read$/i,
      fn: (m) => `将全部 ${m[1]} 个对话标为已读`,
    },
    {
      re: /^Are\s+you\s+sure\s+you\s+want\s+to\s+mark\s+all\s+(\d+)\s+conversations?\s+as\s+read\?\s*This\s+action\s+cannot\s+be\s+undone\.?$/i,
      fn: (m) => `确定要将全部 ${m[1]} 个对话标为已读吗？此操作无法撤销。`,
    },
    {
      re: /^Proceed\s+with\s+implementation\s+plan\s+and\s+(\d+)\s+comments?$/i,
      fn: (m) => `附带 ${m[1]} 条评论继续执行实现计划`,
    },
    {
      re: /^Select\s+at\s+(least|most)\s+(\d+)\s+items?$/i,
      fn: (m) => `${m[1].toLowerCase() === 'least' ? '至少' : '最多'}选择 ${m[2]} 项`,
    },
    {
      re: /^([A-Za-z0-9+⌘⌥⇧⌃\-\s]{1,24})\s+(Hold|Release)$/,
      fn: (m) => {
        if (/\b(?:on|to|and|the|a|an|for|of|in)\b/i.test(m[1])) return null;
        return `${m[1]} ${m[2] === 'Hold' ? '按住' : '松开'}`;
      },
    },
    {
      re: /^(.+?)\s+Queues\s+after\s+the\s+turn$/i,
      fn: (m) => `${m[1]} 当前轮次结束后排队发送`,
    },
    {
      re: /^(.+?)\s+Sends\s+immediately$/i,
      fn: (m) => `${m[1]} 立即发送`,
    },
    {
      re: /^Add\s+new\s+(.+?)\s+item$/i,
      fn: (m) => `添加新的${dictLookup(m[1]) || m[1]}项`,
    },
    {
      re: /^Confirm\s+add\s+(.+?)\s+item$/i,
      fn: (m) => `确认添加${dictLookup(m[1]) || m[1]}项`,
    },
    {
      re: /^(?:Process\s+exited|Exited)\s+with\s+code\s+(-?\d+)\.?$/i,
      fn: (m) => `已退出，退出码 ${m[1]}。`,
    },
    {
      re: /^Exit\s+code\s+(-?\d+)$/i,
      fn: (m) => `退出码 ${m[1]}`,
    },
    {
      re: /^(Fold|Unfold)\s+lines?\s+(\d+(?:-\d+)?)$/i,
      fn: (m) => `${m[1].toLowerCase() === 'fold' ? '折叠' : '展开'}第 ${m[2]} 行`,
    },
    // 6. Question modal & Message queue
    {
      re: /^Question\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `第 ${m[1]} / ${m[2]} 个问题`,
    },
    {
      re: /^(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `${m[1]} / ${m[2]}`,
    },
    {
      re: /^Message\s+queued\.\s*(\d+)\s+messages?\s+in\s+queue\.?$/i,
      fn: (m) => `消息已加入队列（队列中共 ${m[1]} 条消息）`,
    },
    {
      re: /^(\d+)\s+messages?\s+queued$/i,
      fn: (m) => `${m[1]} 条排队消息`,
    },
    // 7. Files, changes, lines, and Git operations
    {
      re: /^(\d+)\s+files?\s+changed$/i,
      fn: (m) => `${m[1]} 个文件已更改`,
    },
    {
      re: /^(\d+)\s+insertions?\(\+\),\s*(\d+)\s+deletions?\(-\)$/i,
      fn: (m) => `新增 ${m[1]} 行(+)，删除 ${m[2]} 行(-)`,
    },
    {
      re: /^Push\s+(\d+)\s+commits?\s+to\s+(.+)$/i,
      fn: (m) => `推送 ${m[1]} 个提交至 ${m[2]}`,
    },
    {
      re: /^Pushed\s+(\d+)\s+commits?\s+to\s+(.+?)\.?$/i,
      fn: (m) => `已推送 ${m[1]} 个提交至 ${m[2]}。`,
    },
    {
      re: /^Pull\s+(\d+)\s+commits?\s+from\s+(.+)$/i,
      fn: (m) => `从 ${m[2]} 拉取 ${m[1]} 个提交`,
    },
    {
      re: /^Detached\s+at\s+([0-9a-f]{6,40})$/i,
      fn: (m) => `当前游离于提交 ${m[1]}`,
    },
    {
      re: /^(\d+)\s+commits?\s+(ahead|behind)$/i,
      fn: (m) =>
        m[2].toLowerCase() === 'ahead'
          ? `领先 ${m[1]} 个提交`
          : `落后 ${m[1]} 个提交`,
    },
    {
      re: /^(\d+)\s+(files?|folders?|items?|conversations?|projects?|agents?|subagents?|tasks?|threads?|branches|commits?|changes|warnings?|errors?|worktrees?|artifacts?|skills?|plugins?|rules?|questions?|results?|selected)$/i,
      fn: (m) => {
        const uMap = {
          file: '个文件',
          files: '个文件',
          folder: '个文件夹',
          folders: '个文件夹',
          item: '项',
          items: '项',
          conversation: '个对话',
          conversations: '个对话',
          project: '个项目',
          projects: '个项目',
          agent: '个智能体',
          agents: '个智能体',
          subagent: '个子智能体',
          subagents: '个子智能体',
          task: '个任务',
          tasks: '个任务',
          thread: '个线程',
          threads: '个线程',
          branch: '个分支',
          branches: '个分支',
          commit: '个提交',
          commits: '个提交',
          change: '处更改',
          changes: '处更改',
          warning: '个警告',
          warnings: '个警告',
          error: '个错误',
          errors: '个错误',
          worktree: '个工作树',
          worktrees: '个工作树',
          artifact: '个产物',
          artifacts: '个产物',
          skill: '个技能',
          skills: '个技能',
          plugin: '个插件',
          plugins: '个插件',
          rule: '条规则',
          rules: '条规则',
          question: '个问题',
          questions: '个问题',
          result: '个结果',
          results: '个结果',
          selected: '项已选',
        };
        return `${m[1]} ${ownLookup(uMap, m[2].toLowerCase()) || m[2]}`;
      },
    },
    {
      re: /^(\d+)\s+(running|active|idle|completed|failed|queued|pending)$/i,
      fn: (m) => {
        const sMap = {
          running: '个运行中',
          active: '个活跃',
          idle: '个空闲',
          completed: '个已完成',
          failed: '个失败',
          queued: '个排队中',
          pending: '个等待中',
        };
        return `${m[1]} ${ownLookup(sMap, m[2].toLowerCase()) || m[2]}`;
      },
    },
    // 8. Version & Model deprecation / availability / quota notices
    {
      re: /^Version\s+([0-9A-Za-z._-]+)(?:\s+\((.+)\))?$/i,
      fn: (m) => (m[2] ? `版本 ${m[1]} (${m[2]})` : `版本 ${m[1]}`),
    },
    {
      re: /^(.+?)\s+will\s+be\s+deprecated\s+on\s+(.+?)\.\s*Please\s+switch\s+to\s+(.+?)\.?$/i,
      fn: (m) => `${m[1]} 将于 ${m[2]} 停用，请切换至 ${m[3]}。`,
    },
    {
      re: /^You(?:'ve|\s+have)\s+reached\s+your\s+(.+?)\s+(?:usage\s+)?limit(?:\s+until\s+(.+))?\.?$/i,
      fn: (m) =>
        m[2]
          ? `您已达到 ${m[1]} 使用上限（至 ${m[2]} 恢复）。`
          : `您已达到 ${m[1]} 使用上限。`,
    },
    {
      re: /^Switched\s+to\s+(.+)$/i,
      fn: (m) => `已切换至 ${m[1]}`,
    },
    {
      re: /^Open\s+in\s+(.+)$/i,
      fn: (m) => {
        if (m[1].length > 60 || /[.!?]$/.test(m[1]) || /^(?:the|a|an)\s+/i.test(m[1])) return null;
        return `在 ${dictLookup(m[1]) || m[1]} 中打开`;
      },
    },
    {
      re: /^Connected\s+to\s+(.+)$/i,
      fn: (m) => {
        if (m[1].length > 80 || /[\r\n]/.test(m[1])) return null;
        return `已连接到 ${m[1]}`;
      },
    },
    {
      re: /^Connecting\s+to\s+(.+?)\.{0,3}$/i,
      fn: (m) => `正在连接到 ${m[1]}...`,
    },
    {
      re: /^Failed\s+to\s+connect\s+to\s+(.+)$/i,
      fn: (m) => `无法连接到 ${m[1]}`,
    },
    {
      re: /^Couldn't\s+connect\s+to\s+(.+)$/i,
      fn: (m) => `无法连接到 ${m[1]}`,
    },
    {
      re: /^Delete\s+['"“”]?(.+?)['"“”]?\?$/i,
      fn: (m) => `确定删除“${m[1]}”吗？`,
    },
    {
      re: /^Remove\s+['"“”]?(.+?)['"“”]?\?$/i,
      fn: (m) => `确定移除“${m[1]}”吗？`,
    },
    // 9. Appearance, Customizations, Plugins, Skills, MCP, Automations, Coordinator & Dialog dynamic templates (v2.31.2 / agy 1.5.7)
    {
      re: /^Low\s+contrast\s+ratio\s+\((.+?)\)\.\s*Text\s+may\s+be\s+hard\s+to\s+read\.?$/i,
      fn: (m) => `对比度过低 (${m[1]})，文字可能难以辨认。`,
    },
    {
      re: /^Changes\s+the\s+base\s+URL\s+for\s+marketplace\s+search\s+results\.\s*You\s+must\s+restart\s+(.+?)\s+to\s+use\s+the\s+new\s+marketplace\s+after\s+changing\s+this\s+value\.?$/i,
      fn: (m) => `更改扩展市场搜索结果的基础 URL。修改此值后，必须重启 ${m[1]} 才能使用新的扩展市场。`,
    },
    {
      re: /^Changes\s+the\s+base\s+URL\s+on\s+each\s+extension\s+page\.\s*You\s+must\s+restart\s+(.+?)\s+to\s+use\s+the\s+new\s+marketplace\s+after\s+changing\s+this\s+value\.?$/i,
      fn: (m) => `更改每个扩展页面的基础 URL。修改此值后，必须重启 ${m[1]} 才能使用新的扩展市场。`,
    },
    {
      re: /^In\s+addition\s+to\s+the\s+custom\s+skills\s+folder,\s*(.+?)\s+will\s+search\s+the\s+following\s+paths\s+in\s+order\s+to\s+find\s+skills\s+for\s+the\s+agent\.?([\s\S]*)$/i,
      fn: (m) => `除自定义技能文件夹外，${m[1]} 还将按顺序搜索以下路径以查找智能体技能。${m[2] || ''}`,
    },
    {
      re: /^When\s+toggled\s+on,\s*(.+?)\s+collects\s+usage\s+data\s+to\s+help\s+Google\s+enhance\s+performance\s+and\s+features\.?$/i,
      fn: (m) => `开启后，${m[1]} 将收集使用数据，以帮助 Google 改进性能和功能。`,
    },
    {
      re: /^When\s+toggled\s+on,\s*(.+?)\s+will\s+use\s+your\s+AI\s+credits\s+to\s+fulfill\s+model\s+requests\s+once\s+you're\s+out\s+of\s+model\s+quota\.\s*\1\s+will\s+always\s+use\s+your\s+model\s+quota\s+first\s+before\s+using\s+AI\s+credits\.?$/i,
      fn: (m) => `开启后，当模型配额用尽时，${m[1]} 将使用您的 AI 积分响应模型请求。${m[1]} 始终会优先消耗模型配额，再使用 AI 积分。`,
    },
    {
      re: /^Receive\s+product\s+updates,\s*tips,\s*and\s+promotions\s+from\s+Google\s+(.+?)\s+via\s+email\.?$/i,
      fn: (m) => `通过电子邮件接收来自 Google ${m[1]} 的产品更新、使用技巧和促销信息。`,
    },
    {
      re: /^Help\s+us\s+improve\s+(.+?)(\.)?$/i,
      fn: (m) => `帮助我们改进 ${m[1]}${m[2] ? '。' : ''}`,
    },
    {
      re: /^Manage\s+(.+?)\s+app\s+settings\.?$/i,
      fn: (m) => `管理 ${m[1]} 应用设置。`,
    },
    {
      re: /^No\s+MCP\s+servers\s+found\s+for\s+["“'](.+?)["”']\.?$/i,
      fn: (m) => `未找到匹配“${m[1]}”的 MCP 服务器`,
    },
    {
      re: /^Search\s+Google\s+for\s+["“'](.+?)["”']$/i,
      fn: (m) => `在 Google 中搜索“${m[1]}”`,
    },
    {
      re: /^Build\s+with\s+(.+?)\s+Plugins$/i,
      fn: (m) => `使用 ${m[1]} 插件构建`,
    },
    {
      re: /^Select\s+(.+?)\s+Theme$/i,
      fn: (m) => `选择 ${m[1]} 主题`,
    },
    {
      re: /^Compare\s+responses\s+from\s+(\d+)\s+models\s+side-by-side\s+to\s+find\s+the\s+best\s+result\.?$/i,
      fn: (m) => `并排对比 ${m[1]} 个模型的回答以选出最佳结果。`,
    },
    {
      re: /^The\s+(.+?)\s+MCP\s+server\s+requires\s+configuration\s+parameters\s+before\s+it\s+can\s+be\s+started\.?$/i,
      fn: (m) => `${m[1]} MCP 服务器需要先填写配置参数才能启动。`,
    },
    {
      re: /^Filter\s+skills\s+and\s+rules:\s*(.+)$/i,
      fn: (m) => `筛选技能与规则：${m[1]}`,
    },
    {
      re: /^Open\s+(.+?)\s+skill$/i,
      fn: (m) => `打开 ${m[1]} 技能`,
    },
    {
      re: /^Automatically\s+create\s+a\s+new\s+(.+?)\s+workspace\s+when\s+the\s+conversation\s+starts\.?$/i,
      fn: (m) => `对话开始时自动创建新的 ${m[1]} 工作区`,
    },

    // --- 10. Antigravity v2.31.2 & Gemini agy 1.5.7 templates ---
    {
      re: /^([A-Za-z][A-Za-z0-9 _/-]{1,40}):\s*([\d,]+)\s+tokens?$/i,
      fn: (m) => `${dictLookup(m[1]) || m[1]}：${m[2]} Token`,
    },
    {
      re: /^SSH:\s+(.+)$/,
      fn: (m) => (m[1].length <= 80 ? `SSH：${m[1]}` : null),
    },
    {
      re: /^Open\s+the\s+(.+?)\s+plugin$/i,
      fn: (m) => `打开 ${m[1]} 插件`,
    },
    {
      re: /^Move\s+to\s+Group:\s*(.+)$/i,
      fn: (m) => `移至分组：${m[1]}`,
    },
    {
      re: /^Message\s+from\s+(.+)$/i,
      fn: (m) => {
        if (m[1].length > 48 || /[;{}()=<>]/.test(m[1])) return null;
        return `来自${dictLookup(m[1]) || m[1]}的消息`;
      },
    },
    {
      re: /^Keep:\s+(.+)$/,
      fn: (m) => (m[1].length <= 64 ? `保留：${m[1]}` : null),
    },
    {
      re: /^Remove\s+(.+?)\s+from\s+Recent$/i,
      fn: (m) => `从最近列表中移除 ${m[1]}`,
    },
    {
      re: /^Stop\s+(\d+)\s+(agents?|subagents?|coordinators?|servers?|terminals?|tasks?|items?)\?$/i,
      fn: (m) => {
        const nounMap = {
          agent: '智能体',
          agents: '智能体',
          subagent: '子智能体',
          subagents: '子智能体',
          coordinator: '协调者',
          coordinators: '协调者',
          server: '服务器',
          servers: '服务器',
          terminal: '终端',
          terminals: '终端',
          task: '任务',
          tasks: '任务',
          item: '项',
          items: '项',
        };
        const zhNoun = ownLookup(nounMap, m[2].toLowerCase()) || m[2];
        const unit = zhNoun === '项' ? '项' : `个${zhNoun}`;
        return `要停止 ${m[1]} ${unit}吗？`;
      },
    },
    {
      re: /^Using\s+default\s+(.+?)\s+name$/i,
      fn: (m) => `正在使用默认的 ${m[1]} 名称`,
    },
    {
      re: /^Duplicate\s+([A-Za-z][A-Za-z0-9 _-]{1,30})\s+name$/i,
      fn: (m) => `${dictLookup(m[1]) || m[1]}名称重复`,
    },
    {
      re: /^Cannot\s+add\s+folder:\s*["“]?(.+?)["”]?\s+is\s+not\s+a\s+valid\s+folder\s+location\.?$/i,
      fn: (m) => `无法添加文件夹：“${m[1]}”不是有效的文件夹位置。`,
    },
    {
      re: /^Install\s+folder\s+["“]?(.+?)["”]?\s+is\s+already\s+in\s+use$/i,
      fn: (m) => `安装文件夹“${m[1]}”已被占用`,
    },
    {
      re: /^Created\s+automation\s+["“](.+?)["”]\.?$/i,
      fn: (m) => `已创建自动化任务“${m[1]}”。`,
    },
    {
      re: /^(Enabled|Started|Restarted|Deleted)\s+["“](.+?)["”](\.)?$/i,
      fn: (m) => {
        const map = {
          enabled: '启用',
          started: '启动',
          restarted: '重启',
          deleted: '删除',
        };
        return `已${ownLookup(map, m[1].toLowerCase()) || m[1]}“${m[2]}”${m[3] ? '。' : ''}`;
      },
    },
    {
      re: /^Failed\s+to\s+(delete|save|update|start)\s+["“](.+?)["”](\.)?$/i,
      fn: (m) => {
        const map = {
          delete: '删除',
          save: '保存',
          update: '更新',
          start: '启动',
        };
        return `${ownLookup(map, m[1].toLowerCase()) || m[1]}“${m[2]}”失败${m[3] ? '。' : ''}`;
      },
    },
    {
      re: /^Failed\s+to\s+(create|archive|delete)\s+([A-Za-z0-9 _.-]{2,48}?)(\.)?$/i,
      fn: (m) => {
        if (/[;{}()=<>]/.test(m[2])) return null;
        const map = { create: '创建', archive: '归档', delete: '删除' };
        return `${ownLookup(map, m[1].toLowerCase()) || m[1]} ${dictLookup(m[2]) || m[2]} 失败${m[3] ? '。' : ''}`;
      },
    },
    {
      re: /^Failed\s+to\s+select\s+workspace:\s*(.+)$/i,
      fn: (m) => `选择工作区失败：${m[1]}`,
    },
    {
      re: /^Failed\s+to\s+resolve\s+folder:\s*(.+?)\s+\((.+)\)$/i,
      fn: (m) => `解析文件夹失败：${m[1]} (${m[2]})`,
    },
    {
      re: /^Failed\s+to\s+save\s+(cloud\s+permission\s+settings|project\s+Google3\s+configuration|project\s+permissions|project\s+settings|project|settings):\s*(.+)$/i,
      fn: (m) => {
        const key = m[1].toLowerCase().replace(/\s+/g, ' ');
        const map = {
          'cloud permission settings': '云端权限设置',
          'project google3 configuration': '项目 Google3 配置',
          'project permissions': '项目权限',
          'project settings': '项目设置',
          project: '项目',
          settings: '设置',
        };
        return `保存${ownLookup(map, key) || m[1]}失败：${m[2]}`;
      },
    },
    {
      re: /^Failed\s+to\s+unarchive\s+project:\s*(.+)$/i,
      fn: (m) => `取消归档项目失败：${m[1]}`,
    },
    {
      re: /^Failed\s+to\s+delete\s+recordings:\s*(.+)$/i,
      fn: (m) => `删除录制失败：${m[1]}`,
    },
    {
      re: /^(Couldn't|Failed\s+to)\s+([a-z-]+)\s+conversation$/i,
      fn: (m) => {
        const act = ownLookup(CONV_ACTION_MAP, m[2].toLowerCase());
        if (!act) return null;
        return m[1].toLowerCase().startsWith('couldn') ? `未能${act}对话` : `${act}对话失败`;
      },
    },
    {
      re: /^Configure\s+([A-Za-z0-9_.-][A-Za-z0-9_.\s-]{0,40})$/,
      fn: (m) => {
        if (/\b(?:to|for|with|and|or|your|the|a|an|on|in)\b/i.test(m[1])) return null;
        return `配置 ${m[1]}`;
      },
    },
    {
      re: /^Triggered\s+(.+)$/,
      fn: (m) => {
        if (m[1].length > 48 || /[;{}()=<>]/.test(m[1])) return null;
        return `已触发 ${m[1]}`;
      },
    },
    // 设置页与双端动态句式规则
    {
      re: /^Started\s+(during|from)\s+(the\s+subagent\s+conversation|the\s+main\s+conversation|[“"][^”"]+[”"])(?:\.\s*Show\s+in\s+(subagent\s+conversation|main\s+conversation))?$/i,
      fn: (m) => {
        const verb = m[1].toLowerCase() === 'during' ? '在' : '从';
        const suffix = m[1].toLowerCase() === 'during' ? '期间开始' : '开始';
        const src = /^the\s+subagent\s+conversation$/i.test(m[2])
          ? '子智能体对话'
          : /^the\s+main\s+conversation$/i.test(m[2])
            ? '主对话'
            : m[2];
        const baseStr = `${verb}${src}${suffix}`;
        if (!m[3]) return baseStr;
        const dest = /subagent/i.test(m[3]) ? '子智能体对话' : '主对话';
        return `${baseStr}。在${dest}中显示`;
      },
    },
    {
      re: /^Add\s+(scheduled\s+task|automation)$/i,
      fn: (m) => `添加${m[1].toLowerCase().includes('scheduled') ? '定时任务' : '自动化'}`,
    },
    { re: /^Choose\s+(.+?)'s\s+Voice$/i, fn: (m) => `选择 ${m[1]} 的语音` },
    { re: /^([^,]+),\s*voice\s+(\d+)\s+of\s+(\d+)$/i, fn: (m) => `${m[1]}，第 ${m[2]} / ${m[3]} 个声音` },
    { re: /^Voice\s+speed,\s*([\d.]+x)$/i, fn: (m) => `语音语速，${m[1]}` },
    { re: /^Playback\s+speed\s+([\d.]+x)$/i, fn: (m) => `播放速度 ${m[1]}` },
    { re: /^Zoom\s+(\d+%),\s*reset\s+to\s+fit$/i, fn: (m) => `缩放 ${m[1]}，点击重置为适应页面` },
    { re: /^(\d+)\s+calls?\s*·\s*(.+)$/i, fn: (m) => `${m[1]} 次通话 · ${m[2]}` },
    {
      re: /^This\s+deletes\s+(\d+)\s+call\s+recordings?\s*\((.+?)\)\s+from\s+your\s+machine\.\s*You\s+can't\s+undo\s+this\.?$/i,
      fn: (m) => `这将从您的设备永久删除 ${m[1]} 条通话录制 (${m[2]})，且无法撤销。`,
    },
    {
      re: /^Microphone\s+blocked\.\s*Allow\s+in\s+(.+?)\.?$/i,
      fn: (m) => `麦克风已被拦截，请在${dictLookup(m[1]) || m[1]}中允许访问。`,
    },
    {
      re: /^Microphone\s+access\s+for\s+(.+?)\s+was\s+denied\.\s*Quit\s+and\s+reopen\s+the\s+app\s+to\s+be\s+asked\s+again\.?$/i,
      fn: (m) => `对 ${m[1] === 'this SSH host' ? '此 SSH 主机' : m[1]} 的麦克风访问已被拒绝。请退出并重新打开应用以重新授权。`,
    },
    {
      re: /^Microphone\s+access\s+for\s+(.+?)\s+wasn't\s+allowed\.?$/i,
      fn: (m) => `未允许 ${m[1] === 'this SSH host' ? '此 SSH 主机' : m[1]} 访问麦克风。`,
    },
    {
      re: /^Inherits\s+your\s+Global\s+Permissions\s+when\s+working\s+(in\s+these\s+conversations|in\s+this\s+project|in\s+this\s+workspace|in\s+this\s+worktree)\.?$/i,
      fn: (m) => {
        const s = m[1].toLowerCase();
        const scope = s.includes('project')
          ? '此项目'
          : s.includes('workspace')
          ? '此工作区'
          : s.includes('worktree')
          ? '此工作树'
          : '这些对话';
        return `在${scope}中工作时，将继承您的全局权限设置。`;
      },
    },
    {
      re: /^This\s+(.+?)\s+overrides\s+your\s+global\s+permission\s+settings\.?$/i,
      fn: (m) => {
        const k = m[1].toLowerCase().trim();
        const map = { worktree: '工作树', project: '项目', workspace: '工作区', conversation: '对话' };
        return `此${ownLookup(map, k) || dictLookup(m[1]) || m[1]}将覆盖您的全局权限设置。`;
      },
    },
    {
      re: /^Agent\s+permissions\s+preset:\s*(.+?),\s*(.+)$/i,
      fn: (m) => `智能体权限预设：${dictLookup(m[1]) || m[1]}，${dictLookup(m[2]) || m[2]}`,
    },
    {
      re: /^Agent\s+permissions\s+preset\s+selector,\s*current:\s*(.+)$/i,
      fn: (m) => `智能体权限预设选择器，当前：${dictLookup(m[1]) || m[1]}`,
    },
    {
      re: /^(.+?)\s+On\s+empty\s+prompt,\s*sends\s+next\s+in\s+queue$/i,
      fn: (m) => `${m[1]} 输入框为空时发送队列下一条`,
    },
    { re: /^Stop\s+(\d+)\s+selected$/i, fn: (m) => `停止所选的 ${m[1]} 项` },
    { re: /^([\d,]+)\s+items?\s+could\s+not\s+be\s+stopped:\s*(.+)$/i, fn: (m) => `${m[1]} 项无法停止：${m[2]}` },
    { re: /^Stopping\s+(\d+)\s+tasks?$/i, fn: (m) => `正在停止 ${m[1]} 个任务` },
    { re: /^Closed\s+(\d+)\s+terminals?$/i, fn: (m) => `已关闭 ${m[1]} 个终端` },
    {
      re: /^Stop\s+(.+?)(\?)?$/i,
      fn: (m) => {
        if (/^to\s+/i.test(m[1]) || (/\b(?:to|and|the|for|in|at)\b/i.test(m[1]) && m[1].length > 48)) return null;
        return `停止 ${m[1]}${m[2] ? '？' : ''}`;
      },
    },
    {
      re: /^Recording\s+shortcut\s+for\s+(.+?)\.\s*Press\s+keys\s+to\s+bind,\s*Enter\s+to\s+save,\s*Escape\s+to\s+cancel\.?$/i,
      fn: (m) => `正在录制“${dictLookup(m[1]) || translateString(m[1]) || m[1]}”的快捷键。请按下组合键绑定，按 Enter 保存，按 Esc 取消。`,
    },
    {
      re: /^Shortcut\s+(.+?)\s+for\s+(.+)$/i,
      fn: (m) => `“${dictLookup(m[2]) || translateString(m[2]) || m[2]}”的快捷键：${m[1]}`,
    },
    {
      re: /^(Add|Remove)\s+shortcut(?:\s+(.+?))?\s+for\s+(.+)$/i,
      fn: (m) => {
        const target = dictLookup(m[3]) || translateString(m[3]) || m[3];
        const act = m[1].toLowerCase() === 'add' ? '添加' : '移除';
        return m[2] ? `为“${target}”${act}快捷键 ${m[2]}` : `为“${target}”${act}快捷键`;
      },
    },
    {
      re: /^Reset\s+(.+?)\s+to\s+default$/i,
      fn: (m) => `将“${dictLookup(m[1]) || translateString(m[1]) || m[1]}”重置为默认`,
    },
    {
      re: /^Conflict:\s*also\s+assigned\s+to\s+(.+)$/i,
      fn: (m) => `冲突：该快捷键也已分配给 ${dictLookup(m[1]) || translateString(m[1]) || m[1]}`,
    },
    {
      re: /^Conflicts\s+with\s+"(.+?)"\s+\(press\s+Enter\s+to\s+replace\)$/i,
      fn: (m) => `与“${dictLookup(m[1]) || translateString(m[1]) || m[1]}”冲突（按 Enter 替换）`,
    },
    {
      re: /^Conflicts\s+with\s+"(.+?)"\s+\(managed\s+by\s+application\s+menu\)$/i,
      fn: (m) => `与“${dictLookup(m[1]) || translateString(m[1]) || m[1]}”冲突（由应用菜单管理）`,
    },
    {
      re: /^Conflicts\s+with\s+"(.+?)"$/i,
      fn: (m) => `与“${dictLookup(m[1]) || translateString(m[1]) || m[1]}”冲突`,
    },
    { re: /^(\d+)\s+demoted$/i, fn: (m) => `${m[1]} 项已降级` },
    { re: /^(\d+)\s+excluded$/i, fn: (m) => `${m[1]} 项已排除` },
    {
      re: /^(\d+)\s+tools?\s+(enabled|disabled|excluded)$/i,
      fn: (m) => {
        const sMap = { enabled: '已启用', disabled: '已禁用', excluded: '已排除' };
        return `${m[1]} 个工具${ownLookup(sMap, m[2].toLowerCase()) || m[2]}`;
      },
    },
    {
      re: /^Exceeded\s+the\s+rules\s+token\s+budget\.\s*Full\s+rule\s+content\s+\(([\d,]+)\s+tokens\)\s+was\s+replaced\s+with\s+a\s+lightweight\s+file-path\s+pointer\s+in\s+context\.?$/i,
      fn: (m) => `已超出规则 Token 预算。完整规则内容 (${m[1]} Token) 已在上下文中替换为轻量级文件路径指针。`,
    },
    {
      re: /^Exceeded\s+the\s+customization\s+token\s+budget\s+\(([\d,]+)\s+tokens\)\s+and\s+was\s+excluded\s+from\s+context\.?$/i,
      fn: (m) => `已超出自定义项 Token 预算 (${m[1]} Token)，已从上下文中排除。`,
    },
    {
      re: /^All\s+tools\s+in\s+this\s+MCP\s+server\s+\(([\d,]+)\s+tokens\)\s+exceeded\s+the\s+customization\s+budget\s+and\s+were\s+excluded\s+from\s+context\.?$/i,
      fn: (m) => `此 MCP 服务器中的全部工具 (${m[1]} Token) 超出了自定义项预算，已从上下文中排除。`,
    },
    {
      re: /^(\d+)\s+tools?\s+in\s+this\s+MCP\s+server\s+\(([\d,]+)\s+tokens\)\s+exceeded\s+the\s+customization\s+budget\s+and\s+were\s+excluded\s+from\s+context\.?$/i,
      fn: (m) => `此 MCP 服务器中的 ${m[1]} 个工具 (${m[2]} Token) 超出了自定义项预算，已从上下文中排除。`,
    },
    {
      re: /^(\d+)\s+rules?\s+exceeded\s+the\s+rules\s+budget\s+and\s+(?:was|were)\s+demoted\s+from\s+full\s+inline\s+content\s+to\s+a\s+file-path\s+pointer\.?$/i,
      fn: (m) => `${m[1]} 条规则超出了规则预算，已从完整内联内容降级为文件路径指针。`,
    },
    {
      re: /^(\d+)\s+items?\s+in\s+(.+?)\s+exceeded\s+the\s+customization\s+budget\s+and\s+(?:was|were)\s+excluded\s+from\s+context\.?$/i,
      fn: (m) => `${dictLookup(m[2]) || m[2]} 中的 ${m[1]} 项超出了自定义项预算，已从上下文中排除。`,
    },
    { re: /^Add\s+bundle\s+(.+)$/i, fn: (m) => `添加插件包 ${m[1]}` },
    { re: /^(\d+)\s+matching\s+bundles?$/i, fn: (m) => `${m[1]} 个匹配的插件包` },
    {
      re: /^See\s+(more|less)\s+in\s+(.+)$/i,
      fn: (m) => {
        const dest = dictLookup(m[2]) || translateString(m[2]) || m[2];
        return m[1].toLowerCase() === 'more' ? `在 ${dest} 中查看更多` : `在 ${dest} 中收起`;
      },
    },
    {
      re: /^Added\s+(.+?)\s+and\s+installed\s+(.+?)\.?$/i,
      fn: (m) => {
        const right = m[2].replace(/^(\d+)\s+plugins?$/i, '$1 个插件');
        return `已添加 ${m[1]} 并安装了 ${right}。`;
      },
    },
    {
      re: /^Couldn't\s+(add|remove)\s+(\d+)\s+plugins?\s+from\s+(.+?)\.?$/i,
      fn: (m) => `无法从 ${m[3]} ${m[1].toLowerCase() === 'add' ? '添加' : '移除'} ${m[2]} 个插件。`,
    },
    {
      re: /^(Added|Removed)\s+(\d+)\s+plugins?\s+from\s+(.+?)\.?$/i,
      fn: (m) => `已从 ${m[3]} ${m[1].toLowerCase() === 'added' ? '添加' : '移除'} ${m[2]} 个插件。`,
    },
    {
      re: /^Add(?:ing)?\s+(?:(\d+)\s+)?plugins?\s+from\s+(.+)$/i,
      fn: (m) => (m[1] ? `从 ${m[2]} 添加 ${m[1]} 个插件` : `正在从 ${m[2]} 添加插件`),
    },
    {
      re: /^Error\s+(submitting\s+auth\s+code|disconnecting\s+MCP\s+server|installing\s+MCP\s+server|toggling\s+MCP\s+server|deleting\s+MCP\s+server|restarting\s+MCP\s+server|toggling\s+tool|refreshing\s+MCP\s+servers|updating\s+agent):\s*(.+)$/i,
      fn: (m) => {
        const k = m[1].toLowerCase().replace(/\s+/g, ' ');
        const eMap = {
          'submitting auth code': '提交授权码出错',
          'disconnecting mcp server': '断开 MCP 服务器连接出错',
          'installing mcp server': '安装 MCP 服务器出错',
          'toggling mcp server': '切换 MCP 服务器状态出错',
          'deleting mcp server': '删除 MCP 服务器出错',
          'restarting mcp server': '重启 MCP 服务器出错',
          'toggling tool': '切换工具状态出错',
          'refreshing mcp servers': '刷新 MCP 服务器出错',
          'updating agent': '更新智能体出错',
        };
        return `${ownLookup(eMap, k) || m[1]}：${m[2]}`;
      },
    },
    {
      re: /^Added\s+MCP\s+server\s+"(.+?)",\s*but\s+it\s+failed\s+to\s+start:\s*(.+)$/i,
      fn: (m) => `已添加 MCP 服务器“${m[1]}”，但启动失败：${m[2]}`,
    },
    {
      re: /^The\s+MCP\s+server\s+"(.+?)"(?:\s+from\s+plugin\s+"(.+?)")?\s+failed\s+to\s+start\.?$/i,
      fn: (m) =>
        m[2] ? `来自插件“${m[2]}”的 MCP 服务器“${m[1]}”启动失败。` : `MCP 服务器“${m[1]}”启动失败。`,
    },
    {
      re: /^MCP\s+server\s+"(.+?)"\s+does\s+not\s+have\s+a\s+(remote|supported)\s+configuration\.?$/i,
      fn: (m) => `MCP 服务器“${m[1]}”没有${m[2].toLowerCase() === 'remote' ? '远程' : '受支持的'}配置。`,
    },
    {
      re: /^(?:No\s+installation\s+command\s+found\s+for\s+MCP\s+server\s+"(.+?)"|MCP\s+server\s+"(.+?)"\s+does\s+not\s+have\s+any\s+installation\s+commands)\.?$/i,
      fn: (m) => `MCP 服务器“${m[1] || m[2]}”没有可用的安装命令。`,
    },
    {
      re: /^MCP\s+server\s+"(.+?)"\s+not\s+found\s+in\s+the\s+store\.?$/i,
      fn: (m) => `商店中未找到 MCP 服务器“${m[1]}”。`,
    },
    { re: /^Server\s+"(.+?)"\s+not\s+found\s+in\s+config$/i, fn: (m) => `配置中未找到服务器“${m[1]}”` },
    {
      re: /^MCP\s+server\s+(.+?)\s+requires\s+authentication:\s*sign\s+in\s+to\s+"(.+?)"\s+in\s+the\s+Accounts\s+section\s+of\s+plugin\s+"(.+?)"$/i,
      fn: (m) => `MCP 服务器 ${m[1]} 需要身份验证：请在插件“${m[3]}”的账号设置中登录“${m[2]}”`,
    },
    {
      re: /^Failed\s+to\s+(?:write\s+MCP\s+config|save\s+configuration):\s*(.+)$/i,
      fn: (m) => (m[0].toLowerCase().includes('mcp') ? `写入 MCP 配置失败：${m[1]}` : `保存配置失败：${m[1]}`),
    },
    {
      re: /^Failed\s+to\s+(update|remove|toggle|delete)\s+(agent|plugin):\s*(.+)$/i,
      fn: (m) => {
        const actMap = { update: '更新', remove: '移除', toggle: '切换', delete: '删除' };
        const act = ownLookup(actMap, m[1].toLowerCase()) || m[1];
        const noun = m[2].toLowerCase() === 'agent' ? '智能体' : '插件';
        return `${act}${noun}失败：${m[3]}`;
      },
    },
    { re: /^Failed\s+to\s+enable\s+plugin\s+(.+)$/i, fn: (m) => `启用插件 ${m[1]} 失败` },
    {
      re: /^(New\s+secret|Secret)\s+for\s+(?:a\s+new\s+(.+?)\s+account|(.+))$/i,
      fn: (m) =>
        m[2]
          ? `新 ${m[2]} 账号的密钥`
          : `${m[1].toLowerCase().startsWith('new') ? '新密钥' : '密钥'}：${m[3]}`,
    },
    { re: /^Make\s+(.+?)\s+the\s+default\s+(.+?)\s+account$/i, fn: (m) => `将 ${m[1]} 设为默认 ${m[2]} 账号` },
    { re: /^Account\s+this\s+MCP\s+server\s+uses:\s*(.+)$/i, fn: (m) => `此 MCP 服务器使用的账号：${m[1]}` },
    {
      re: /^(Auth\s+code|Authorization\s+code|Label|Details|More\s+actions|More)\s+for\s+(.+)$/i,
      fn: (m) => {
        const pMap = {
          'auth code': '授权码',
          'authorization code': '授权码',
          label: '标签',
          details: '详情',
          'more actions': '更多操作',
          more: '更多',
        };
        return `${m[2]} 的${ownLookup(pMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1]}`;
      },
    },
    // 账号未登录提示（须置于通用 Sign in to ... 规则之前）
    { re: /^Sign\s+in\s+from\s+the\s+(.+?)\s+panel\.?$/i, fn: (m) => `从 ${m[1]} 面板登录。` },
    { re: /^Sign\s+in\s+to\s+use\s+(.+?)!$/i, fn: (m) => `登录以使用 ${m[1]}！` },
    {
      re: /^Sign\s+in\s+to\s+(.+?)(?:\s+(on\s+this\s+computer|remotely))?$/i,
      fn: (m) =>
        !m[2]
          ? `登录 ${m[1]}`
          : m[2].toLowerCase() === 'remotely'
          ? `远程登录 ${m[1]}`
          : `在此计算机上登录 ${m[1]}`,
    },
    {
      re: /^You're\s+signing\s+in\s+on\s+(.+?)\.\s*Your\s+sign-in\s+stays\s+on\s+that\s+machine\.?$/i,
      fn: (m) => `您正在 ${m[1]} 上登录，登录状态仅保留在该设备上。`,
    },
    {
      re: /^Couldn't\s+(?:load\s+apps|disconnect\s+(.+?)):\s*(.+)$/i,
      fn: (m) => (m[1] ? `无法断开与 ${m[1]} 的连接：${m[2]}` : `无法加载应用：${m[2]}`),
    },
    { re: /^Sign-in\s+failed:\s*(.+)$/i, fn: (m) => `登录失败：${m[1]}` },
    { re: /^(.+?)\s+\(Remote\)$/i, fn: (m) => `${m[1]}（远程）` },
    {
      re: /^Manage\s+(project|workspace)\s+(resources|folders),\s*agent\s+settings,\s*and\s+permissions\.?$/i,
      fn: (m) =>
        `管理${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}${m[2].toLowerCase() === 'resources' ? '资源' : '文件夹'}、智能体设置和权限。`,
    },
    {
      re: /^Manage\s+(project|workspace)\s+(resources|folders)\s+and\s+settings\.?$/i,
      fn: (m) =>
        `管理${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}${m[2].toLowerCase() === 'resources' ? '资源' : '文件夹'}与设置。`,
    },
    {
      re: /^(Agent\s+settings\s+and\s+permissions|Settings)\s+for\s+conversations\s+outside\s+of\s+(projects|workspaces)\.?$/i,
      fn: (m) =>
        `未归属任何${m[2].toLowerCase() === 'projects' ? '项目' : '工作区'}的对话${m[1].toLowerCase().startsWith('agent') ? '智能体设置与权限' : '设置'}。`,
    },
    {
      re: /^Edit\s+(project|workspace)\s+name$/i,
      fn: (m) => `编辑${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}名称`,
    },
    {
      re: /^(New|Create|Delete)\s+(project|workspace)$/i,
      fn: (m) => {
        const aMap = { new: '新建', create: '创建', delete: '删除' };
        const a = ownLookup(aMap, m[1].toLowerCase()) || m[1];
        const n = m[2].toLowerCase() === 'project' ? '项目' : '工作区';
        return `${a}${n}`;
      },
    },
    { re: /^Select\s+project,\s*current:\s*(.+)$/i, fn: (m) => `选择项目，当前：${m[1]}` },
    {
      re: /^Select\s+model,\s*current:\s*(.+)$/i,
      fn: (m) => {
        let cur = m[1].trim();
        if (/^Orchestrator\b/i.test(cur)) {
          cur = cur.replace(/^Orchestrator\b/i, '编排器');
        }
        cur = translateModelEffortText(cur) || cur;
        return `选择模型，当前：${cur}`;
      },
    },
    {
      re: /^Where\s+the\s+agent\s+runs,\s*current:\s*(.+)$/i,
      fn: (m) => `智能体运行位置，当前：${dictLookup(m[1]) || m[1]}`,
    },
    { re: /^Branch,\s*current:\s*(.+)$/i, fn: (m) => `分支，当前：${m[1]}` },
    {
      re: /^Switch\s+environment\s+\((.+)\)$/i,
      fn: (m) => `切换环境 (${dictLookup(m[1]) || m[1]})`,
    },
    { re: /^Environment:\s*(.+)$/i, fn: (m) => `环境：${dictLookup(m[1]) || m[1]}` },
    {
      re: /^This\s+window's\s+agents,\s*files,\s*and\s+terminals\s+are\s+on\s+(.+?)\.?$/i,
      fn: (m) => `此窗口的智能体、文件和终端均运行在 ${m[1]} 上。`,
    },
    {
      re: /^(Hide|Show)\s+(.+?)\s+(?:from\s+this\s+list|in\s+the\s+list\s+again)$/i,
      fn: (m) => (m[1].toLowerCase() === 'hide' ? `从列表中隐藏 ${m[2]}` : `在列表中重新显示 ${m[2]}`),
    },
    { re: /^(\d+)\s+hidden\s+hosts?$/i, fn: (m) => `${m[1]} 个已隐藏主机` },
    { re: /^Work\s+locally\s+on\s+(.+)$/i, fn: (m) => `在本地处理 ${m[1]}` },
    { re: /^Worktree\s+from\s+(.+)$/i, fn: (m) => `从 ${m[1]} 创建工作树` },
    { re: /^Uses\s+your\s+local\s+clone,\s*(.+)$/i, fn: (m) => `使用本地克隆：${m[1]}` },
    { re: /^Are\s+you\s+sure\s+you\s+want\s+to\s+delete\s+the\s+hook\s+"(.+?)"\?$/i, fn: (m) => `确定要删除钩子“${m[1]}”吗？` },
    {
      re: /^No\s+(matching|remote)\s+(.+)$/i,
      fn: (m) => {
        const nMap = {
          hosts: '主机',
          repositories: '仓库',
          repos: '仓库',
          workspaces: '工作区',
          projects: '项目',
          branches: '分支',
          bundles: '插件包',
        };
        const noun = ownLookup(nMap, m[2].toLowerCase()) || dictLookup(m[2]) || m[2];
        return `${m[1].toLowerCase() === 'matching' ? '无匹配的' : '无远程'}${noun}`;
      },
    },
    { re: /^Every\s+hour\s+at\s+:(\d{2})$/i, fn: (m) => `每小时第 ${m[1]} 分钟` },
    {
      re: /^Every\s+(\d+)\s+(minutes?|hours?)(.*)$/i,
      fn: (m) => `每 ${m[1]} ${m[2].toLowerCase().startsWith('min') ? '分钟' : '小时'}${m[3]}`,
    },
    {
      re: /^Every\s+hour,\s*(.+?)\s+to\s+(.+?)(?:,\s*on\s+(.+))?$/i,
      fn: (m) => (m[3] ? `每小时（${m[1]} 至 ${m[2]}，限 ${m[3]}）` : `每小时（${m[1]} 至 ${m[2]}）`),
    },
    {
      re: /^(Daily|Monthly\s+on\s+the\s+(.+?))\s+at\s+(.+)$/i,
      fn: (m) => (m[2] ? `每月 ${m[2].replace(/(?:st|nd|rd|th)$/i, '')} 日 ${m[3]}` : `每天 ${m[3]}`),
    },
    {
      re: /^Runs\s+even\s+when\s+your\s+computer\s+is\s+off\.\s*(Schedules\s+and\s+events|Schedules\s+only)\.?$/i,
      fn: (m) =>
        `即使您的电脑关机也会照常运行。${m[1].toLowerCase().includes('events') ? '支持定时计划与事件触发。' : '仅支持定时计划。'}`,
    },
    {
      re: /^Credentials\s+expire\s+in\s+(.+?)\.\s*Refresh\s+credentials\s+to\s+keep\s+this\s+automation\s+running$/i,
      fn: (m) => `凭据将在 ${translateDuration(m[1])}后过期。请刷新凭据以保持此自动化继续运行`,
    },
    {
      re: /^You\s+have\s+(\d+)\s+conversations?\s+in\s+progress\.\s*Updating\s+will\s+interrupt\s+them,\s*and\s+they\s+will\s+automatically\s+resume\s+once\s+the\s+update\s+completes\.?$/i,
      fn: (m) => `您当前有 ${m[1]} 个正在进行的对话。更新将暂时中断它们，并在更新完成后自动恢复。`,
    },
    {
      re: /^You\s+have\s+(\d+)\s+conversations?\s+in\s+progress\.\s*Updating\s+will\s+cancel\s+them\s+and\s+you'll\s+need\s+to\s+manually\s+restart\s+them\.?$/i,
      fn: (m) => `您当前有 ${m[1]} 个正在进行的对话。更新将取消这些对话，更新后需要手动重启。`,
    },
    {
      re: /^(Web\s+app|Language\s+server|Release\s+channel):\s*(.+)$/i,
      fn: (m) => {
        const kMap = { 'web app': 'Web 应用', 'language server': '语言服务器', 'release channel': '发布渠道' };
        return `${ownLookup(kMap, m[1].toLowerCase()) || m[1]}：${m[2]}`;
      },
    },
    { re: /^Hidden\s+by\s+policy\s+\((.+)\)\.?$/i, fn: (m) => `已按策略隐藏 (${m[1]})。` },
    {
      re: /^(.+?)\s+is\s+paused\s+in\s+(.+?);\s*its\s+view\s+keeps\s+playing\s+here\.\s*Resume\s+to\s+let\s+it\s+continue\.?$/i,
      fn: (m) =>
        `${m[1] === 'The agent' ? '智能体' : m[1]}在 ${m[2]} 中已暂停；画面仍在此继续播放，点击恢复即可继续运行。`,
    },
    { re: /^Agent:\s*(.+)$/i, fn: (m) => `智能体：${m[1]}` },
    { re: /^Downloads,\s*(\d+)%\s*complete$/i, fn: (m) => `正在下载，已完成 ${m[1]}%` },
    { re: /^Show\s+(\d+)\s+earlier\s+steps?$/i, fn: (m) => `显示前 ${m[1]} 个步骤` },
    { re: /^Show\s+(\d+)\s+more\s+subagents?$/i, fn: (m) => `再显示 ${m[1]} 个子智能体` },
    { re: /^\+(\d+)\s+more\s*\(Show\s+all\)$/i, fn: (m) => `另外 ${m[1]} 项（显示全部）` },
    { re: /^Showing\s+first\s+(\d+)\s+references$/i, fn: (m) => `仅显示前 ${m[1]} 个引用` },
    { re: /^(\d+)\s+conversations?\s+in\s+progress$/i, fn: (m) => `${m[1]} 个进行中的对话` },
    {
      re: /^(\d+)\s+(active|archived)\s+conversations?$/i,
      fn: (m) => `${m[1]} 个${m[2].toLowerCase() === 'active' ? '活跃' : '已归档'}对话`,
    },
    { re: /^Marked\s+(\d+)\s+conversations?\s+as\s+read$/i, fn: (m) => `已将 ${m[1]} 个对话标为已读` },
    { re: /^(\d+)\s+browser\s+steps?$/i, fn: (m) => `${m[1]} 个浏览器步骤` },
    {
      re: /^(\d+)\s+(image|video|audio)\s+attachments?$/i,
      fn: (m) => {
        const typeMap = { image: '图片', video: '视频', audio: '音频' };
        return `${m[1]} 个${ownLookup(typeMap, m[2].toLowerCase()) || m[2]}附件`;
      },
    },
    { re: /^(\d+)\s+MCP\s+servers?\s+failed\s+to\s+start$/i, fn: (m) => `${m[1]} 个 MCP 服务器启动失败` },
    {
      re: /^Sort\s+and\s+filter\s+conversations\s+\((\d+)\s+active\)$/i,
      fn: (m) => `排序与筛选对话（${m[1]} 个启用）`,
    },
    {
      re: /^(?:The\s+preview\s+did\s+not\s+respond\s+on\s+port\s+(\d+)|Nothing\s+is\s+running\s+on\s+port\s+(\d+))\.?$/i,
      fn: (m) => (m[1] ? `端口 ${m[1]} 上的预览未响应。` : `端口 ${m[2]} 上没有运行中的服务`),
    },
    {
      re: /^Your\s+quota\s+for\s+(.+?)\s+will\s+reset\s+on\s+(.+?)\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
      fn: (m) => `您的 ${m[1]} 配额将于 ${m[2]} 重置。请切换至其他可用模型继续使用。`,
    },
    {
      re: /^Your\s+quota\s+for\s+(.+?)\s+has\s+been\s+reached\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
      fn: (m) => `您的 ${m[1]} 配额已用尽。请切换至其他可用模型继续使用。`,
    },
    {
      re: /^(.+?)\s+is\s+no\s+longer\s+available\.\s*(?:Runs\s+use\s+(.+?)\s+instead|Runs\s+will\s+fail\s+until\s+you\s+pick\s+another\s+model)\.?$/i,
      fn: (m) =>
        m[2]
          ? `${m[1]} 已不可用，后续运行将改用 ${m[2]}。`
          : `${m[1]} 已不可用，在您选择其他模型之前运行将会失败。`,
    },
    // 外观取色器、MCP 开关 aria-label 与语音引擎前缀兜底规则
    {
      re: /^(.+?)\s+color\s+picker$/i,
      fn: (m) => {
        const rawLabel = dictLookup(m[1]) || translateString(m[1]) || m[1];
        return `${/色$/.test(rawLabel) ? rawLabel : rawLabel + '颜色'}选择器`;
      },
    },
    {
      re: /^Toggle\s+(.+)$/i,
      fn: (m) => {
        if (
          m[1].length > 64 ||
          (/\b(?:to|and|the|for|that|which)\b/i.test(m[1]) && m[1].length > 32)
        ) {
          return null;
        }
        const target = dictLookup(m[1]) || translateString(m[1]) || m[1];
        const sep = /^[\u4e00-\u9fff]/.test(target) ? '' : ' ';
        return `切换${sep}${target}`;
      },
    },
    {
      re: /^Powered\s+by\s+Gemini\s+Live(?:\s*[·•]\s*(.*))?$/i,
      fn: (m) => {
        if (!m[1] || !m[1].trim()) {
          return /[·•]/.test(m[0]) ? '由 Gemini Live 提供支持 ·' : '由 Gemini Live 提供支持';
        }
        const tailStr = dictLookup(m[1]) || translateString(m[1]) || m[1];
        return `由 Gemini Live 提供支持 · ${tailStr}`;
      },
    },
    // --- 11. 配额刷新、方案升级、1.5.9 动态提示与尾部通用文件动作兜底 ---
    {
      re: /^You(?:'ve|\s+have)\s+used\s+(some|most|all|[\d.]+%)\s+of\s+your\s+(.+?)\s+(?:usage\s+)?limit[,;.]\s*it\s+will\s+(fully\s+|partially\s+)?(?:refresh|reset)\s+in\s+(.+?)\.?$/i,
      fn: (m) => {
        const amtMap = { some: '部分', most: '大部分', all: '全部' };
        const rawAmt = m[1].toLowerCase();
        const win = translateQuotaWindow(m[2]);
        const advRaw = (m[3] || '').trim().toLowerCase();
        const adv = advRaw === 'fully' ? '完全' : advRaw === 'partially' ? '部分' : '';
        const dur = translateQuotaDuration(m[4]);
        const durLead = /^[\u4e00-\u9fff]/.test(dur) ? '' : ' ';
        if (rawAmt === 'all') {
          return `您已用尽${win}，将在${durLead}${dur}后${adv}刷新。`;
        }
        const prefix = ownLookup(amtMap, rawAmt);
        const usedDesc = prefix ? `您已使用${prefix}${win}` : `您已使用 ${m[1]} 的${win}`;
        return `${usedDesc}，将在${durLead}${dur}后${adv}刷新。`;
      },
    },
    {
      re: /^You(?:'ve|\s+have)\s+(?:reached|exhausted|hit)\s+your\s+(.+?)\s+(?:usage\s+)?limit[,;.]\s*it\s+will\s+(fully\s+|partially\s+)?(?:refresh|reset)\s+in\s+(.+?)\.?$/i,
      fn: (m) => {
        const win = translateQuotaWindow(m[1]);
        const advRaw = (m[2] || '').trim().toLowerCase();
        const adv = advRaw === 'fully' ? '完全' : advRaw === 'partially' ? '部分' : '';
        const dur = translateQuotaDuration(m[3]);
        const durLead = /^[\u4e00-\u9fff]/.test(dur) ? '' : ' ';
        return `您已达到${win}上限，将在${durLead}${dur}后${adv}刷新。`;
      },
    },
    {
      re: /^You(?:'ve|\s+have)\s+not\s+used\s+any\s+of\s+your\s+(.+?)\s+(?:usage\s+)?limit\.?$/i,
      fn: (m) => `您尚未使用任何${translateQuotaWindow(m[1])}。`,
    },
    {
      re: /^It\s+will\s+(fully\s+|partially\s+)?(?:refresh|reset)\s+in\s+(.+?)\.?$/i,
      fn: (m) => {
        const advRaw = (m[1] || '').trim().toLowerCase();
        const adv = advRaw === 'fully' ? '完全' : advRaw === 'partially' ? '部分' : '';
        const dur = translateQuotaDuration(m[2]);
        const durLead = /^[\u4e00-\u9fff]/.test(dur) ? '' : ' ';
        return `将在${durLead}${dur}后${adv}刷新。`;
      },
    },
    {
      re: /^You\s+can\s+upgrade\s+to\s+a\s+(higher\s+)?(.+?)\s+plan\s+to\s+receive\s+(the\s+highest|higher)\s+rate\s+limits\.?$/i,
      fn: (m) =>
        `您可以升级到${m[1] ? '更高等级的 ' : ''}${m[2]} 套餐，以获取${/highest/i.test(m[3]) ? '最高' : '更高'}速率限额。`,
    },
    // 用量弹窗限额窗口与重置时间组合（如 "5h limit"、"Daily limit, resets in 4h 23m"）
    {
      re: /^(\d+[smhd])\s+limit$/i,
      fn: (m) => translateQuotaWindow(m[1]),
    },
    {
      re: /^(Daily|Weekly|Monthly|Hourly|5-hour|Five-hour|\d+[smhd])\s+limit,\s*resets\s+in\s+(.+)$/i,
      fn: (m) => {
        const win = translateQuotaWindow(m[1]);
        const dur = translateQuotaDuration(m[2]);
        const durLead = /^[\u4e00-\u9fff]/.test(dur) ? '' : ' ';
        return `${win}，将在${durLead}${dur}后重置`;
      },
    },
    // AI 积分不足与基础配额刷新多句拼接提示（ycc 组合态）
    {
      re: /^(?:You\s+need\s+(?:at\s+least\s+(\d+)|more)\s+AI\s+Credits\s+to\s+send\s+messages\.\s*To\s+continue\s+using\s+(.+?)\s+now,\s*purchase\s+more\s+AI\s+Credits\.\s*)?(?:Your\s+plan's\s+baseline\s+quota\s+will\s+refresh\s+on\s+(.+?)\.\s*)?(?:To\s+continue\s+using\s+this\s+model\s+now,\s*enable\s+AI\s+Credit\s+overages\.?)?$/i,
      fn: (m) => {
        if (!m[0] || (!m[2] && !m[3] && !/overages/i.test(m[0]))) return null;
        const parts = [];
        if (m[2]) {
          const need = m[1] ? `至少 ${m[1]} 个` : '更多';
          const model = m[2].toLowerCase() === 'this model' ? '此模型' : m[2];
          parts.push(`发送消息需要${need} AI 积分。如需立即继续使用 ${model}，请购买更多 AI 积分。`);
        }
        if (m[3]) {
          parts.push(`您套餐的基础配额将于 ${m[3]} 刷新。`);
        }
        if (/enable\s+AI\s+Credit\s+overages/i.test(m[0])) {
          parts.push('如需立即继续使用此模型，请开启 AI 积分超额抵扣。');
        }
        return parts.length > 0 ? parts.join(' ') : null;
      },
    },
    {
      re: /^Your\s+Plan:\s*(.+)$/i,
      fn: (m) => `当前套餐：${m[1].trim()}`,
    },
    {
      re: /^((?:Gemini|Claude|GPT|O[134]|Llama|DeepSeek|Qwen|Mistral)[^\n()]{1,60})\s*\((Extra\s+High|Very\s+High|Ultra\s+High|XHigh|Minimal|Low|Medium|High|Max|Maximum)(\s+Thinking)?\)$/i,
      fn: (m) => {
        const zh = mapEffortLabel(m[2]);
        return zh ? `${m[1].trim()}（${zh}${m[3] ? '思考' : ''}）` : null;
      },
    },
    {
      re: /^(Project|Workspace|Global|Local|Remote|Cloud|User|Default|Organization|Team|App|System|This\s+Computer)\s+setting$/i,
      fn: (m) => {
        const mapped = dictLookup(m[1].trim());
        return mapped ? `${mapped}设置` : null;
      },
    },
    {
      re: /^(Agent\s+execution|Agent)\s+terminated\s+due\s+to\s+error(?::\s*([\s\S]+))?\.?$/i,
      fn: (m) => {
        const subj = /^agent\s+execution$/i.test(m[1]) ? '智能体执行因错误而终止' : '智能体因错误而终止';
        if (m[2] && m[2].trim()) {
          return `${subj}：${m[2].trim()}`;
        }
        return `${subj}${/agent\s+execution/i.test(m[1]) ? '。' : ''}`;
      },
    },
    {
      re: /^Delete\s+cookies\s+for\s+(.+)$/i,
      fn: (m) => `删除 ${m[1]} 的 Cookie`,
    },
    {
      re: /^(?:These\s+plugins|This\s+plugin)\s+in\s+(.+?)\s+may\s+have\s+looser\s+code\s+review\.\s*Review\s+(?:their|its)\s+contents\s+before\s+adding\s+the\s+bundle\.?$/i,
      fn: (m) => `${m[1]} 中的插件代码审查可能较为宽松，请在添加插件包前仔细审阅其内容。`,
    },
    {
      re: /^Review\s+(.+?)\s+before\s+(installing|adding)$/i,
      fn: (m) => `${m[2].toLowerCase() === 'adding' ? '添加' : '安装'}前审阅 ${dictLookup(m[1]) || m[1]}`,
    },
    {
      re: /^Yes,\s+allow\s+downloads\s+from\s+(.+?)\s+(for\s+this\s+run|in\s+this\s+conversation)$/i,
      fn: (m) => `是，${/run/i.test(m[2]) ? '在本次运行中' : '在当前对话中'}允许从 ${m[1]} 下载`,
    },
    {
      re: /^Yes,\s+always\s+allow\s+downloads\s+from\s+(.+)$/i,
      fn: (m) => `是，始终允许从 ${m[1]} 下载`,
    },
    {
      re: /^Yes,\s+allow\s+(.+?)\s+in\s+this\s+conversation$/i,
      fn: (m) => `是，在当前对话中允许 ${m[1]}`,
    },
    {
      re: /^Yes,\s+always\s+allow\s+(.+)$/i,
      fn: (m) => `是，始终允许 ${m[1]}`,
    },
    {
      re: /^You\s+need\s+(.+?)\s+AI\s+Credits\s+to\s+send\s+messages\.\s*To\s+continue\s+using\s+(.+?)\s+now,\s*purchase\s+more\s+AI\s+Credits\.?$/i,
      fn: (m) => {
        const rawAmt = m[1].trim();
        let amtZh = rawAmt;
        if (/^more$/i.test(rawAmt)) {
          amtZh = '更多';
        } else if (/^at\s+least\s+(.+)$/i.test(rawAmt)) {
          amtZh = `至少 ${rawAmt.replace(/^at\s+least\s+/i, '').trim()} `;
        }
        const modelRaw = m[2].trim();
        const modelZh = /^this\s+model$/i.test(modelRaw) ? '此模型' : ` ${modelRaw}`;
        return `您需要${amtZh}AI 积分才能发送消息。要立即继续使用${modelZh}，请购买更多 AI 积分。`;
      },
    },
    {
      re: /^Plan,\s*(\d+)\s+of\s+(\d+)\s+steps?\s+done$/i,
      fn: (m) => `计划：已完成 ${m[1]} / ${m[2]} 步`,
    },
    {
      re: /^Step\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `第 ${m[1]} / ${m[2]} 步`,
    },
    {
      re: /^Turn\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `第 ${m[1]} / ${m[2]} 轮`,
    },
    {
      re: /^Go\s+to\s+turn\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `跳转到第 ${m[1]} / ${m[2]} 轮`,
    },
    {
      re: /^Still\s+thinking,\s*(\d+)\s+seconds?$/i,
      fn: (m) => `仍在思考，已耗时 ${m[1]} 秒`,
    },
    {
      re: /^Using\s+browser\s+\((.+)\)$/i,
      fn: (m) => `正在使用浏览器 (${translateDuration(m[1])})`,
    },
    {
      re: /^(Typed|Typing)\s+'(.+?)'\s+in\s+Browser$/i,
      fn: (m) => `${m[1].toLowerCase() === 'typed' ? '已在浏览器中输入' : '正在浏览器中输入'} '${m[2]}'`,
    },
    {
      re: /^Used\s+MCP\s+tool:\s*(.+)$/i,
      fn: (m) => `使用了 MCP 工具：${m[1]}`,
    },
    {
      re: /^No\s+(plugins|apps)\s+found\s+for\s+["“'](.+?)["”']\.?$/i,
      fn: (m) => `未找到匹配“${m[2]}”的${m[1].toLowerCase() === 'plugins' ? '插件' : '应用'}。`,
    },
    {
      re: /^Search\s+for\s+["“'](.+?)["”']\s+in\s+the\s+Marketplace$/i,
      fn: (m) => `在扩展市场中搜索“${m[1]}”`,
    },
    // --- 12. Antigravity v2.34.0 与 Gemini agy v1.5.13 新增动态句式规则 ---
    {
      re: /^Deleted\s+cookies\s+for\s+(.+)$/i,
      fn: (m) => `已删除 ${m[1]} 的 Cookie`,
    },
    {
      re: /^(\d+)\s+cookies?$/i,
      fn: (m) => `${m[1]} 个 Cookie`,
    },
    {
      re: /^Give\s+each\s+Best\s+of\s+N\s+fork\s+a\s+full\s+clone\s+of\s+your\s+workspace,\s*including\s+its\s+local\s+commit\s+history\.\s*Choosing\s+a\s+winner\s+then\s+gives\s+your\s+workspace\s+that\s+fork's\s+state,\s*so\s+the\s+commits\s+it\s+made\s+are\s+kept\.\s*Forks\s+take\s+longer\s+to\s+create\s+than\s+the\s+default\s+CitC\s+clone\.(?:\s+See\s+(.+?)\.?)?$/i,
      fn: (m) =>
        `为每个多路择优分支创建工作区的完整克隆（包含本地提交历史）。选定优胜分支后，当前工作区将采用该分支的状态，从而保留其创建的提交。创建分支所需时间会比默认的 CitC 克隆更长。${m[1] ? `详情参见 ${m[1]}。` : ''}`,
    },
    {
      re: /^Give\s+each\s+Best\s+of\s+N\s+fork\s+its\s+own\s+clone\s+of\s+your\s+Git\s+repository\s+instead\s+of\s+a\s+copy-on-write\s+overlay\.\s*Each\s+fork\s+is\s+then\s+a\s+real\s+repository,\s*so\s+commits\s+it\s+makes\s+are\s+kept\s+when\s+you\s+choose\s+it\s+as\s+the\s+winner\.\s*Forks\s+take\s+longer\s+to\s+create,\s*and\s+the\s+wait\s+grows\s+with\s+the\s+size\s+of\s+your\s+repository\.(?:\s+See\s+(.+?)\.?)?$/i,
      fn: (m) =>
        `为每个多路择优分支创建独立的 Git 仓库完整克隆（而非写时复制层）。每个分支都是真实的独立仓库，选为优胜分支后其提交记录将完整保留。创建分支耗时较长，且等待时间随仓库大小增长。${m[1] ? `详情参见 ${m[1]}。` : ''}`,
    },
    {
      re: /^When\s+toggled\s+on,\s*(.+?)\s+collects\s+usage\s+data\s+to\s+help\s+Google\s+enhance\s+performance\s+and\s+features\.\s*Telemetry\s+is\s+turned\s+off\s+for\s+your\s+account\.\s*This\s+means\s+(.+?)\s+does\s+not\s+collect\s+any\s+of\s+your\s+prompts,\s*content,\s*or\s+model\s+responses,\s*but\s+will\s+still\s+collect\s+general\s+usage\s+patterns\s*\(e\.g\.,\s*feature\s+adoption,\s*active\s+user\s+counts\)\.?$/i,
      fn: (m) =>
        `开启后，${m[1]} 将收集使用数据，以帮助 Google 提升性能和功能。\n\n您的账号已关闭遥测功能。这意味着 ${m[2]} 不会收集您的任何提示词、内容或模型回复，但仍会收集通用使用模式（例如功能采用率、活跃用户数）。`,
    },
    // 插件包安装与移除摘要句式
    {
      re: /^(\d+)\s+plugins?,\s*all\s+already\s+installed\.\s*Adding\s+the\s+bundle\s+installs\s+plugins\s+it\s+gains\s+later\.?$/i,
      fn: (m) => `共 ${m[1]} 个插件，均已安装。添加插件包后将自动安装该插件包后续新增的插件。`,
    },
    {
      re: /^(\d+)\s+plugins?\.\s*Adding\s+the\s+bundle\s+installs\s+plugins\s+it\s+gains\s+later\.?$/i,
      fn: (m) => `共 ${m[1]} 个插件。添加插件包后将自动安装该插件包后续新增的插件。`,
    },
    {
      re: /^(\d+)\s+plugins?\.\s*Add\s+bundle\s+installs\s+(?:all\s+of\s+them|it)\.?$/i,
      fn: (m) => `共 ${m[1]} 个插件。添加插件包后将${Number(m[1]) === 1 ? '安装该插件' : '全部安装'}。`,
    },
    {
      re: /^(\d+)\s+plugins?\.\s*Add\s+bundle\s+installs\s+(\d+);\s*the\s+ones\s+you\s+already\s+have\s+stay\s+as\s+they\s+are\.?$/i,
      fn: (m) => `共 ${m[1]} 个插件。添加插件包后将安装其中 ${m[2]} 个；您已安装的插件将保持不变。`,
    },
    {
      re: /^(\d+)\s+plugins?\.\s*Disabling\s+or\s+removing\s+the\s+bundle\s+applies\s+only\s+to\s+the\s+ones\s+it\s+installed\.?$/i,
      fn: (m) => `共 ${m[1]} 个插件。禁用或移除插件包仅影响由该插件包安装的插件。`,
    },
    {
      re: /^This\s+(plugin|skill|bundle)'s\s+source\s+is\s+in\s+(.+?),\s*which\s+can\s+have\s+looser\s+review\s+standards\s+than\s+standard\s+Google\s+code\.\s*Review\s+its\s+contents\s+before\s+installing\.?$/i,
      fn: (m) => {
        const kMap = { plugin: '插件', skill: '技能', bundle: '插件包' };
        return `此${ownLookup(kMap, m[1].toLowerCase()) || m[1]}的源码位于 ${m[2]}，其审查标准可能低于标准 Google 代码。请在安装前仔细审阅其内容。`;
      },
    },
    // 步骤计划、子智能体/计时器组合状态、倒计时与浏览器实时状态
    {
      re: /^(\d+)\/(\d+)\s+steps?$/i,
      fn: (m) => `${m[1]}/${m[2]} 步`,
    },
    {
      re: /^(.+?)\.\s*(Hide|Show)\s+plan$/i,
      fn: (m) => {
        const left = translateString(m[1]) || m[1];
        return `${left}。${m[2].toLowerCase() === 'hide' ? '隐藏' : '显示'}计划`;
      },
    },
    {
      re: /^(\d+)\s+(skipped|blocked)$/i,
      fn: (m) => `${m[1]} ${m[2].toLowerCase() === 'skipped' ? '项已跳过' : '个已阻塞'}`,
    },
    {
      re: /^(?:(?:Waiting\s+for\s+(?:\d+\s+timers?|(?:.+?\s+)?timer)|\d+\s+(?:subagents?\/tasks|subagents?|tasks?)\s+(?:running|blocked)|\d+\s+blocked)(?:,\s*(?:\d+\s+(?:subagents?\/tasks|subagents?|tasks?)\s+(?:running|blocked)|\d+\s+blocked))+)$/i,
      fn: (m) => m[0].split(/,\s*/).map((seg) => translateString(seg) || seg).join('，'),
    },
    {
      re: /^(\d+)\s+(subagents?\/tasks|subagents?|tasks?)\s+(running|blocked)$/i,
      fn: (m) => {
        const nMap = {
          subagent: '个子智能体',
          subagents: '个子智能体',
          task: '个任务',
          tasks: '个任务',
          'subagent/tasks': '个子智能体/任务',
          'subagents/tasks': '个子智能体/任务',
        };
        const st = m[3].toLowerCase() === 'running' ? '运行中' : '已阻塞';
        return `${m[1]} ${ownLookup(nMap, m[2].toLowerCase()) || m[2]}${st}`;
      },
    },
    {
      re: /^Waiting\s+for\s+(\d+)\s+timers?$/i,
      fn: (m) => `等待 ${m[1]} 个计时器`,
    },
    {
      re: /^Waiting\s+for\s+((?:.+?\s+)?timer)$/i,
      fn: (m) => (m[1].toLowerCase() === 'timer' ? '等待计时器' : `等待 ${m[1]}`),
    },
    {
      re: /^((?:\d+d\s*)?(?:\d+h\s*)?(?:\d+m\s*)?(?:\d+s)?)\s+left$/i,
      fn: (m) => {
        const dur = (m[1] || '').trim();
        return dur && /\d[dhms]$/i.test(dur) ? `剩余 ${translateDuration(dur)}` : null;
      },
    },
    {
      re: /^Thinking\s*\((\d+)s\)(?:…|\.\.\.)$/i,
      fn: (m) => `思考中 (${m[1]} 秒)…`,
    },
    {
      re: /^Using\s+browser\s*·\s*(.+?)\s*\((\d+)s\)$/i,
      fn: (m) => `正在使用浏览器 · ${translateString(m[1]) || m[1]} (${m[2]} 秒)`,
    },
    {
      re: /^Showing\s+latest\s+(\d+)\s+browser\s+steps?$/i,
      fn: (m) => `显示最近 ${m[1]} 个浏览器步骤`,
    },
    {
      re: /^(Generat(?:e|ing|ed))\s+with\s+(.+?)(\s*🍌)?$/i,
      fn: (m) => {
        const vMap = { generate: '使用', generating: '正在使用', generated: '已使用' };
        const act = ownLookup(vMap, m[1].toLowerCase()) || m[1];
        const tail = m[1].toLowerCase() === 'generating' ? '生成中' : '生成';
        return `${act} ${m[2]} ${tail}${m[3] || ''}`;
      },
    },
    // 内联权限与交互询问卡片
    {
      re: /^Requesting\s+permission\s+to\s+(read|write|run\s*\(unsandboxed\)|run|use|download\s+from|grant\s+administrator\s+access\s+for|access)\s+(.+)$/i,
      fn: (m) => {
        const aMap = {
          read: '读取',
          write: '写入',
          run: '运行',
          'run (unsandboxed)': '在沙盒外运行',
          use: '使用',
          'download from': '从以下来源下载：',
          'grant administrator access for': '授予管理员权限以执行：',
          access: '访问',
        };
        const act = ownLookup(aMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1];
        return `请求权限以${act}${/[：:]$/.test(act) ? '' : ' '}${m[2]}`;
      },
    },
    {
      re: /^Conflicts\s+with\s+your\s+configured\s+Ask\s+permission:\s*(.+)$/i,
      fn: (m) => `与您配置的“询问”权限冲突：${m[1]}`,
    },
    {
      re: /^Requires\s+manual\s+confirmation:\s*(.+)$/i,
      fn: (m) => `需要手动确认：${m[1]}`,
    },
    {
      re: /^Allow\s+(read\s+access\s+to\s+this\s+path|write\s+access\s+to\s+this\s+path|reading\s+this\s+URL|executing\s+actions\s+on\s+this\s+URL|browser\s+downloads\s+from\s+this\s+site|running\s+this\s+command\s+outside\s+the\s+sandbox|running\s+this\s+command|using\s+this\s+MCP\s+tool|a\s+one-time\s+administrator\s+\(UAC\)\s+elevation|access\s+to\s+this\s+resource)\?$/i,
      fn: (m) => {
        const pMap = {
          'read access to this path': '读取此路径',
          'write access to this path': '写入此路径',
          'reading this url': '读取此 URL',
          'executing actions on this url': '在此 URL 上执行操作',
          'browser downloads from this site': '浏览器从此网站下载文件',
          'running this command': '运行此命令',
          'running this command outside the sandbox': '在沙盒外运行此命令',
          'using this mcp tool': '使用此 MCP 工具',
          'a one-time administrator (uac) elevation': '一次性管理员 (UAC) 提权',
          'access to this resource': '访问此资源',
        };
        return `允许${ownLookup(pMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1]}吗？`;
      },
    },
    {
      re: /^Open\s+Subagent:\s*(.+)$/i,
      fn: (m) => `打开子智能体：${m[1]}`,
    },
    {
      re: /^Dismiss(?:ed)?:\s*(.+)$/i,
      fn: (m) => `${/^dismissed/i.test(m[0]) ? '已忽略' : '忽略'}：${m[1]}`,
    },
    {
      re: /^Skipped(?::\s*|\s+)(.+)$/i,
      fn: (m) => (m[1].length <= 80 ? `已跳过：${m[1]}` : null),
    },
    {
      re: /^Please\s+retry:\s*(.+)$/i,
      fn: (m) => `请重试：${m[1]}`,
    },
    {
      re: /^Sent\s+response:\s*(.+)$/i,
      fn: (m) => `已发送回复：${m[1]}`,
    },
    {
      re: /^Failed\s+to\s+send\s+(response|interaction|cancellation):\s*(.+)$/i,
      fn: (m) => {
        const kMap = { response: '回复', interaction: '交互', cancellation: '取消请求' };
        return `发送${ownLookup(kMap, m[1].toLowerCase()) || m[1]}失败：${m[2]}`;
      },
    },
    // 本机电脑权限引导与实时预览状态
    {
      re: /^(.+?)\s+needs\s+(Accessibility|Screen\s+Recording|both)\s+to\s+use\s+your\s+computer\.?$/i,
      fn: (m) => {
        const subj = /^the\s+app$/i.test(m[1]) ? '此应用' : m[1];
        const sep = /[\u4e00-\u9fff]$/.test(subj) ? '' : ' ';
        const pMap = { accessibility: '“辅助功能”权限', 'screen recording': '“屏幕录制”权限', both: '“辅助功能”和“屏幕录制”权限' };
        return `${subj}${sep}需要${ownLookup(pMap, m[2].toLowerCase().replace(/\s+/g, ' ')) || m[2]}才能操作您的电脑。`;
      },
    },
    {
      re: /^Relaunch\s+(.+?)\s+to\s+finish\s+Screen\s+Recording\.?$/i,
      fn: (m) => {
        const app = /^the\s+app$/i.test(m[1]) ? '应用' : m[1];
        const sep = /^[\u4e00-\u9fff]/.test(app) ? '' : ' ';
        return `重新启动${sep}${app}${sep}以完成“屏幕录制”权限设置。`;
      },
    },
    {
      re: /^(Open|Reopen)\s+(Accessibility|Screen\s+Recording)\s+settings$/i,
      fn: (m) => `${m[1].toLowerCase() === 'reopen' ? '重新打开' : '打开'}${m[2].toLowerCase() === 'accessibility' ? '辅助功能' : '屏幕录制'}设置`,
    },
    {
      re: /^(Accessibility|Screen\s+Recording)\s+settings$/i,
      fn: (m) => `${m[1].toLowerCase() === 'accessibility' ? '辅助功能' : '屏幕录制'}设置`,
    },
    {
      re: /^(\d+)\s+agents?\s+working,\s*live\s+preview\s+unavailable$/i,
      fn: (m) => `${m[1]} 个智能体工作中，实时预览不可用`,
    },
    {
      re: /^Live\s+preview\s+unavailable\s*·\s*(.+)$/i,
      fn: (m) => `实时预览不可用 · ${dictLookup(m[1]) || m[1]}`,
    },
    // 自动化定时计划与下次运行时间
    {
      re: /^Next\s+run\s+(today|tomorrow|on\s+.+?)\s+around\s+(.+)$/i,
      fn: (m) => {
        const dayMap = {
          today: '今天',
          tomorrow: '明天',
          'on sunday': '周日',
          'on monday': '周一',
          'on tuesday': '周二',
          'on wednesday': '周三',
          'on thursday': '周四',
          'on friday': '周五',
          'on saturday': '周六',
        };
        const k = m[1].toLowerCase().replace(/\s+/g, ' ');
        const dayZh = ownLookup(dayMap, k) || `在 ${m[1].replace(/^on\s+/i, '')}`;
        return `下次运行：${dayZh} ${m[2]} 左右`;
      },
    },
    {
      re: /^Running\s+for\s+(.+)$/i,
      fn: (m) => `已运行 ${translateDuration(m[1])}`,
    },
    {
      re: /^Up\s+(\d+(?:[dhms]|\s*(?:days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)).*)$/i,
      fn: (m) => `已运行 ${translateDuration(m[1])}`,
    },
    {
      re: /^Managed\s+by\s+the\s+(.+?)\s+(plugin|automation)$/i,
      fn: (m) => {
        const kind = m[2].toLowerCase() === 'plugin' ? '插件' : '自动化任务';
        const nm = m[1].toLowerCase() === m[2].toLowerCase() ? '' : ` ${m[1]} `;
        return `由${nm}${kind}管理`;
      },
    },
    {
      re: /^Agents\s+created\s+by\s+this\s+(.+?)\s+run\s+in\s+a\s+dedicated\s+(project|workspace)\s+with\s+its\s+own\s+permissions\.\s*You\s+can\s+change\s+the\s+permissions\s+in\s+the\s+(?:project|workspace)\s+settings\s+page\.?$/i,
      fn: (m) => {
        const scope = m[2].toLowerCase() === 'project' ? '项目' : '工作区';
        const kind = m[1].toLowerCase() === 'automation' ? '自动化任务' : m[1];
        return `由此${kind}创建的智能体将在拥有独立权限的专用${scope}中运行。您可以在${scope}设置页面中更改这些权限。`;
      },
    },
    {
      re: /^Connect\s+an\s+account\s+for\s+(.+?)\s+so\s+the\s+agent\s+can\s+run\s+automations\.?$/i,
      fn: (m) => `请连接 ${m[1]} 账号，以便智能体运行自动化任务。`,
    },
    {
      re: /^Sign-ins\s+to\s+(.+?)\s+are\s+kept\s+in\s+the\s+cloud\s+with\s+your\s+account\.?$/i,
      fn: (m) => `${m[1]} 的登录状态会随您的账号保存在云端。`,
    },
    {
      re: /^(.+?)\s+needs?\s+the\s+terminal\s+sandbox,\s*which\s+isn't\s+available\s+on\s+this\s+host\.?$/i,
      fn: (m) => `${m[1]} 需要终端沙盒，但此主机不支持终端沙盒。`,
    },
    // 首页问候语、历史消息加载、模型重试与内置浏览器错误页
    {
      re: /^Hey\s+(.+?),\s*what\s+should\s+we\s+build\s+today\?$/i,
      fn: (m) => `你好 ${m[1]}，今天想一起构建什么？`,
    },
    {
      re: /^Welcome\s+back,\s*(.+?)\.\s*Where\s+should\s+we\s+pick\s+up\?$/i,
      fn: (m) => `欢迎回来，${m[1]}。我们从哪里继续？`,
    },
    {
      re: /^Good\s+to\s+see\s+you,\s*(.+?)\.\s*What's\s+next\?$/i,
      fn: (m) => `很高兴见到你，${m[1]}。接下来要做什么？`,
    },
    {
      re: /^Welcome\s+to\s+(.+?)!$/i,
      fn: (m) => `欢迎使用 ${m[1]}！`,
    },
    {
      re: /^No\s+messages\s+in\s+last\s+(\d+)\s+steps?\s*(?:—|·|,)\s*(load\s+older|Load\s+more)$/i,
      fn: (m) => `最近 ${m[1]} 个步骤中没有消息 · ${/more/i.test(m[2]) ? '加载更多' : '加载更早消息'}`,
    },
    {
      re: /^No\s+visible\s+messages\s+in\s+last\s+(\d+)\s+steps?\.\s*Activate\s+Load\s+older\s+messages\s+to\s+continue\.?$/i,
      fn: (m) => `最近 ${m[1]} 个步骤中没有可见消息，请点击“加载更早消息”以继续。`,
    },
    {
      re: /^Model\s+unavailable,\s*retrying(?:\s+in\s+(\d+)s)?(.*)$/i,
      fn: (m) => `模型不可用，${m[1] ? `将在 ${m[1]} 秒后重试` : '正在重试'}${m[2] || ''}`,
    },
    {
      re: /^No\s+server\s+is\s+listening\s+on\s+port\s+(\d+)\s+inside\s+the\s+remote\s+workspace\.\s*Start\s+it,\s*or\s+ask\s+the\s+agent\s+to,\s*then\s+retry\.?$/i,
      fn: (m) => `远程工作区中的端口 ${m[1]} 上没有正在监听的服务。请启动服务（或让智能体启动），然后重试。`,
    },
    {
      re: /^Resume\s+the\s+conversation\s+to\s+start\s+its\s+workspace\s+again,\s*then\s+start\s+the\s+server\s+on\s+port\s+(\d+)\s+and\s+retry\.?$/i,
      fn: (m) => `请先恢复对话以重新启动其工作区，然后在端口 ${m[1]} 上启动服务并重试。`,
    },
    {
      re: /^(.+?)\s+(refused\s+to\s+connect|took\s+too\s+long\s+to\s+respond|could\s+not\s+find\s+the\s+requested\s+page|is\s+currently\s+unable\s+to\s+handle\s+this\s+request)\.?$/i,
      fn: (m) => {
        if (m[1].length > 90 || /\s{2,}/.test(m[1])) return null;
        const msgMap = {
          'refused to connect': '拒绝了连接请求。',
          'took too long to respond': '响应时间过长。',
          'could not find the requested page': '未找到所请求的页面。',
          'is currently unable to handle this request': '当前无法处理此请求。',
        };
        return `${m[1]} ${ownLookup(msgMap, m[2].toLowerCase().replace(/\s+/g, ' ')) || m[2]}`;
      },
    },
    {
      re: /^(.+?)[’']s\s+server\s+IP\s+address\s+could\s+not\s+be\s+found\.?$/i,
      fn: (m) => `找不到 ${m[1]} 的服务器 IP 地址。`,
    },
    {
      re: /^Check\s+if\s+there\s+is\s+a\s+typo\s+in\s+(.+?),\s*or\s+open\s+the\s+page\s+in\s+your\s+external\s+browser\.?$/i,
      fn: (m) => `请检查 ${m[1] === 'the address' ? '网址' : m[1]} 是否有拼写错误，或在外部浏览器中打开该页面。`,
    },
    {
      re: /^The\s+certificate\s+was\s+rejected\s+\((.+?)\)\.?$/i,
      fn: (m) => `证书已被拒绝 (${m[1]})。`,
    },
    // 听写语言排序、插件/MCP/项目/Git/PDF 及其他动态界面句式
    {
      re: /^Move\s+(.+?)\s+(earlier|later)$/i,
      fn: (m) => `将 ${m[1]} ${m[2].toLowerCase() === 'earlier' ? '前移' : '后移'}`,
    },
    {
      re: /^(\d+)\s+accounts?$/i,
      fn: (m) => `${m[1]} 个账号`,
    },
    {
      re: /^(\d+)\s+(days?|seconds?|turns?)$/i,
      fn: (m) => {
        const u = m[2].toLowerCase();
        const zhU = u.startsWith('day') ? '天' : u.startsWith('sec') ? '秒' : '轮';
        return `${m[1]} ${zhU}`;
      },
    },
    {
      re: /^\+(\d+)\s+more$/i,
      fn: (m) => `另外 ${m[1]} 项`,
    },
    {
      re: /^See\s+(\d+)\s+more(?:\s+(.+))?$/i,
      fn: (m) => (m[2] ? `查看更多 ${m[1]} 个 ${dictLookup(m[2]) || m[2]}` : `再看 ${m[1]} 项`),
    },
    {
      re: /^Add\s*\((\d+)\)$/i,
      fn: (m) => `添加 (${m[1]})`,
    },
    {
      re: /^(\d+)\s+folders?\s+in\s+this\s+project\s+could\s+not\s+be\s+loaded\s+because\s+their\s+locations\s+are\s+invalid\.?$/i,
      fn: (m) => `此项目中有 ${m[1]} 个文件夹因位置无效而无法加载。`,
    },
    {
      re: /^Could\s+not\s+apply\s+the\s+selected\s+permissions:\s*(.+)$/i,
      fn: (m) => `无法应用所选权限：${m[1]}`,
    },
    {
      re: /^Failed\s+to\s+create\s+project:\s*(.+)$/i,
      fn: (m) => `创建项目失败：${m[1]}`,
    },
    {
      re: /^Failed\s+to\s+delete\s+(project|workspace):\s*(.+)$/i,
      fn: (m) => `删除${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}失败：${m[2]}`,
    },
    {
      re: /^(Project|Workspace)\s+(Settings|archived|deleted)$/i,
      fn: (m) => {
        const p = m[1].toLowerCase() === 'project' ? '项目' : '工作区';
        const sMap = { settings: '设置', archived: '已归档', deleted: '已删除' };
        return `${p}${ownLookup(sMap, m[2].toLowerCase()) || m[2]}`;
      },
    },
    {
      re: /^(Archive|Copy)\s+(Project|Workspace)(?:\s+Name)?$/i,
      fn: (m) => {
        const p = m[2].toLowerCase() === 'project' ? '项目' : '工作区';
        return m[1].toLowerCase() === 'archive' ? `归档${p}` : `复制${p}名称`;
      },
    },
    {
      re: /^Creating\s+(project|workspace)(?:…|\.\.\.)$/i,
      fn: (m) => `正在创建${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}…`,
    },
    {
      re: /^Opens\s+the\s+New\s+Conversation\s+screen\s+for\s+this\s+(project|workspace)$/i,
      fn: (m) => `为此${m[1].toLowerCase() === 'project' ? '项目' : '工作区'}打开新建对话页面`,
    },
    {
      re: /^(.+?)\s+\((Default|Archived|latest|unavailable|write-in)\)$/i,
      fn: (m) => {
        const tMap = { default: '默认', archived: '已归档', latest: '最新', unavailable: '不可用', 'write-in': '自定义输入' };
        return `${m[1]}（${ownLookup(tMap, m[2].toLowerCase()) || m[2]}）`;
      },
    },
    {
      re: /^(.+?),\s*(error|setup\s+required)$/i,
      fn: (m) => `${m[1]}，${m[2].toLowerCase() === 'error' ? '出错' : '需要配置'}`,
    },
    {
      re: /^(Enable|Disable)\s+(.+?)\s+tool\s+for\s+(.+)$/i,
      fn: (m) => `为 ${m[3]} ${m[1].toLowerCase() === 'enable' ? '启用' : '禁用'} ${m[2]} 工具`,
    },
    {
      re: /^Configure\s+(.+?),\s*values\s+missing$/i,
      fn: (m) => `配置 ${m[1]}（缺少必填值）`,
    },
    {
      re: /^Fix\s+with\s+Agent:\s*(.+)$/i,
      fn: (m) => `让智能体修复：${m[1]}`,
    },
    {
      re: /^Plugins\s+in\s+(.+)$/i,
      fn: (m) => `${m[1]} 中的插件`,
    },
    {
      re: /^(Skill|Plugin)\s+installed:\s*(.+)$/i,
      fn: (m) => `已安装${m[1].toLowerCase() === 'skill' ? '技能' : '插件'}：${m[2]}`,
    },
    {
      re: /^Signed\s+in:\s*(.+)$/i,
      fn: (m) => `已登录：${m[1]}`,
    },
    {
      re: /^(.+?)\s+needs\s+you\s+to\s+sign\s+in\s+before\s+it\s+can\s+be\s+used\.?$/i,
      fn: (m) => `使用 ${m[1]} 前需要先登录。`,
    },
    {
      re: /^(Connect|Disconnect|Reconnect|Install|Pause|Resume|Restart)\s+([A-Za-z0-9_.-][A-Za-z0-9_.\s-]{0,48})$/,
      fn: (m) => {
        if (/\b(?:to|for|with|and|or|your|the|a|an|on|in|from)\b/i.test(m[2])) return null;
        const aMap = { connect: '连接', disconnect: '断开连接', reconnect: '重新连接', install: '安装', pause: '暂停', resume: '恢复', restart: '重启' };
        return `${ownLookup(aMap, m[1].toLowerCase()) || m[1]} ${m[2]}`;
      },
    },
    {
      re: /^Run\s+(.+?)\s+now$/i,
      fn: (m) => (m[1].length <= 60 ? `立即运行 ${m[1]}` : null),
    },
    {
      re: /^Review\s+permissions\s+for\s+(.+)$/i,
      fn: (m) => `审阅 ${m[1]} 的权限`,
    },
    {
      re: /^Set\s+up\s+(.+)$/i,
      fn: (m) => (m[1].length <= 48 && !/\b(?:the|to|for|with|and|or)\b/i.test(m[1]) ? `配置 ${m[1]}` : null),
    },
    {
      re: /^On\s+top\s+of\s+those\s+defaults,\s*(.+?)\s+requests\s+the\s+access\s+below\.?$/i,
      fn: (m) => `除上述默认权限外，${m[1]} 还请求以下访问权限。`,
    },
    {
      re: /^More\s+options\s+for\s+(.+)$/i,
      fn: (m) => `${m[1]} 的更多选项`,
    },
    {
      re: /^Back\s+to\s+(.+)$/i,
      fn: (m) => {
        if (m[1].length > 48) return null;
        const t = dictLookup(m[1]) || m[1];
        const sep = /^[\u4e00-\u9fff]/.test(t) ? '' : ' ';
        return `返回${sep}${t}`;
      },
    },
    {
      re: /^Committed\s+to\s+(.+?)\.?$/i,
      fn: (m) => `已提交至 ${m[1]}。`,
    },
    {
      re: /^Pushed\s+to\s+(.+?)\.?$/i,
      fn: (m) => `已推送至 ${m[1]}。`,
    },
    {
      re: /^Publish(?:ed)?\s+(.+?)\s+to\s+origin\.?$/i,
      fn: (m) => `${/^published/i.test(m[0]) ? '已将' : '将'} ${m[1]} 发布到 origin${/^published/i.test(m[0]) ? '。' : ''}`,
    },
    {
      re: /^All\s+changes\s+since\s+(.+)$/i,
      fn: (m) => `自 ${m[1]} 以来的所有更改`,
    },
    {
      re: /^(.+?)\.\s*This\s+commit\s+is\s+already\s+pushed;\s*amending\s+will\s+require\s+a\s+force\s+push\.?$/i,
      fn: (m) => `${dictLookup(m[1]) || m[1]}。此提交已推送至远程，追加修改将需要强制推送。`,
    },
    {
      re: /^View\s+Diff\s+for\s+(.+)$/i,
      fn: (m) => `查看 ${m[1]} 的差异`,
    },
    {
      re: /^Turn\s+(\d+)$/i,
      fn: (m) => `第 ${m[1]} 轮`,
    },
    {
      re: /^Turns\s+(\d+)\s*[–-]\s*(\d+)$/i,
      fn: (m) => `第 ${m[1]}–${m[2]} 轮`,
    },
    {
      re: /^Open\s+image\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `打开第 ${m[1]} / ${m[2]} 张图片`,
    },
    {
      re: /^Go\s+to\s+(page|slide)\s+(\d+)$/i,
      fn: (m) => `跳转到第 ${m[2]} ${m[1].toLowerCase() === 'page' ? '页' : '张幻灯片'}`,
    },
    {
      re: /^Page\s+(\d+)\s+failed\s+to\s+load$/i,
      fn: (m) => `第 ${m[1]} 页加载失败`,
    },
    {
      re: /^Failed\s+to\s+load\s+page\s+(\d+):\s*(.+)$/i,
      fn: (m) => `加载第 ${m[1]} 页失败：${m[2]}`,
    },
    {
      re: /^(Bounding\s+box|Comment|Search\s+match|Multiple\s+search\s+matches|Multiple\s+markers)\s+(on|near)\s+page\s+(\d+)$/i,
      fn: (m) => {
        const kMap = {
          'bounding box': '边界框',
          comment: '评论',
          'search match': '搜索匹配项',
          'multiple search matches': '多处搜索匹配项',
          'multiple markers': '多个标记',
        };
        const prep = m[2].toLowerCase() === 'near' ? '附近' : '';
        return `第 ${m[3]} 页${prep}的${ownLookup(kMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1]}`;
      },
    },
    {
      re: /^Scroll\s+to:\s*(.+?)\s+on\s+page\s+(\d+)$/i,
      fn: (m) => `滚动至第 ${m[2]} 页：${m[1]}`,
    },
    {
      re: /^Environment\s+paused\.\s*Click\s+to\s+resume\s+it\s+and\s+load\s+the\s+(.+?)\.?$/i,
      fn: (m) => `环境已暂停，点击恢复以加载 ${dictLookup(m[1]) || m[1]}。`,
    },
    {
      re: /^Cancel\s+Questionnaire\s+and\s+Stop\s+the\s+Agent\s+\((.+?)\)$/i,
      fn: (m) => `取消问卷并停止智能体 (${m[1]})`,
    },
    {
      re: /^Skip\s+\((.+?)\),\s*Skip\s+All\s+\((.+?)\)$/i,
      fn: (m) => `跳过 (${m[1]})，全部跳过 (${m[2]})`,
    },
    {
      re: /^Side\s+Question:\s*(.+)$/i,
      fn: (m) => `旁路提问：${m[1]}`,
    },
    {
      re: /^(Edit\s+side\s+question\s+title|Delete\s+side\s+question|Edit\s+comment):\s*(.+)$/i,
      fn: (m) => {
        const kMap = {
          'edit side question title': '编辑旁路提问标题',
          'delete side question': '删除旁路提问',
          'edit comment': '编辑评论',
        };
        return `${ownLookup(kMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1]}：${m[2]}`;
      },
    },
    {
      re: /^(Reading|Read)\s+terminal:$/i,
      fn: (m) => (m[1].toLowerCase() === 'reading' ? '正在读取终端：' : '已读取终端：'),
    },
    {
      re: /^(Failed\s+to\s+execute|Executing|Executed)\s+notebook(\s+cells)?$/i,
      fn: (m) => {
        const target = m[2] ? ' Notebook 单元格' : ' Notebook';
        const act = m[1].toLowerCase();
        return act.startsWith('failed') ? `执行${target}失败` : act === 'executing' ? `正在执行${target}` : `已执行${target}`;
      },
    },
    {
      re: /^(Clicking|Clicked)\s+element\s+"(.+?)"$/i,
      fn: (m) => `${m[1].toLowerCase() === 'clicking' ? '正在点击' : '已点击'}元素“${m[2]}”`,
    },
    {
      re: /^Wants\s+to\s+run:\s*(.+)$/i,
      fn: (m) => `请求运行：${m[1]}`,
    },
    {
      re: /^(Sending|Sent|Rejected\s+sending|Suggested\s+sending)\s+(.+?)\s+to\s+command$/i,
      fn: (m) => {
        const aMap = {
          sending: '正在向命令发送',
          sent: '已向命令发送',
          'rejected sending': '已拒绝向命令发送',
          'suggested sending': '建议向命令发送',
        };
        return `${ownLookup(aMap, m[1].toLowerCase().replace(/\s+/g, ' ')) || m[1]} ${m[2]}`;
      },
    },
    {
      re: /^File\s+exceeds\s+the\s+([\d.]+)MB\s+display\s+limit\s+\(([\d.]+)MB\),\s*so\s+it\s+can't\s+be\s+opened\s+or\s+downloaded\s+here\.?$/i,
      fn: (m) => `文件大小 (${m[2]}MB) 超过 ${m[1]}MB 显示上限，无法在此打开或下载。`,
    },
    {
      re: /^Total\s+media\s+size\s+exceeds\s+([\d.]+)MB\s+limit$/i,
      fn: (m) => `媒体总大小超过 ${m[1]}MB 上限`,
    },
    {
      re: /^Failed\s+to\s+compress\s+image\s+to\s+fit\s+within\s+([\d.]+)MB$/i,
      fn: (m) => `无法将图片压缩至 ${m[1]}MB 以内`,
    },
    {
      re: /^Please\s+fill\s+in\s+all\s+required\s+fields:\s*(.+)$/i,
      fn: (m) => `请填写所有必填字段：${m[1]}`,
    },
    {
      re: /^Further\s+action\s+is\s+required\s+to\s+use\s+(.+)$/i,
      fn: (m) => `需要完成进一步操作才能使用 ${m[1]}`,
    },
    {
      re: /^Sorry,\s*this\s+account\s+is\s+ineligible\s+to\s+use\s+(.+)$/i,
      fn: (m) => `抱歉，此账号不符合使用 ${m[1]} 的资格`,
    },
    {
      re: /^Select\s+model\s+with\s+(.+)$/i,
      fn: (m) => `按 ${m[1]} 选择模型`,
    },
    {
      re: /^Cost\s+summary:\s*(.+)$/i,
      fn: (m) => `费用摘要：${m[1]}`,
    },
    {
      re: /^Open\s+URL\s+in\s+system\s+browser:\s*(.+)$/i,
      fn: (m) => `在系统浏览器中打开 URL：${m[1]}`,
    },
    {
      re: /^Line\s+(\d+)\s*→\s*(\d+)$/i,
      fn: (m) => `第 ${m[1]} → ${m[2]} 行`,
    },
    {
      re: /^Waiting\s+for\s+your\s+input:\s*(.+)$/i,
      fn: (m) => `等待您的输入：${m[1]}`,
    },
    {
      re: /^Honors\s+standard\s+VS\s+Code\s+shortcuts\s+without\s+collisions\s+\(e\.g\.\s*(.+?)\)\.?$/i,
      fn: (m) => `遵循标准 VS Code 快捷键且无冲突（例如 ${m[1]}）。`,
    },
    {
      re: /^(.+?),\s*showing\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `${dictLookup(m[1]) || translateString(m[1]) || m[1]}，当前显示 ${m[2]} / ${m[3]}`,
    },
    {
      re: /^Tomorrow\s+(.+)$/i,
      fn: (m) => (/\d/.test(m[1]) && m[1].length <= 32 ? `明天 ${m[1]}` : null),
    },
    // Swarm 伴生面板（plugin://swarm--swarm_board-*）真实动态模板规则
    {
      re: /^(\d+)\s+posts?\s*·\s*(\d+)\s+members?$/i,
      fn: (m) => `${m[1]} 条消息 · ${m[2]} 名成员`,
    },
    {
      re: /^(\d+)\s+of\s+(\d+)\s+tasks?\s+done$/i,
      fn: (m) => `已完成 ${m[1]} / ${m[2]} 项任务`,
    },
    {
      re: /^(\d+)\s+of\s+(\d+)\s+done$/i,
      fn: (m) => `已完成 ${m[1]} / ${m[2]}`,
    },
    {
      re: /^Coordinator\s*·\s*(\d+)\s+of\s+(\d+)\s+done(?:\s*·\s*(.+))?$/i,
      fn: (m) => {
        const tail = m[3] ? ` · ${dictLookup(m[3].trim()) || m[3].trim()}` : '';
        return `协调器 · 已完成 ${m[1]} / ${m[2]}${tail}`;
      },
    },
    {
      re: /^(\d+)\s+frames?\s*([·,])\s*(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB))$/i,
      fn: (m) => `${m[1]} 帧${m[2] === ',' ? '，' : ' · '}${m[3]}`,
    },
    {
      re: /^@([A-Za-z0-9_.-]+)\s+hit an error$/,
      fn: (m) => `@${m[1]} 发生错误`,
    },
    {
      re: /^@([A-Za-z0-9_.-]+)\s+looks stuck$/,
      fn: (m) => `@${m[1]} 疑似卡住`,
    },
    {
      re: /^@([A-Za-z0-9_.-]+)\s+ran out of quota$/,
      fn: (m) => `@${m[1]} 配额已耗尽`,
    },
    {
      re: /^Go to #(\d+) on the Board$/,
      fn: (m) => `跳转到公告板 #${m[1]}`,
    },
    {
      re: /^(.+?)\s*\(not on the roster\)$/,
      fn: (m) => `${m[1]}（未在名单中）`,
    },
    {
      re: /^#([A-Za-z0-9_.-]+)\s+is archived:\s*this addresses nobody$/,
      fn: (m) => `#${m[1]} 已归档：此消息不会通知任何人`,
    },
    {
      re: /^(.+?)\s*·\s*(\d+)\s+machines?$/,
      fn: (m) => `${dictLookup(m[1].trim()) || m[1].trim()} · ${m[2]} 台设备`,
    },
    {
      re: /^(.+?)\s*·\s*(connecting|reconnecting|unavailable)$/i,
      fn: (m) => {
        const map = { connecting: '连接中', reconnecting: '重新连接中', unavailable: '不可用' };
        const st = ownLookup(map, m[2].toLowerCase()) || m[2];
        return `${dictLookup(m[1].trim()) || m[1].trim()} · ${st}`;
      },
    },
    // v1.5.14 新增高频动态模板规则
    {
      re: /^Move this conversation to "(.+)"\?$/,
      fn: (m) => `要将此对话移至“${m[1]}”吗？`,
    },
    {
      re: /^Move to (Workspace|Project)$/,
      fn: (m) => `移至${m[1] === 'Workspace' ? '工作区' : '项目'}`,
    },
    {
      re: /^Remove from (Workspace|Project)$/,
      fn: (m) => `从${m[1] === 'Workspace' ? '工作区' : '项目'}中移除`,
    },
    {
      re: /^Pin Entire (Workspace|Project)$/,
      fn: (m) => `置顶整个${m[1] === 'Workspace' ? '工作区' : '项目'}`,
    },
    {
      re: /^(\d+)\s+models?\s+selected$/i,
      fn: (m) => `已选择 ${m[1]} 个模型`,
    },
    {
      re: /^Closed\s+(\d+)\s+terminals?$/i,
      fn: (m) => `已关闭 ${m[1]} 个终端`,
    },
    {
      re: /^Playback speed\s+(\d+(?:\.\d+)?)x$/i,
      fn: (m) => `播放速度 ${m[1]} 倍`,
    },
    {
      re: /^Zoom\s+(\d+)%,\s*reset to fit$/i,
      fn: (m) => `缩放 ${m[1]}%，点击重置为适应窗口`,
    },
    {
      re: /^The folder “(.+)” does not exist\. Would you like to create it\?$/,
      fn: (m) => `文件夹“${m[1]}”不存在，是否立即创建？`,
    },
    {
      re: /^“(.+)” isn’t a valid folder name\.$/,
      fn: (m) => `“${m[1]}”不是有效的文件夹名称。`,
    },
    {
      re: /^Can’t create this path — “(.+)” is a file, not a folder\.$/,
      fn: (m) => `无法创建此路径——“${m[1]}”是文件而非文件夹。`,
    },
    {
      re: /^Branch\s+(.+)\s+no longer exists$/,
      fn: (m) => `分支 ${m[1]} 已不存在`,
    },
    {
      re: /^MCP server\s+(.+)\s+requires authentication$/,
      fn: (m) => `MCP 服务器 ${m[1]} 需要身份验证`,
    },
    {
      re: /^Retrying transcription \(attempt (\d+)\)…$/,
      fn: (m) => `正在重试转录（第 ${m[1]} 次）…`,
    },
    {
      re: /^Recording exceeds 15MB limit \((.+)\)$/,
      fn: (m) => `录音超出 15MB 上限（当前 ${m[1]}）`,
    },
    {
      re: /^Searching as\s+(.+)$/,
      fn: (m) => `当前搜索身份：${m[1]}`,
    },
    {
      re: /^(\d+)\s+tools?\s+in this MCP server \((.+?)\s+tokens?\) exceeded the customization budget and (?:was|were) excluded from context\.$/,
      fn: (m) => `此 MCP 服务器中有 ${m[1]} 个工具（${m[2]} Token）超出自定义项预算，已从上下文中排除。`,
    },
    {
      re: /^This deletes\s+(\d+)\s+call recordings?\s+\((.+?)\)\s+from your machine\. You can't undo this\.$/,
      fn: (m) => `此操作将从本机删除 ${m[1]} 条通话录音（${m[2]}），且无法撤销。`,
    },
    {
      re: /^Can't access "(.+?)"\. macOS privacy settings are blocking Antigravity from this location\. Allow Antigravity in System Settings > Privacy & Security > Files and Folders \(or Full Disk Access\)\.?$/,
      fn: (m) => `无法访问“${m[1]}”。macOS 隐私设置正在阻止 Antigravity 访问此位置，请在「系统设置 > 隐私与安全性 > 文件与文件夹（或完全磁盘访问权限）」中允许 Antigravity。`,
    },
    // 通用文件动作兜底规则：置于全部具名动作规则之后，避开双引号及 URL 等非文件动作文案
    {
      re: /^(Viewed|Read|Edited|Created|Deleted|Updated|Wrote|Analyzed|Checked)\s+(.+?)(?:\s+\(lines?\s+(\d+(?:-\d+)?)\))?$/,
      fn: (m) => {
        if (
          /["“”]/.test(m[2]) ||
          /^URL:/i.test(m[2]) ||
          /\s.*[.!?]$/.test(m[2]) ||
          /\b(?:ago|yesterday)$/i.test(m[2])
        ) {
          return null;
        }
        const vMap = {
          viewed: '查看了',
          read: '读取了',
          edited: '编辑了',
          created: '创建了',
          deleted: '删除了',
          updated: '更新了',
          wrote: '写入了',
          analyzed: '分析了',
          checked: '检查了',
        };
        const v = ownLookup(vMap, m[1].toLowerCase()) || m[1];
        return m[3] ? `${v} ${m[2]}（第 ${m[3]} 行）` : `${v} ${m[2]}`;
      },
    },
  ];

  // Software, brand, and product names that should always remain in their original form
  const DOM_SKIP_EXACT = new Set([
    'Antigravity',
    'Google Docs',
    'Google Drive',
    'Google Sheets',
    'Google Slides',
    'Google Cloud',
    'Google Chat',
    'Google Chrome',
    'Chrome DevTools',
    'Chromium',
    'Critique',
    'Buganizer',
    'GitHub',
    'GitLab',
    'Bitbucket',
    'Slack',
    'Linear',
    'Jira',
    'Teams',
    'VS Code',
    'Visual Studio Code',
    'Cursor',
    'Windsurf',
    'Zed',
    'Xcode',
    'Android Studio',
    'IntelliJ IDEA',
    'PyCharm',
    'WebStorm',
    'GoLand',
    'CLion',
    'Sublime Text',
    'Neovim',
    'Vim',
    'Emacs',
    'iTerm',
    'iTerm2',
    'Warp',
    'Ghostty',
    'Alacritty',
    'Kitty',
    'WezTerm',
    'Hyper',
    'Terminal.app',
    'Finder',
    'Gemini',
    'Claude',
    'Anthropic',
    'OpenAI',
    'Docker',
    'Figma',
    'Notion',
    'Sentry',
    'Supabase',
    'Vercel',
    'Netlify',
    'Stripe',
    'CitC',
    'Piper',
    'Jetski',
    'Sherlog',
    'Cider V',
    'PowerShell',
    'Google3',
    'MCP',
    'macOS',
    'MacOS',
    'Windows',
    'Linux',
    // 音色、字体、主题与版本控制专有名词
    'Fola',
    'Arlo',
    'Cleo',
    'Finn',
    'Gero',
    'Lora',
    'Neno',
    'Olin',
    'Tari',
    'Inter',
    'Google Sans',
    'Fig',
    'Piper (g4)',
    'JJ',
    'Cog (GoB)',
    'Project 4K',
    // v2.34.0 / v1.5.13 模型、代码语法主题与专有名词
    'Gemini 2.5 Flash Image',
    'Gemini 3 Pro Image',
    'Gemini 3.1 Flash Image',
    'Gemini Flash Next',
    'ELMO Composite',
    'Flash',
    'Flash Lite',
    'Pro',
    'Sidecar',
    'Catppuccin',
    'Everforest',
    'Gruvbox Material',
    'One Light',
    'One Dark Pro',
    'Solarized Light',
    'Solarized Dark',
    'Tokyo Night',
    'Bahasa Indonesia',
    'Tiếng Việt',
    'Dansk',
    'Deutsch',
    'Español',
    'Français',
    'Italiano',
    'Nederlands',
    'Norsk',
    'Polski',
    'Português',
    'Română',
    'Suomi',
    'Svenska',
    'Türkçe',
  ]);

  function shouldSkipText(trimmed) {
    if (!trimmed || trimmed.length < 2 || trimmed.length > 600) return true;
    if (DOM_SKIP_EXACT.has(trimmed)) return true;
    if (!/[a-zA-Z]{2,}/.test(trimmed)) return true;
    if (
      /^(https?:\/\/|file:\/\/|\/[A-Za-z0-9._-]+\/|~\/|--[a-z0-9-]+|[A-Za-z0-9_]+\.[a-z]{2,4}$)/.test(
        trimmed
      )
    ) {
      return true;
    }
    return false;
  }

  // 限制无上下文纯文本翻译缓存上限，避免流式输出时重复执行正则扫描
  const stringCache = new Map();
  const STRING_CACHE_LIMIT = 512;

  function translateString(raw) {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.length > 1200) return translateUncachedString(raw);
    if (stringCache.has(raw)) return stringCache.get(raw);
    const translated = translateUncachedString(raw);
    if (stringCache.size >= STRING_CACHE_LIMIT) {
      stringCache.delete(stringCache.keys().next().value);
    }
    stringCache.set(raw, translated);
    return translated;
  }

  function translateUncachedString(raw) {
    const trimmed = raw.trim();
    if (shouldSkipText(trimmed)) return null;

    const leadMatch = raw.match(/^\s*/);
    const trailMatch = raw.match(/\s*$/);
    const lead = leadMatch ? leadMatch[0] : '';
    const trail = trailMatch ? trailMatch[0] : '';

    // 1. Direct exact dictionary lookup
    if (Object.prototype.hasOwnProperty.call(DICT, trimmed)) {
      return lead + DICT[trimmed] + trail;
    }

    // 2. Trailing colon (: or ...) stripping lookup
    if (trimmed.endsWith(':')) {
      const base = trimmed.slice(0, -1).trim();
      if (Object.prototype.hasOwnProperty.call(DICT, base)) {
        return lead + DICT[base] + '：' + trail;
      }
    }
    if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
      const base = trimmed.replace(/(?:\.\.\.|…)$/, '').trim();
      if (Object.prototype.hasOwnProperty.call(DICT, base)) {
        return lead + DICT[base] + '...' + trail;
      }
    }

    // 3. Dynamic regex rules
    for (let i = 0; i < DYNAMIC_RULES.length; i++) {
      const rule = DYNAMIC_RULES[i];
      const match = trimmed.match(rule.re);
      if (match) {
        const res = rule.fn(match);
        if (res !== null && res !== undefined) {
          return lead + res + trail;
        }
      }
    }

    // 4. Status + separator compounds (e.g., "Working · 12s")
    if (trimmed.includes(' · ') || trimmed.includes(' • ')) {
      const sep = trimmed.includes(' · ') ? ' · ' : ' • ';
      const parts = trimmed.split(sep);
      let changed = false;
      const newParts = parts.map((p) => {
        const pt = p.trim();
        const stZh = ownLookup(STATUS_MAP, pt);
        if (stZh) {
          changed = true;
          return stZh;
        }
        if (/^(?:<\s*)?\d+(?:\.\d+)?\s*(?:ms|s|m|h|d)$/i.test(pt)) {
          const dur = translateDuration(pt);
          if (dur !== pt) {
            changed = true;
            return dur;
          }
        }
        const sub = translateString(pt);
        if (sub && sub !== pt) {
          changed = true;
          return sub;
        }
        return p;
      });
      if (changed) {
        return lead + newParts.join(sep) + trail;
      }
    }

    // 5. 前缀规则：仅在完全相等或紧跟冒号分隔符时翻译前缀，绝不吞掉未知警告后缀
    for (let i = 0; i < FRAGMENTS.length; i++) {
      const [enFrag, zhFrag] = FRAGMENTS[i];
      if (!enFrag || !trimmed.startsWith(enFrag)) continue;
      const rest = trimmed.slice(enFrag.length);
      if (!rest) return lead + zhFrag + trail;
      if (/^\s*[:：]/.test(rest)) {
        const zhBase = zhFrag.replace(/[。.:：]+$/, '');
        return lead + zhBase + rest + trail;
      }
    }

    return null;
  }

  // Tags whose entire subtree should never be touched (NOTE: TEXTAREA is NOT here so its placeholder/aria-label attributes can be translated; its text children are excluded in isTextParentExcluded)
  const EXCLUDED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'CODE',
    'PRE',
    'KBD',
    'SAMP',
    'VAR',
    'SVG',
    'PATH',
    'NOSCRIPT',
  ]);

  // Subtrees that contain user code, editors, terminals, Lexical state, filenames, fuzzy highlights, logs, or Swarm agent content
  const SUBTREE_REJECT_SELECTOR =
    'pre, code, kbd, samp, var, script, style, svg, ' +
    '.monaco-editor, .monaco-keybinding, .keybinding-label, .xterm, .cm-editor, .ProseMirror, ' +
    '[data-lexical-editor], [data-lexical-text], [data-lexical-decorator], [data-lexical-beautiful-mention], ' +
    '[data-testid="file-title-name"], [data-testid="breadcrumb-segment"], [data-testid="branch-option"], ' +
    '[data-testid="fuzzy-match-highlight"], [data-testid="markdown-frontmatter"], [data-testid="terminal-surface"], ' +
    '[data-testid="sidecar-logs-content"], [data-testid="setup-script-output"], [data-testid="pdf-text-layer"], ' +
    '[data-testid="pill-comment-anchor-text"], [data-testid="browser-url-display"], ' +
    '[data-testid="code-gutter"], [data-testid="code-gutter-diff"], [data-no-translate], ' +
    '[data-testid="swarm-board"] .msg-body, [data-testid="swarm-board"] .msg-author, ' +
    '[data-testid="swarm-board"] .msg-who, [data-testid="swarm-board"] .msg-to, ' +
    '[data-testid="swarm-board"] .mention, [data-testid="swarm-board"] .chip-name, ' +
    '[data-testid="swarm-board"] .node-label, [data-testid="swarm-board"] .ov-who, ' +
    '[data-testid="swarm-board"] .sys-text, [data-testid="swarm-board"] .raw-meta .path, ' +
    '[data-testid="swarm-board"] .o2-mauth, [data-testid="swarm-board"] .o2-mrole, ' +
    '[data-testid="swarm-board"] .o2-mnow, [data-testid="swarm-board"] .o2-donem, ' +
    '[data-testid="swarm-board"] .o2-goal, [data-testid="swarm-board"] .o2-runt, ' +
    '[data-testid="swarm-board"] .o2-runsum, [data-testid="swarm-board"] .o2-runnote, ' +
    '[data-testid="swarm-board"] .o2-sttxt, [data-testid="swarm-board"] .hv-nm';

  // Built-in code/diff viewer line container (exclude text nodes, allow button aria-labels like Fold/Unfold)
  const CODE_LINE_SELECTOR = '.code-line, [data-line-number]';

  // Conversation prose & voice transcript containers (protect AI markdown, user prompts & transcripts, while allowing inner UI buttons/menus)
  const CHAT_PROSE_SELECTOR =
    '[data-testid="planner-response-text"], [data-testid="user-input-step"], ' +
    '[data-testid="side-question-answer"], [data-testid="side-question-question"], ' +
    '[data-testid="side-question-followup-user"], [data-testid="transcript-line-text"], ' +
    '[data-testid="comment-card-text"], [data-testid="automation-instructions-markdown"], ' +
    '[data-testid="markdown-code-block-preview"], ' +
    '[data-testid="conversation-view"] [data-markdown-root], ' +
    '[data-testid="agent-response"] [data-markdown-root], ' +
    '[data-testid="user-message"] [data-markdown-root], ' +
    '[data-testid="live-transcript"] [data-markdown-root], ' +
    '[data-testid="voice-transcript-card"] [data-markdown-root], ' +
    '[data-testid="side-question-tab-conversation"] [data-markdown-root], ' +
    '[data-testid="subagent-tab-conversation"] [data-markdown-root]';

  const CHAT_UI_ALLOW_SELECTOR =
    'button, [role="button"], [role="menuitem"], .markdown-alert-title, ' +
    '[data-testid="user-message-actions"], ' +
    '[data-testid="markdown-table-copy-markdown"], [data-testid="markdown-table-width-toggle"], [data-testid="markdown-table-menu"]';

  // 仅允许翻译固定系统占位标题/分组名，其余用户自定义会话名、项目名与 Swarm 标题保持原文
  const USER_TITLE_TEXT_SELECTOR =
    '[data-testid^="conversation-row-"] span.truncate.text-left.w-full, ' +
    '[data-testid="project-header"] span.truncate, ' +
    '[data-testid="swarm-title"]';

  const SYSTEM_PLACEHOLDER_TITLES = new Set([
    'New conversation',
    'New Conversation',
    'Untitled conversation',
    'Untitled',
    'Untitled project',
    'Untitled swarm',
    'Standalone Conversations',
    'Standalone',
    'Archived',
    'Archived Projects',
    'CLI Project',
    'Automations',
    'Pinned Conversations',
  ]);

  function parentElementOrHost(node) {
    if (!node) return null;
    if (node.parentElement) return node.parentElement;
    const root = node.nodeType === 11 ? node : node.parentNode;
    return root && root.host ? root.host : null;
  }

  function isElementSubtreeExcluded(el) {
    if (EXCLUDED_TAGS.has(el.tagName) || el.matches(SUBTREE_REJECT_SELECTOR)) return true;
    const editable = el.getAttribute('contenteditable');
    if (editable !== null && /^(?:true|plaintext-only)?$/i.test(editable)) return true;
    if ((el.getAttribute('translate') || '').toLowerCase() === 'no') return true;
    // 未显式声明 value 属性的 option 改动文本会改变表单提交值，跳过以保数据语义稳定
    return el.tagName === 'OPTION' && !el.hasAttribute('value');
  }

  function isSubtreeExcluded(el) {
    for (let p = el; p && p.nodeType === 1; p = parentElementOrHost(p)) {
      if (isElementSubtreeExcluded(p)) return true;
    }
    return false;
  }

  function isUserTitleProtectedText(el, rawText) {
    if (!el || el.nodeType !== 1) return false;
    for (let p = el; p && p.nodeType === 1; p = parentElementOrHost(p)) {
      if (p.matches && p.matches(USER_TITLE_TEXT_SELECTOR)) {
        return !SYSTEM_PLACEHOLDER_TITLES.has((rawText || '').trim());
      }
    }
    return false;
  }

  function isUserTitleProtectedAttr(el, attr, rawVal) {
    if (attr !== 'aria-label' && attr !== 'title') return false;
    if (!el || el.nodeType !== 1 || !el.matches) return false;
    if (el.tagName === 'A' && el.closest && el.closest('[data-testid^="conversation-row-"]')) {
      return !SYSTEM_PLACEHOLDER_TITLES.has((rawVal || '').trim());
    }
    if (el.matches(USER_TITLE_TEXT_SELECTOR)) {
      return !SYSTEM_PLACEHOLDER_TITLES.has((rawVal || '').trim());
    }
    return false;
  }

  function isContentExcluded(el, attributes) {
    if (!el || el.nodeType !== 1) return true;
    let insideChatUI = false;
    let insideCodeControl = false;
    let insideMenuOptionLabel = false;
    let insideMenuCategoryRow = false;
    for (let p = el; p; p = parentElementOrHost(p)) {
      if (isElementSubtreeExcluded(p)) return true;
      if (!attributes && p.tagName === 'TEXTAREA') return true;
      if (p.matches('[data-testid="menu-option-label"]')) insideMenuOptionLabel = true;
      if (p.matches('[data-testid="menu-category-row"]')) insideMenuCategoryRow = true;
      // 外层按钮不得放行内部嵌套的聊天正文容器
      if (p.matches(CHAT_PROSE_SELECTOR) && !insideChatUI) return true;
      if (p.matches(CODE_LINE_SELECTOR) && (!attributes || !insideCodeControl)) return true;
      if (p.matches(CHAT_UI_ALLOW_SELECTOR)) insideChatUI = true;
      if (p.matches('button, [role="button"], [role="menuitem"]')) insideCodeControl = true;
    }
    // 斜杠命令与 @提及菜单选项标签：仅放行官方分类行 (menu-category-row)，命令名与文件名保持原文
    if (insideMenuOptionLabel && !insideMenuCategoryRow) return true;
    return false;
  }

  function isTextParentExcluded(parent) {
    return isContentExcluded(parent, false);
  }

  const textNodeCache = new WeakMap();
  const attrNodeCache = new WeakMap();

  const TRANSLATABLE_ATTRS = [
    'placeholder',
    'title',
    'aria-label',
    'aria-valuetext',
    'data-placeholder',
    'data-tooltip',
    'data-tooltip-content',
  ];

  function translateAttributes(el) {
    if (isContentExcluded(el, true)) return;

    let cachedAttrs = attrNodeCache.get(el);
    for (let i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
      const attr = TRANSLATABLE_ATTRS[i];
      if (el.hasAttribute(attr)) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        if (isUserTitleProtectedAttr(el, attr, val)) continue;
        if (cachedAttrs && ownLookup(cachedAttrs, attr) === val) continue;
        const translated = translateString(val);
        if (!cachedAttrs) {
          cachedAttrs = Object.create(null);
          attrNodeCache.set(el, cachedAttrs);
        }
        cachedAttrs[attr] = translated || val;
        if (translated && translated !== val) {
          el.setAttribute(attr, translated);
        }
      }
    }
  }

  // 根据所在容器上下文修正易歧义短词与 JSX 拆分节点（零全局短词污染）
  function getContextualTranslation(raw, parent, node) {
    const trimmed = raw.trim();
    const parentText = (parent.textContent || '').trim();
    const isCommitChangesSpan =
      /^(?:Commit|提交)\s*\d+\s*(?:file|个文件)\s*(?:changes?|更改)\s*(?:to|至)$/i.test(parentText);
    if (!trimmed) {
      if (raw === ' ' && isCommitChangesSpan) return '';
      return null;
    }
    const lead = (raw.match(/^\s*/) || [''])[0];
    const trail = (raw.match(/\s*$/) || [''])[0];
    const wrap = (zh) => lead + zh + trail;

    const closest = (sel) => {
      for (let p = parent; p; p = parentElementOrHost(p)) {
        if (p.matches && p.matches(sel)) return p;
      }
      return null;
    };

    // 1. "New" / "Beta" / "Legacy" 等模型与特性药丸徽章（含模型菜单内 a3 组件的 rounded-full 角标）
    //    避免模型旁的 "New" 徽章落入 DICT["New"]="新建" 被误翻为“新建”
    const isPillBadge =
      (parent.tagName === 'DIV' && parent.classList && parent.classList.contains('rounded-full')) ||
      (parent.tagName === 'SPAN' &&
        (!!closest('div.rounded-full.bg-secondary, div.rounded-full[data-tooltip-id]') ||
          !closest('button, [role="button"], [role="menuitem"]')));
    if (isPillBadge) {
      if (trimmed === 'New') return wrap('新');
      if (trimmed === 'Beta') return wrap('测试版');
      if (trimmed === 'Legacy') return wrap('旧版');
    }

    // 3. 思考强度档位与模型名称附带强度（仅限模型/编排器选择器及设置下拉内，杜绝全局短词误伤）
    const inModelEffortContext =
      !!closest(
        '[data-testid^="model-selector-"], [data-testid="orchestrator-picker-effort"], ' +
          '[data-testid="orchestrator-picker-row"], [data-testid="orchestrator-model"], ' +
          '[data-testid="orchestrator-executor-model"]'
      ) ||
      !!(
        parent.previousElementSibling &&
        parent.previousElementSibling.matches &&
        parent.previousElementSibling.matches('[data-testid="model-selector-effort-group"]')
      );
    if (inModelEffortContext) {
      const effortTranslated = translateModelEffortText(trimmed);
      if (effortTranslated && effortTranslated !== trimmed) {
        return wrap(effortTranslated);
      }
    }

    // 4. 自动化详情页摘要句："Runs [schedule] in [project] with [model] on this computer."
    if (closest('[data-testid="automation-settings"]')) {
      if (parent.tagName === 'P' && trimmed === 'Runs') return wrap('运行于');
      if (parent.tagName === 'P' && trimmed === 'with') return wrap('使用');
      if (trimmed === 'in') return wrap('位于');
    }

    // 5. 自动化定时编辑器内联介词与重复单位（仅限 schedule editor 内）
    if (closest('[data-testid="automation-schedule-editor"]')) {
      const schedMap = {
        at: '时间',
        on: '在',
        'on the': '每月第',
        hours: '小时',
        week: '周',
        month: '月',
      };
      const mapped = ownLookup(schedMap, trimmed);
      if (mapped) return wrap(mapped);
    }

    // 6. 自动化空态："No automations yet" / "No automations match “q”."（防 DICT["No"]="否" 误翻）
    if (closest('[data-testid="sidecar-list-empty"]')) {
      if (trimmed === 'No' && node && node.nextSibling) {
        return /\byet$/i.test(parentText) ? '暂无' : '没有';
      }
      if (trimmed === 'automations') return wrap('自动化任务');
      if (trimmed === 'match “') return '匹配“';
      if (trimmed === '”.') return '”。';
      if (trimmed === 'yet') return '';
    }

    // 7. 通用拆分空态："No <projects|workspaces|automations> found"（兼容左邻节点先译后的连续遍历）
    if (
      node &&
      /^(?:No|未找到)\s*(?:projects|workspaces|automations|项目|工作区|自动化任务)\s*(?:found)?$/i.test(
        parentText
      )
    ) {
      if (trimmed === 'No') return '未找到';
      if (trimmed === 'projects') return '项目';
      if (trimmed === 'workspaces') return '工作区';
      if (trimmed === 'automations') return '自动化任务';
      if (trimmed === 'found') return '';
    }

    // 8. 运行中面板选中计数条："{n} selected"
    if (trimmed === 'selected' && closest('[data-testid="running-selection-bar"]')) {
      return ' 项已选';
    }

    // 9. macOS 系统权限引导卡片拆分词
    if (closest('[data-testid="computer-permissions-card"]')) {
      const cpMap = { ', choose': '，选择', ', click': '，点击', ', then': '，然后', click: '点击' };
      const mapped = ownLookup(cpMap, trimmed);
      if (mapped) return wrap(mapped);
    }

    // 10. 条款与引导页内联 "and" 及 "says."
    if (closest('[data-testid="post-onboarding-terms-body"], [data-testid="cloud-resource-disclosure-terms"]')) {
      if (trimmed === 'and' && node && node.previousSibling && node.nextSibling) return wrap('和');
      if (trimmed === 'says.') return '所提供的回答。';
    }

    // 11. 新建自动化重复校验："An automation with..."
    if (closest('[data-testid="new-sidecar-modal"]')) {
      if (trimmed === 'An' && node && node.nextSibling) {
        const nextTxt = (node.nextSibling.nodeValue || node.nextSibling.textContent || '').trim();
        if (nextTxt === 'automation' || nextTxt === '自动化任务') {
          return '';
        }
      }
      if (trimmed === 'automation') return '自动化任务';
    }

    // 12. 数字拆分分页："N of M"（如 card-deck-counter）
    if (trimmed === 'of' && node && node.previousSibling && node.nextSibling) {
      const pTxt = (node.previousSibling.textContent || node.previousSibling.nodeValue || '').trim();
      const nTxt = (node.nextSibling.textContent || node.nextSibling.nodeValue || '').trim();
      if (/^\d+$/.test(pTxt) && /^\d+$/.test(nTxt)) return ' / ';
    }

    // 13. 紧随数字的拆分计数名词与 Git 提交弹窗拆分句
    if (node && node.previousSibling) {
      const pTxt = (node.previousSibling.textContent || node.previousSibling.nodeValue || '').trim();
      if (/\d$/.test(pTxt)) {
        if (trimmed === 'subagents') return ' 个子智能体';
        if (trimmed === 'lines' || trimmed === 'line') return lead + '行' + trail;
        if (trimmed === 'plugins' || trimmed === 'plugin') return ' 个插件';
        if (trimmed === 'images' || trimmed === 'image') return ' 张图片';
        if (trimmed === 'results' || trimmed === 'result') return ' 个结果';
      }
    }
    if (isCommitChangesSpan) {
      if (trimmed === 'file') return ' 个文件';
      if (trimmed === 'change' || trimmed === 'changes') return '更改';
      if (trimmed === 'to') return '至';
    }

    // 14. Markdown Alert 标题（仅限 .markdown-alert-title 内，杜绝全局短词误伤）
    if (closest('.markdown-alert-title')) {
      const alertMap = {
        Note: '说明',
        Tip: '提示',
        Important: '重要',
        Warning: '警告',
        Caution: '注意',
      };
      const mapped = ownLookup(alertMap, trimmed);
      if (mapped) return wrap(mapped);
    }

    // 15. Swarm 伴生面板专属短词（仅限 [data-testid="swarm-board"] 与空态内，杜绝全局短词误伤）
    if (closest('[data-testid="swarm-board"], [data-testid="swarm-empty-state"]')) {
      const swarmShortMap = {
        Board: '公告板',
        Live: '实时',
        Reconnecting: '重连中',
        Members: '成员',
        Graph: '关系图',
        Channels: '频道',
        Follow: '跟随',
        Latest: '最新',
        Hive: '蜂巢视图',
        Mentions: '提及关系',
        Frames: '时间帧',
        Goal: '目标',
        Threads: '工作线',
        Progress: '进度',
        'The team': '成员团队',
        Team: '成员团队',
        Coordinator: '协调器',
        Blocked: '阻塞中',
        Moving: '推进中',
        Resting: '休眠中',
        Retired: '已退出',
        Stuck: '已卡住',
        Killed: '已终止',
        'Waiting on': '等待对象',
      };
      const mapped = ownLookup(swarmShortMap, trimmed);
      if (mapped) return wrap(mapped);
    }

    return null;
  }

  // 处理 JSX 拆分节点间的孤立英文句点与冗余空格（仅作用于中文语境且避开代码/链接/数字序号）
  function getSplitJsxNodeTranslation(val, node, parent) {
    const trimmed = val.trim();
    const prev = node.previousSibling;
    const next = node.nextSibling;

    // 1. 孤立句点 "."（例如 <a>Google Chrome</a>. / <strong>此项目</strong>.）仅在句末或后接空白且前驱非数字序号时转为中文句号 "。"
    if (
      trimmed === '.' &&
      prev &&
      parent.tagName !== 'A' &&
      (!next || (next.nodeType === 3 && /^\s/.test(next.nodeValue || ''))) &&
      !/^\d+$/.test((prev.textContent || '').trim()) &&
      /[\u4e00-\u9fff]/.test(parent.textContent || '')
    ) {
      return '。';
    }

    // 2. 纯空格文本节点：若紧邻纯中文加粗强调或中文标点开头节点则收口多余空格
    if (/^[ ]+$/.test(val) && prev && next) {
      const prevTxt = (prev.textContent || '').trim();
      if (/[\u4e00-\u9fff]$/.test(prevTxt)) {
        if (next.nodeType === 3) {
          const nt = (translateString(next.nodeValue) || next.nodeValue || '').trim();
          if (nt === '.' || /^[，。、；：！？]/.test(nt)) {
            return '';
          }
        } else if (next.nodeType === 1 && next.tagName === 'STRONG') {
          const nt = (translateString(next.textContent) || next.textContent || '').trim();
          if (/^[\u4e00-\u9fff]/.test(nt)) {
            return '';
          }
        }
      }
    }

    return null;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const val = node.nodeValue;
    if (!val || textNodeCache.get(node) === val) return;

    const parent = parentElementOrHost(node);
    if (!parent || isTextParentExcluded(parent)) return;
    if (isUserTitleProtectedText(parent, val)) return;

    let translated = getContextualTranslation(val, parent, node);
    if (translated === null) {
      translated = getSplitJsxNodeTranslation(val, node, parent);
    }
    if (translated === null) {
      translated = translateString(val);
    }

    if (translated !== null && translated !== undefined && translated !== val) {
      // 中文标点开头的拆分节点无需前导空格；中文文本节点紧邻纯中文兄弟文本节点时无需末尾空格
      if (/^\s+[，。、；：！？）】」』]/.test(translated)) {
        translated = translated.replace(/^\s+/, '');
      }
      if (/[\u4e00-\u9fff]\s+$/.test(translated)) {
        const next = node.nextSibling;
        if (next && next.nodeType === 3) {
          const nextTrans = (translateString(next.nodeValue) || next.nodeValue || '').trim();
          if (/^[\u4e00-\u9fff，。、；：！？]/.test(nextTrans)) {
            translated = translated.replace(/\s+$/, '');
          }
        }
      }
      if (translated === val) return;
      textNodeCache.set(node, translated);
      node.nodeValue = translated;
    }
  }

  const observedRoots = new WeakSet();

  // C++ TreeWalker filter that prunes excluded subtrees in O(1) without visiting their descendants
  const treeWalkerFilter = {
    acceptNode(node) {
      if (node.nodeType === 1) {
        if (isElementSubtreeExcluded(node)) {
          return NodeFilter.FILTER_REJECT;
        }
      } else if (node.nodeType === 3) {
        if (node.parentElement && node.parentElement.tagName === 'TEXTAREA') {
          return NodeFilter.FILTER_REJECT;
        }
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  };

  function walkAndTranslate(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType === 11 && root.host && isSubtreeExcluded(root.host)) {
      return;
    }
    if (root.nodeType === 1) {
      if (isSubtreeExcluded(root)) return;
      translateAttributes(root);
      if (root.shadowRoot) {
        observeRoot(root.shadowRoot);
        walkAndTranslate(root.shadowRoot);
      }
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      treeWalkerFilter
    );
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === 3) {
        translateTextNode(current);
      } else if (current.nodeType === 1) {
        translateAttributes(current);
        if (current.shadowRoot) {
          observeRoot(current.shadowRoot);
          walkAndTranslate(current.shadowRoot);
        }
      }
      current = walker.nextNode();
    }
  }

  const pendingNodes = new Set();
  const pendingAttributes = new Set();
  let rafScheduled = false;

  function coveredByBatch(node, batch, includeSelf) {
    // 合并同一批次遍历时兼顾 ShadowRoot 与其宿主节点
    let p = includeSelf ? node : node.parentNode || node.host;
    while (p) {
      if (batch.has(p)) return true;
      p = p.parentNode || p.host;
    }
    return false;
  }

  function flushPending() {
    rafScheduled = false;
    const batch = new Set(pendingNodes);
    const attributes = Array.from(pendingAttributes);
    pendingNodes.clear();
    pendingAttributes.clear();

    for (const node of batch) {
      try {
        if (node.isConnected === false || coveredByBatch(node, batch, false)) continue;
        walkAndTranslate(node);
      } catch (_) {}
    }
    for (const el of attributes) {
      try {
        if (el.isConnected === false || coveredByBatch(el, batch, true)) continue;
        translateAttributes(el);
      } catch (_) {}
    }
  }

  function scheduleFlush() {
    if (!rafScheduled) {
      rafScheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flushPending);
      } else {
        setTimeout(flushPending, 16);
      }
    }
  }

  function scheduleTranslate(node) {
    if (!node || (node.nodeType !== 1 && node.nodeType !== 3 && node.nodeType !== 11)) return;
    pendingNodes.add(node);
    scheduleFlush();
  }

  function observeRoot(rootNode) {
    if (!rootNode || observedRoots.has(rootNode)) return;
    observedRoots.add(rootNode);

    const observer = new MutationObserver((mutations) => {
      try {
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.type === 'characterData') {
            if (textNodeCache.get(m.target) !== m.target.nodeValue) scheduleTranslate(m.target);
          } else if (m.type === 'attributes') {
            const cached = attrNodeCache.get(m.target);
            if (!cached || ownLookup(cached, m.attributeName) !== m.target.getAttribute(m.attributeName)) {
              pendingAttributes.add(m.target);
              scheduleFlush();
            }
          } else if (m.type === 'childList') {
            for (let j = 0; j < m.addedNodes.length; j++) {
              scheduleTranslate(m.addedNodes[j]);
            }
          }
        }
      } catch (_) {}
    });

    observer.observe(rootNode, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS,
    });
  }

  // 监听空闲后动态挂载的开放式 Shadow DOM，消除延迟 attachShadow 漏译死角
  function installAttachShadowHook() {
    try {
      const proto = typeof Element !== 'undefined' ? Element.prototype : null;
      if (!proto || typeof proto.attachShadow !== 'function' || proto.__agZhShadowPatched) return;
      const origAttachShadow = proto.attachShadow;
      Object.defineProperty(proto, 'attachShadow', {
        configurable: true,
        writable: true,
        value: function () {
          const shadow = origAttachShadow.apply(this, arguments);
          try {
            if (shadow && shadow.mode === 'open') {
              observeRoot(shadow);
              scheduleTranslate(shadow);
            }
          } catch (_) {}
          return shadow;
        },
      });
      Object.defineProperty(proto, '__agZhShadowPatched', {
        value: true,
        configurable: true,
        enumerable: false,
        writable: false,
      });
    } catch (_) {}
  }

  function startEngine() {
    try {
      if (!document.body) {
        window.addEventListener('DOMContentLoaded', startEngine, { once: true });
        return;
      }
      if (
        document.documentElement &&
        (!document.documentElement.lang || /^en\b/i.test(document.documentElement.lang))
      ) {
        document.documentElement.lang = 'zh-CN';
      }
      walkAndTranslate(document.body);
      observeRoot(document.body);
      if (document.title) {
        const t = translateString(document.title);
        if (t) document.title = t;
      }
    } catch (_) {}
  }

  /**
   * 兼容 Gemini.app (WKWebView)：Apple CoreGraphics JPEG 编码器面对终端截图等高频对比度文字，
   * 在 quality=0.01 时仍常大于前端 10KB 缩略图上限 (13653 chars)，导致整张图被误拒。
   * 仅对非 Chromium 的 WebKit 引擎在缩略图极限压缩仍超限时，按递减边长重采样使其安全通过；
   * 主图 (1024px / 1MB) 从不触发此极低质量分支，画质完全保留。
   */
  function installWebKitThumbCompressionFallback() {
    try {
      const ua = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
      if (!/AppleWebKit/i.test(ua) || /Chrome|Chromium|CriOS|Edg|OPR|Electron|Firefox|FxiOS/i.test(ua)) return;
      const proto = typeof HTMLCanvasElement !== 'undefined' ? HTMLCanvasElement.prototype : null;
      if (!proto || typeof proto.toDataURL !== 'function' || proto.__agZhThumbPatched) return;

      const origToDataURL = proto.toDataURL;
      const MAX_THUMB_DATAURL_LEN = 13653;
      const THUMB_FALLBACK_EDGES = [240, 200, 160, 128, 96, 64];

      proto.toDataURL = function (type, quality) {
        const res = origToDataURL.apply(this, arguments);
        try {
          if (
            typeof type !== 'string' ||
            type.toLowerCase() !== 'image/jpeg' ||
            !Number.isFinite(quality) ||
            quality < 0 ||
            quality > 0.03 ||
            res.length <= MAX_THUMB_DATAURL_LEN
          ) {
            return res;
          }
          const w = this.width | 0;
          const h = this.height | 0;
          const maxDim = Math.max(w, h);
          if (w <= 0 || h <= 0 || maxDim > 320) {
            return res;
          }

          let best = res;
          for (let i = 0; i < THUMB_FALLBACK_EDGES.length; i++) {
            const edge = THUMB_FALLBACK_EDGES[i];
            if (edge >= maxDim) continue;
            const tw = Math.max(1, Math.round((w * edge) / maxDim));
            const th = Math.max(1, Math.round((h * edge) / maxDim));
            const tmp = document.createElement('canvas');
            tmp.width = tw;
            tmp.height = th;
            const ctx = tmp.getContext('2d');
            if (!ctx) continue;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(this, 0, 0, tw, th);
            const candidate = origToDataURL.call(tmp, 'image/jpeg', quality);
            best = candidate;
            if (candidate.length <= MAX_THUMB_DATAURL_LEN) {
              return candidate;
            }
          }
          return best;
        } catch (_) {
          return res;
        }
      };
      Object.defineProperty(proto, '__agZhThumbPatched', {
        value: true,
        configurable: false,
        enumerable: false,
      });
    } catch (_) {}
  }

  installAttachShadowHook();
  installWebKitThumbCompressionFallback();

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startEngine, { once: true });
  } else {
    startEngine();
  }
})();
