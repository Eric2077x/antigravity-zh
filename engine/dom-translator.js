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
  window.__AG_ZH_ENGINE_LOADED__ = true;

  const LOCALE =
    typeof __AG_ZH_LOCALE__ !== 'undefined'
      ? __AG_ZH_LOCALE__
      : { exact: {}, fragments: [] };
  const DICT = LOCALE.exact || {};
  const FRAGMENTS = LOCALE.fragments || [];

  const STATUS_MAP = {
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
  };

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

  const CORE_TERMS_FALLBACK = {
    'Best of N': '多路择优',
    'Best-of-N': '多路择优',
    Worktree: '工作树',
    Artifact: '产物',
    Artifacts: '产物',
    Planning: '规划',
    Coordinator: '协调者',
  };

  function dictLookup(str) {
    if (!str) return null;
    const key = str.trim();
    if (Object.prototype.hasOwnProperty.call(DICT, key)) return DICT[key];
    if (Object.prototype.hasOwnProperty.call(STATUS_MAP, key)) return STATUS_MAP[key];
    if (Object.prototype.hasOwnProperty.call(CORE_TERMS_FALLBACK, key)) return CORE_TERMS_FALLBACK[key];
    return null;
  }

  function translateRelTime(tStr) {
    if (!tStr) return tStr;
    if (/^just now$/i.test(tStr.trim())) return '刚刚';
    if (/^yesterday$/i.test(tStr.trim())) return '昨天';
    return translateDuration(tStr)
      .replace(/\s*ago$/i, '前')
      .replace(/^in\s+/i, '');
  }

  const CONV_ACTION_MAP = {
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
  };

  const DYNAMIC_RULES = [
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
        const prefix = pMap[m[1].toLowerCase().replace(/\s+/g, ' ')] || m[1];
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
        const verb = verbMap[m[1].toLowerCase()] || m[1];
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
        const unit = unitMap[m[2].toLowerCase()] || m[2];
        return m[3] ? `在 ${m[3]} 中找到 ${m[1]} ${unit}` : `找到 ${m[1]} ${unit}`;
      },
    },
    {
      re: /^Listed\s+directory\s+(.+)$/i,
      fn: (m) => `列出了目录 ${m[1]}`,
    },
    {
      re: /^(Viewed|Read|Edited|Created|Deleted|Updated|Wrote|Analyzed|Checked)\s+(.+?)(?:\s+\(lines?\s+(\d+(?:-\d+)?)\))?$/,
      fn: (m) => {
        if (/\s.*[.!?]$/.test(m[2]) || /\b(?:ago|yesterday)$/i.test(m[2])) return null;
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
        const v = vMap[m[1].toLowerCase()] || m[1];
        return m[3] ? `${v} ${m[2]}（第 ${m[3]} 行）` : `${v} ${m[2]}`;
      },
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
        const sc = scopeMap[m[2].toLowerCase().replace(/\s+/g, ' ')] || m[2];
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
        const sc = scopeMap[m[2].toLowerCase().replace(/\s+/g, ' ')] || m[2];
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
      fn: (m) => `${dictLookup(m[1]) || m[1]}（实验性）`,
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
        return `${pMap[k] || m[1]} (${m[2]})`;
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
        return `${m[1]} ${uMap[m[2].toLowerCase()] || m[2]}`;
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
        return `${m[1]} ${sMap[m[2].toLowerCase()] || m[2]}`;
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
      re: /^Proceed\s+with\s+implementation\s+plan\s+and\s+(\d+)\s+comments?$/i,
      fn: (m) => `附带 ${m[1]} 条评论继续执行实现计划`,
    },
    {
      re: /^Question\s+(\d+)\s+of\s+(\d+)$/i,
      fn: (m) => `第 ${m[1]} / ${m[2]} 个问题`,
    },
    {
      re: /^The\s+(.+?)\s+MCP\s+server\s+requires\s+configuration\s+parameters\s+before\s+it\s+can\s+be\s+started\.?$/i,
      fn: (m) => `${m[1]} MCP 服务器需要先填写配置参数才能启动。`,
    },
    {
      re: /^Save\s+rule\s+to\s+always\s+allow\s+(.+?)\?$/i,
      fn: (m) => `保存规则以始终允许 ${m[1]}？`,
    },
    {
      re: /^Are\s+you\s+sure\s+you\s+want\s+to\s+mark\s+all\s+(\d+)\s+conversations\s+as\s+read\?\s*This\s+action\s+cannot\s+be\s+undone\.?$/i,
      fn: (m) => `确定要将全部 ${m[1]} 个对话标为已读吗？此操作无法撤销。`,
    },
    {
      re: /^Mark\s+all\s+(\d+)\s+conversations\s+as\s+read$/i,
      fn: (m) => `将全部 ${m[1]} 个对话标为已读`,
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
    {
      re: /^Agent\s+needs\s+permission\s+to\s+act\s+on\s+(.+)$/i,
      fn: (m) => `智能体需要权限以操作 ${m[1]}`,
    },
    {
      re: /^Agent\s+needs\s+permission\s+to\s+execute\s+JavaScript\s+on\s+(.+)$/i,
      fn: (m) => `智能体需要权限以在 ${m[1]} 上执行 JavaScript`,
    },
    {
      re: /^Message\s+queued\.\s*(\d+)\s+messages?\s+in\s+queue\.?$/i,
      fn: (m) => `消息已加入队列（队列中共 ${m[1]} 条消息）。`,
    },
    {
      re: /^Artifacts\s+\((\d+)\s+Files?\s+for\s+Conversation\)$/i,
      fn: (m) => `产物（当前对话共 ${m[1]} 个文件）`,
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
      re: /^Stop\s+(\d+)\s+(agents?|subagents?|coordinators?|servers?|terminals?|tasks?)\?$/i,
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
        };
        const zhNoun = nounMap[m[2].toLowerCase()] || m[2];
        return `要停止 ${m[1]} 个${zhNoun}吗？`;
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
        return `已${map[m[1].toLowerCase()] || m[1]}“${m[2]}”${m[3] ? '。' : ''}`;
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
        return `${map[m[1].toLowerCase()] || m[1]}“${m[2]}”失败${m[3] ? '。' : ''}`;
      },
    },
    {
      re: /^Failed\s+to\s+(create|archive|delete)\s+([A-Za-z0-9 _.-]{2,48}?)(\.)?$/i,
      fn: (m) => {
        if (/[;{}()=<>]/.test(m[2])) return null;
        const map = { create: '创建', archive: '归档', delete: '删除' };
        return `${map[m[1].toLowerCase()] || m[1]} ${dictLookup(m[2]) || m[2]} 失败${m[3] ? '。' : ''}`;
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
        return `保存${map[key] || m[1]}失败：${m[2]}`;
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
        const act = CONV_ACTION_MAP[m[2].toLowerCase()];
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

  function translateString(raw) {
    if (!raw || typeof raw !== 'string') return null;
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
        if (STATUS_MAP[pt]) {
          changed = true;
          return STATUS_MAP[pt];
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

    // 5. Prefix rules (for long MCP/Skill descriptions and error notices)
    for (let i = 0; i < FRAGMENTS.length; i++) {
      const [enFrag, zhFrag] = FRAGMENTS[i];
      if (!enFrag) continue;
      if (trimmed.startsWith(enFrag)) {
        return lead + zhFrag + trail;
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

  // Subtrees that contain user code, editors, terminals, Lexical state, filenames, fuzzy highlights, or logs
  const SUBTREE_REJECT_SELECTOR =
    'pre, code, kbd, samp, var, script, style, svg, ' +
    '.monaco-editor, .monaco-keybinding, .keybinding-label, .xterm, .cm-editor, .ProseMirror, ' +
    '[contenteditable="true"], [data-lexical-editor], [data-lexical-text], [data-lexical-decorator], [data-lexical-beautiful-mention], ' +
    '[data-testid="file-title-name"], [data-testid="breadcrumb-segment"], [data-testid="branch-option"], ' +
    '[data-testid="fuzzy-match-highlight"], [data-testid="markdown-frontmatter"], [data-testid="terminal-surface"], ' +
    '[data-testid="sidecar-logs-content"], [data-testid="setup-script-output"], [data-testid="pdf-text-layer"], ' +
    '[data-testid="code-gutter"], [data-testid="code-gutter-diff"], [data-testid="row-gutter"], [data-no-translate]';

  // Built-in code/diff viewer line container (exclude text nodes, allow button aria-labels like Fold/Unfold)
  const CODE_LINE_SELECTOR = '.code-line, [data-line-number]';

  // Conversation prose containers (protect AI markdown & user prompts, but allow inner UI buttons/menus)
  const CHAT_PROSE_SELECTOR =
    '[data-testid="planner-response-text"], [data-testid="user-input-step"], ' +
    '[data-testid="side-question-answer"], [data-testid="side-question-question"], ' +
    '[data-testid="comment-card-text"]';

  const CHAT_UI_ALLOW_SELECTOR =
    'button, [role="button"], [role="menuitem"], .markdown-alert-title, ' +
    '[data-testid="markdown-table-copy-markdown"], [data-testid="markdown-table-width-toggle"], [data-testid="markdown-table-menu"]';

  function isSubtreeExcluded(el) {
    if (!el || el.nodeType !== 1) return false;
    if (EXCLUDED_TAGS.has(el.tagName)) return true;
    if (typeof el.closest === 'function' && el.closest(SUBTREE_REJECT_SELECTOR)) {
      return true;
    }
    return false;
  }

  function isTextParentExcluded(parent) {
    if (!parent || parent.nodeType !== 1) return true;
    if (parent.tagName === 'TEXTAREA') return true;
    if (isSubtreeExcluded(parent)) return true;
    if (typeof parent.closest === 'function') {
      if (parent.closest(CODE_LINE_SELECTOR)) {
        return true;
      }
      if (parent.closest(CHAT_PROSE_SELECTOR)) {
        if (!parent.closest(CHAT_UI_ALLOW_SELECTOR)) {
          return true;
        }
      }
    }
    return false;
  }

  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'data-placeholder', 'data-tooltip-content'];

  function translateAttributes(el) {
    if (!el || el.nodeType !== 1) return;
    if (EXCLUDED_TAGS.has(el.tagName)) return;
    // Skip attributes inside code editors or terminals
    const inEditor =
      typeof el.closest === 'function' &&
      el.closest('pre, code, .monaco-editor, .xterm, .cm-editor, [data-testid="file-title-name"], [data-no-translate]');
    if (inEditor) return;

    for (let i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
      const attr = TRANSLATABLE_ATTRS[i];
      if (el.hasAttribute(attr)) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        if (el.__agZhAttrCache && el.__agZhAttrCache[attr] === val) continue;
        const translated = translateString(val);
        if (translated && translated !== val) {
          if (!el.__agZhAttrCache) el.__agZhAttrCache = {};
          el.__agZhAttrCache[attr] = translated;
          el.setAttribute(attr, translated);
        }
      }
    }
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const val = node.nodeValue;
    if (!val || node.__agZhLast === val) return;

    const parent = node.parentElement;
    if (!parent || isTextParentExcluded(parent)) return;

    const translated = translateString(val);
    if (translated && translated !== val) {
      if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) {
        parent.setAttribute('value', val.trim());
      }
      node.__agZhLast = translated;
      node.nodeValue = translated;
    }
  }

  const observedRoots = new WeakSet();

  // C++ TreeWalker filter that prunes excluded subtrees in O(1) without visiting their descendants
  const treeWalkerFilter = {
    acceptNode(node) {
      if (node.nodeType === 1) {
        if (EXCLUDED_TAGS.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (typeof node.matches === 'function' && node.matches(SUBTREE_REJECT_SELECTOR)) {
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
  let rafScheduled = false;

  function flushPending() {
    rafScheduled = false;
    const batch = Array.from(pendingNodes);
    const batchSet = new Set(batch);
    pendingNodes.clear();

    for (let i = 0; i < batch.length; i++) {
      try {
        const node = batch[i];
        const isShadow = typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot;
        if (!node || (isShadow ? node.host && node.host.isConnected === false : node.isConnected === false)) {
          continue;
        }
        // Skip if an ancestor of this node is also in the current batch
        let ancestorInBatch = false;
        let p = node.parentNode;
        while (p) {
          if (batchSet.has(p)) {
            ancestorInBatch = true;
            break;
          }
          p = p.parentNode;
        }
        if (!ancestorInBatch) {
          walkAndTranslate(node);
        }
      } catch (_) {}
    }
  }

  function scheduleTranslate(node) {
    if (!node) return;
    if (node.nodeType === 1 && isSubtreeExcluded(node)) return;
    pendingNodes.add(node);
    if (!rafScheduled) {
      rafScheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flushPending);
      } else {
        setTimeout(flushPending, 16);
      }
    }
  }

  function observeRoot(rootNode) {
    if (!rootNode || observedRoots.has(rootNode)) return;
    observedRoots.add(rootNode);

    const observer = new MutationObserver((mutations) => {
      try {
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.type === 'characterData') {
            translateTextNode(m.target);
          } else if (m.type === 'attributes') {
            translateAttributes(m.target);
          } else if (m.type === 'childList') {
            for (let j = 0; j < m.addedNodes.length; j++) {
              const added = m.addedNodes[j];
              if (added.nodeType === 3) {
                translateTextNode(added);
              } else if (added.nodeType === 1) {
                scheduleTranslate(added);
              }
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

  function startEngine() {
    try {
      if (!document.body) {
        window.addEventListener('DOMContentLoaded', startEngine, { once: true });
        return;
      }
      walkAndTranslate(document.body);
      observeRoot(document.body);
      if (document.title) {
        const t = translateString(document.title);
        if (t) document.title = t;
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startEngine, { once: true });
  } else {
    startEngine();
  }
})();
