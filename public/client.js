(function (W, D) {
  'use strict';

  var VERSION = '19.10.14-wk-data-nbb-open';

  if (W.WKChat && W.WKChat.version === VERSION && W.__wkV19114WkDataNbbOpen) return;

  try {
    if (W.WKChat && typeof W.WKChat.unmount === 'function') W.WKChat.unmount();
  } catch (e0) {}

  W.__wkV19114WkDataNbbOpen = true;
  W.__wkV19111WkDataNbbOpen = true;
  W.__wkV19110WkDataNbbOpen = true;
  W.__wkV19109WkDataNbbOpen = true;
  W.__wkV19108WkDataNbbOpen = true;
  W.__wkV19107WkDataNbbOpen = true;
  W.__wkV19106WkDataNbbOpen = true;
  W.__wkV19105WkDataNbbOpen = true;

  var CFG = W.WKChatConfig || (W.WKChatConfig = {});

  function cfg(name, fallback) {
    return Object.prototype.hasOwnProperty.call(CFG, name) ? CFG[name] : fallback;
  }

  var ITEM_H = 92;
  var BUFFER = 4;
  var MAX_CONV = +cfg('maxConversations', 200) || 200;
  var MSG_COUNT = +cfg('syncMessageCount', 5) || 5;

  var BRIDGE_BASES = cfg('bridgeBases', ['', '/bridge', '/wkbridge']);
  if (typeof BRIDGE_BASES === 'string') BRIDGE_BASES = [BRIDGE_BASES];

  var TOKEN_PATH = cfg('tokenPath', '/token');
  var CONV_SYNC_PATH = cfg('conversationSyncPath', '/conversation/sync');

  var POLL_HEALTHY_MS = +cfg('pollHealthyMs', 45000) || 45000;
  var POLL_UNHEALTHY_MS = +cfg('pollUnhealthyMs', 30000) || 30000;
  var SYNC_MIN_GAP_MS = +cfg('syncMinGapMs', 1300) || 1300;
  var SYNC_TRAILING_MS = +cfg('syncTrailingMs', 1200) || 1200;
  var SAVE_THROTTLE_MS = +cfg('saveThrottleMs', 2500) || 2500;
  var FETCH_TIMEOUT_MS = +cfg('fetchTimeoutMs', 10000) || 10000;
  var REALTIME_EVENTS = cfg('realtimeEvents', true) !== false;
  var SDK_REALTIME = cfg('sdkRealtime', true) !== false;
  var SDK_URL = cfg('sdkUrl', 'https://cdn.jsdelivr.net/npm/wukongimjssdk@latest/lib/wukongimjssdk.umd.js');
  var WKWS_PATH = cfg('wkwsPath', '/wkws/');
  var WKWS_ADDR = cfg('wkwsAddr', '');
  var REALTIME_WS_TAP = cfg('realtimeWsTap', false) === true;
  var PROFILE_TTL = 12 * 36e5;
  var PROFILE_BATCH = 6;

  var LONG_PRESS_MS = 420;
  var MOUNT_RETRY_MS = 80;
  var DEBUG_MODE = /(?:\?|&)wkdebug=1(?:&|$)/.test(W.location.search) || !!cfg('debug', false);
  var DEBUG_WK = DEBUG_MODE;

  var FLAGS = {
    '中国':'cn','cn':'cn','china':'cn','台湾':'tw','tw':'tw','taiwan':'tw',
    '香港':'hk','hk':'hk','澳门':'mo','mo':'mo','缅甸':'mm','mm':'mm','myanmar':'mm',
    '越南':'vn','vn':'vn','vietnam':'vn','日本':'jp','jp':'jp','japan':'jp',
    '韩国':'kr','kr':'kr','korea':'kr','美国':'us','us':'us','usa':'us',
    '英国':'gb','gb':'gb','uk':'gb','泰国':'th','th':'th','thailand':'th',
    '老挝':'la','la':'la','laos':'la','新加坡':'sg','sg':'sg','singapore':'sg',
    '马来西亚':'my','my':'my','malaysia':'my','菲律宾':'ph','ph':'ph','philippines':'ph',
    '印尼':'id','id':'id','indonesia':'id','柬埔寨':'kh','kh':'kh','cambodia':'kh',
    '印度':'in','in':'in','india':'in','俄罗斯':'ru','ru':'ru','russia':'ru',
    '德国':'de','de':'de','germany':'de','法国':'fr','fr':'fr','france':'fr',
    '巴西':'br','br':'br','brazil':'br','加拿大':'ca','ca':'ca','canada':'ca',
    '澳大利亚':'au','au':'au','australia':'au','土耳其':'tr','tr':'tr','turkey':'tr',
    '阿联酋':'ae','ae':'ae','uae':'ae','迪拜':'ae','沙特':'sa','sa':'sa',
    '埃及':'eg','eg':'eg','egypt':'eg','南非':'za','za':'za'
  };

  function log() {
    if (!DEBUG_WK || !W.console || typeof W.console.log !== 'function') return;
    var args = ['[WKChat ' + VERSION + ']'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    try { W.console.log.apply(W.console, args); } catch (e) {}
  }

  function warn() {
    if (!DEBUG_WK || !W.console || typeof W.console.warn !== 'function') return;
    var args = ['[WKChat ' + VERSION + ']'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    try { W.console.warn.apply(W.console, args); } catch (e) {}
  }

  function basePath() {
    return (W.config && W.config.relative_path) || '';
  }

  function stripBase(path) {
    path = String(path || '');
    var bp = basePath();
    if (bp && path.indexOf(bp) === 0) path = path.slice(bp.length);
    return path;
  }

  function chatPath(path) {
    path = stripBase(path || W.location.pathname);
    return path.replace(/^\/+/, '').split('?')[0].split('#')[0];
  }

  function isChatList(path) {
    path = chatPath(path || W.location.pathname);
    return /^(user\/[^/]+\/)?chats\/?$/.test(path);
  }

  function isChatDetail(path) {
    path = chatPath(path || W.location.pathname);
    return /^(user\/[^/]+\/)?chats\/[^/]+$/.test(path);
  }

  // 只在“会话列表页”接管 UI；打开具体聊天 /chats/{roomId} 时释放页面，避免输入框被列表页样式影响。
  function isChats(path) {
    return isChatList(path || W.location.pathname);
  }

  function setAttrOnRootAndBody(name, value) {
    if (value == null) {
      D.documentElement.removeAttribute(name);
      if (D.body) D.body.removeAttribute(name);
      return;
    }

    D.documentElement.setAttribute(name, value);
    if (D.body) D.body.setAttribute(name, value);
  }

  function clearListModeFlags() {
    setAttrOnRootAndBody('data-wk', null);
    setAttrOnRootAndBody('data-wk-probe', null);
  }

  function setDetailMode(flag) {
    if (flag) {
      clearListModeFlags();
      setAttrOnRootAndBody('data-wk-detail', '1');
    } else {
      setAttrOnRootAndBody('data-wk-detail', null);
    }
  }

  function setListProbeMode() {
    setDetailMode(false);
    setAttrOnRootAndBody('data-wk-probe', '1');
  }


  function installCriticalCss() {
    if (D.getElementById('wkchat-critical-hide')) return;

    var css = '' +
      'html[data-wk-probe="1"] [component="bottombar"],body[data-wk-probe="1"] [component="bottombar"],' +
      'html[data-wk-probe="1"] .sidebar-left,body[data-wk-probe="1"] .sidebar-left,' +
      'html[data-wk-probe="1"] .sidebar-right,body[data-wk-probe="1"] .sidebar-right,' +
      'html[data-wk-probe="1"] .fixed-bottom .navigator-mobile,body[data-wk-probe="1"] .fixed-bottom .navigator-mobile,' +
      'html[data-wk-probe="1"] [data-widget-area="header"],body[data-wk-probe="1"] [data-widget-area="header"]{display:none!important;}' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"]> *:not(#wk-root),' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"]> *:not(#wk-root),' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"] [component="chat/recent"],' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"] [component="chat/recent"],' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"] [component="chat/public"],' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"] [component="chat/public"],' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"] .chats-list,' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"] .chats-list,' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"] #private-rooms,' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"] #private-rooms,' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"] #public-rooms,' +
      'body[data-wk-probe="1"] [component="chat/nav-wrapper"] #public-rooms{display:none!important;}' +
      'html[data-wk-probe="1"] [component="chat/nav-wrapper"],body[data-wk-probe="1"] [component="chat/nav-wrapper"]{padding:0!important;margin:0!important;display:flex!important;flex-direction:column;min-height:100%;position:relative;}';

    var style = D.createElement('style');
    style.id = 'wkchat-critical-hide';
    style.type = 'text/css';
    style.appendChild(D.createTextNode(css));
    (D.head || D.documentElement).appendChild(style);
  }

  function setEarlyProbe() {
    if (isChatDetail(location.pathname)) {
      setDetailMode(true);
      return;
    }

    if (!isChats(location.pathname)) {
      clearListModeFlags();
      return;
    }

    if (D.body) {
      setListProbeMode();
    } else {
      D.documentElement.removeAttribute('data-wk-detail');
      D.documentElement.setAttribute('data-wk-probe', '1');
      D.addEventListener('DOMContentLoaded', function () {
        if (D.body && isChats(location.pathname)) setListProbeMode();
      }, { once: true });
    }
  }

  installCriticalCss();
  setEarlyProbe();

  function myUid() {
    return String(
      (W.app && W.app.user && W.app.user.uid) ||
      (W.config && W.config.uid) ||
      ''
    );
  }

  function mySlug() {
    return (
      (W.app && W.app.user && W.app.user.userslug) ||
      (W.ajaxify && W.ajaxify.data && W.ajaxify.data.user && W.ajaxify.data.user.userslug) ||
      (W.config && W.config.username) ||
      ''
    );
  }

  function isNumericId(v) {
    return /^\d+$/.test(String(v || ''));
  }

  function userApiUrl(idOrSlug) {
    idOrSlug = String(idOrSlug || '');
    if (!idOrSlug) return '';

    return basePath() + (
      isNumericId(idOrSlug)
        ? '/api/user/uid/' + encodeURIComponent(idOrSlug)
        : '/api/user/' + encodeURIComponent(idOrSlug)
    );
  }

  function extractUserPayload(raw) {
    if (!raw) return null;

    var candidates = [raw, raw.response, raw.user, raw.response && raw.response.user];

    for (var i = 0; i < candidates.length; i++) {
      var u = candidates[i];
      if (u && (u.uid || u.username || u.userslug)) return u;
    }

    return null;
  }

  function toMs(ts, fallback) {
    if (ts == null || ts === '') return fallback || Date.now();

    if (typeof ts === 'string' && isNaN(+ts)) {
      var p = new Date(ts).getTime();
      return isNaN(p) ? (fallback || Date.now()) : p;
    }

    var n = +ts;
    if (!n) return fallback || Date.now();
    return n < 1e12 ? n * 1000 : n;
  }

  function stripHtml(s) {
    return String(s == null ? '' : s).replace(/<[^>]+>/g, '');
  }

  function trimPreview(s, n) {
    s = stripHtml(s).replace(/\s+/g, ' ').trim();
    n = n || 50;
    return s.length > n ? s.slice(0, n) + '…' : s;
  }


  function isGenericUserLabel(name, id) {
    name = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
    id = String(id == null ? '' : id).trim();

    if (!name) return true;
    if (id && (name === id || name === ('用户 ' + id) || name === ('用户' + id) || name.toLowerCase() === ('user ' + id))) return true;
    if (/^用户\s*\d+$/.test(name)) return true;
    if (/^user\s*\d+$/i.test(name)) return true;

    return false;
  }

  function safeJsonClone(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
  }

  function get(obj, keys, fallback) {
    if (!obj) return fallback;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] != null && obj[k] !== '') return obj[k];
    }
    return fallback;
  }

  function nestedGet(obj, paths, fallback) {
    if (!obj) return fallback;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i].split('.');
      var cur = obj;
      for (var j = 0; j < p.length; j++) {
        if (cur == null) break;
        cur = cur[p[j]];
      }
      if (cur != null && cur !== '') return cur;
    }
    return fallback;
  }

  function decodeBytesToText(raw) {
    var arr = null;

    if (raw == null || raw === '') return '';

    try {
      if (raw instanceof Uint8Array) {
        arr = raw;
      } else if (raw instanceof ArrayBuffer) {
        arr = new Uint8Array(raw);
      } else if (Array.isArray(raw)) {
        arr = new Uint8Array(raw);
      } else if (raw && raw.type === 'Buffer' && Array.isArray(raw.data)) {
        arr = new Uint8Array(raw.data);
      }
    } catch (e) {}

    if (!arr) return '';

    try {
      if (W.TextDecoder) return new W.TextDecoder('utf-8', { fatal: false }).decode(arr);
    } catch (e2) {}

    var encoded = '';
    for (var i = 0; i < arr.length; i++) {
      encoded += '%' + ('00' + arr[i].toString(16)).slice(-2);
    }

    try { return decodeURIComponent(encoded); } catch (e3) { return ''; }
  }

  function looksPrintableText(s) {
    s = String(s == null ? '' : s);
    if (!s) return false;

    // UTF-8 解码失败常见替换字符；这种不要展示给用户。
    var replacementCount = (s.match(/\uFFFD/g) || []).length;
    if (replacementCount && replacementCount >= Math.max(1, Math.floor(s.length / 3))) return false;

    // 大量控制字符也说明不是文本。
    var ctl = (s.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
    if (ctl > 0) return false;

    return true;
  }

  function isProbablyBase64(s) {
    s = String(s || '').trim();
    if (!s) return false;

    // 很短的数字字符串，例如 "66"，可能就是用户发的内容，不能拿去 atob。
    if (/^\d+$/.test(s)) return false;

    // 悟空 JSON base64 常见 eyJ...；普通文本不要误判。
    if (/^eyJ[A-Za-z0-9+/=_-]{4,}$/.test(s)) return true;

    if (s.length < 8) return false;
    if (s.length % 4 === 1) return false;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;

    return true;
  }

  function tryParseJson(s) {
    s = String(s || '').trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  function normalizeWkSpecialPayloadText(text) {
    text = String(text == null ? '' : text).trim();
    if (!text) return '';

    // 悟空通话消息：__wkcall__:{"type":"ringing",...}
    if (text.indexOf('__wkcall__:') === 0) {
      var raw = text.slice('__wkcall__:'.length);
      var obj = tryParseJson(raw) || {};
      var t = String(obj.type || '').toLowerCase();

      if (t === 'cancel') return '[通话已取消]';
      if (t === 'reject') return '[通话已拒绝]';
      if (t === 'busy') return '[对方忙线]';
      if (t === 'accept' || t === 'connected') return '[通话中]';
      if (t === 'hangup' || t === 'end' || t === 'finish') return '[通话已结束]';
      if (t === 'ringing' || t === 'invite') return '[通话邀请]';

      return '[通话消息]';
    }

    // 兜底：如果内容里有 __wkcall__，也不要露出内部 JSON。
    if (text.indexOf('__wkcall__') > -1) return '[通话消息]';

    if (!looksPrintableText(text)) return '';

    return text;
  }

  function payloadObjectToText(payload) {
    if (!payload) return '';

    var text =
      payload.text ||
      payload.content ||
      payload.message ||
      payload.msg ||
      payload.body ||
      payload.title ||
      '';

    if (text && typeof text === 'object') {
      text = text.text || text.content || text.message || '';
    }

    return normalizeWkSpecialPayloadText(text);
  }

  function extractWkPayload(m) {
    try {
      if (!m) return {};

      if (m.payload_decoded && typeof m.payload_decoded === 'object') return m.payload_decoded;
      if (m.decoded_payload && typeof m.decoded_payload === 'object') return m.decoded_payload;

      var raw =
        m.payload != null ? m.payload :
        m.content != null ? m.content :
        m.messageContent != null ? m.messageContent :
        m.message_content != null ? m.message_content :
        m.message_payload != null ? m.message_payload :
        m.messagePayload != null ? m.messagePayload :
        m.payload_data != null ? m.payload_data :
        m.payloadData != null ? m.payloadData :
        m.body != null ? m.body :
        null;

      if (raw == null) return {};

      if (
        typeof raw === 'object' &&
        !(raw instanceof Uint8Array) &&
        !(raw instanceof ArrayBuffer) &&
        !Array.isArray(raw) &&
        !(raw.type === 'Buffer' && Array.isArray(raw.data))
      ) {
        return raw;
      }

      if (typeof raw === 'string') {
        var s = raw.trim();
        if (!s) return {};

        var normalizedSpecial = normalizeWkSpecialPayloadText(s);
        if (normalizedSpecial && normalizedSpecial !== s) return { text: normalizedSpecial };

        if (s.charAt(0) === '{' || s.charAt(0) === '[') {
          var direct = tryParseJson(s);
          if (direct != null) {
            if (Array.isArray(direct) && direct.length && typeof direct[0] === 'number') {
              var txtFromArr = decodeBytesToText(direct);
              var parsedFromArr = tryParseJson(txtFromArr);
              if (parsedFromArr) return parsedFromArr;
              txtFromArr = normalizeWkSpecialPayloadText(txtFromArr);
              return txtFromArr ? { text: txtFromArr } : {};
            }
            return direct;
          }
        }

        if (/^\d+(?:\s*,\s*\d+)+$/.test(s)) {
          var nums = s.split(',').map(function (x) { return Number(x.trim()); });
          var txtFromNums = decodeBytesToText(nums);
          var parsedNums = tryParseJson(txtFromNums);
          if (parsedNums) return parsedNums;
          txtFromNums = normalizeWkSpecialPayloadText(txtFromNums);
          return txtFromNums ? { text: txtFromNums } : {};
        }

        if (isProbablyBase64(s)) {
          try {
            var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';

            var bin = atob(b64);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

            var txtFromBase64 = decodeBytesToText(bytes);
            var parsedBase64 = tryParseJson(txtFromBase64);
            if (parsedBase64) return parsedBase64;

            txtFromBase64 = normalizeWkSpecialPayloadText(txtFromBase64);
            if (txtFromBase64) return { text: txtFromBase64 };
          } catch (e4) {}
        }

        // 普通字符串直接展示；比如用户真发了 "66"，这里会保留 66。
        s = normalizeWkSpecialPayloadText(s);
        return s ? { text: s } : {};
      }

      var txt = decodeBytesToText(raw);
      if (txt) {
        var parsed = tryParseJson(txt);
        if (parsed) return parsed;
        txt = normalizeWkSpecialPayloadText(txt);
        return txt ? { text: txt } : {};
      }
    } catch (e5) {
      warn('extract-wk-payload', e5);
    }

    return {};
  }

  function payloadTextFromMessage(msg) {
    msg = msg || {};

    var payload = extractWkPayload(msg);
    var text = payloadObjectToText(payload);

    if (!text && typeof msg.content === 'string') text = normalizeWkSpecialPayloadText(msg.content);
    if (!text && typeof msg.message === 'string') text = normalizeWkSpecialPayloadText(msg.message);
    if (!text && typeof msg.body === 'string') text = normalizeWkSpecialPayloadText(msg.body);

    text = trimPreview(text || '', 60);

    if (/^\[图片\]|^!\[\]/.test(text)) return '[图片]';
    if (/^\[视频\]/.test(text)) return '[视频]';
    if (/^\[语音/.test(text)) return '[语音]';
    if (/^\[文件/.test(text)) return '[文件]';

    return text || '[消息]';
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(toMs(ts, 0));
    if (isNaN(d.getTime())) return '';

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.floor((today - tDay) / 864e5);

    function p(x) { return x < 10 ? '0' + x : '' + x; }

    if (diff === 0) return p(d.getHours()) + ':' + p(d.getMinutes());
    if (diff === 1) return '昨天';
    if (diff < 7) return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function cleanFlagText(raw) {
    return String(raw || '')
      .replace(/["\[\]{}()]/g, '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function codeToFlagEmoji(code) {
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return '';
    var A = 0x1F1E6;
    try {
      return String.fromCodePoint(A + code.charCodeAt(0) - 65) +
        String.fromCodePoint(A + code.charCodeAt(1) - 65);
    } catch (e) {
      return '';
    }
  }

  function flagEmoji(raw) {
    if (!raw) return '';

    var s = String(raw || '');
    var m = s.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
    if (m) return m[0];

    var cleaned = cleanFlagText(raw);
    var code = FLAGS[cleaned];

    if (!code) {
      for (var k in FLAGS) {
        if (Object.prototype.hasOwnProperty.call(FLAGS, k) && cleaned.indexOf(k) > -1) {
          code = FLAGS[k];
          break;
        }
      }
    }

    if (!code && /^[a-z]{2}$/.test(cleaned)) code = cleaned;
    return code ? codeToFlagEmoji(code) : '';
  }

  function avatarFallback(name) {
    var ch = String(name || '?').charAt(0) || '?';
    ch = ch.replace(/[<>&"]/g, '');

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">' +
      '<rect width="100%" height="100%" rx="64" ry="64" fill="#6c757d"/>' +
      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" ' +
      'font-family="Arial, sans-serif" font-size="56" fill="#fff">' +
      ch +
      '</text></svg>';

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function computeItemHeight() {
    var w = Math.max(
      W.innerWidth || 0,
      D.documentElement.clientWidth || 0,
      D.body ? D.body.clientWidth : 0
    );

    return w <= 420 ? 84 : w <= 768 ? 88 : 92;
  }

  function applyItemHeight() {
    var h = computeItemHeight();
    if (h === ITEM_H) return false;
    ITEM_H = h;

    var root = D.getElementById('wk-root');
    if (root) root.style.setProperty('--wk-item-h', ITEM_H + 'px');

    return true;
  }

  function normalizeStatus(v) {
    v = String(v || '').toLowerCase();
    if (!v) return 'offline';
    if (v === '1' || v === 'true') return 'online';
    if (v.indexOf('online') > -1 || v === 'connected' || v === 'active') return 'online';
    if (v.indexOf('away') > -1 || v === 'idle') return 'away';
    if (v.indexOf('dnd') > -1 || v === 'busy') return 'dnd';
    return 'offline';
  }

  function roomActivityTs(room) {
    if (!room) return 0;
    var t = room.teaser || {};
    var ts =
      t.timestamp ||
      t.timestampISO ||
      (room.last_message && room.last_message.timestamp) ||
      room.timestamp ||
      room.updated_at ||
      0;

    return toMs(ts, 0) || 0;
  }

  function roomStableId(roomOrId) {
    if (!roomOrId) return '';

    if (typeof roomOrId === 'string' || typeof roomOrId === 'number') return String(roomOrId);

    return String(
      roomOrId.roomId ||
      roomOrId.room_id ||
      roomOrId.nodebb_room_id ||
      roomOrId.nbb_room_id ||
      roomOrId.channel_id ||
      roomOrId.channelId ||
      ''
    );
  }

  function roomChannelId(roomOrId) {
    if (!roomOrId) return '';

    if (typeof roomOrId === 'string' || typeof roomOrId === 'number') return String(roomOrId);

    return String(
      roomOrId.channel_id ||
      roomOrId.channelId ||
      roomOrId.target_uid ||
      roomOrId.targetUid ||
      roomOrId.uid ||
      ''
    );
  }

  function nodebbRoomId(roomOrId) {
    if (!roomOrId || typeof roomOrId !== 'object') return '';

    var explicit = String(
      roomOrId.nodebb_room_id ||
      roomOrId.nbb_room_id ||
      roomOrId.chat_room_id ||
      roomOrId.chatRoomId ||
      roomOrId._nodebbRoomId ||
      ''
    );

    if (explicit) return explicit;

    if (roomOrId._hasNodeBBRoomId) {
      return String(roomOrId.roomId || roomOrId.room_id || '');
    }

    return '';
  }

  function sortRoomsStable(list, prevOrder) {
    prevOrder = prevOrder || {};

    list.sort(function (a, b) {
      var ra = Math.max(roomActivityTs(a), +a._lastPatchedAt || 0);
      var rb = Math.max(roomActivityTs(b), +b._lastPatchedAt || 0);

      if (rb !== ra) return rb - ra;

      var ia = prevOrder[roomStableId(a)];
      var ib = prevOrder[roomStableId(b)];

      if (typeof ia === 'number' && typeof ib === 'number' && ia !== ib) return ia - ib;

      return 0;
    });

    return list;
  }

  function getBridgeUrl(path) {
    path = String(path || '');
    if (path && path.charAt(0) !== '/') path = '/' + path;

    var out = [];

    for (var i = 0; i < BRIDGE_BASES.length; i++) {
      var b = String(BRIDGE_BASES[i] || '').replace(/\/+$/, '');
      out.push((/^https?:\/\//i.test(b) ? b : (basePath() + b)) + path);
    }

    return out;
  }

  function mergeHeaders(base, extra) {
    var out = {};
    var k;
    base = base || {};
    extra = extra || {};

    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }

    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }

    return out;
  }

  function fetchWithTimeout(url, options) {
    options = options || {};

    var finalOptions = {};
    var k;

    for (k in options) {
      if (Object.prototype.hasOwnProperty.call(options, k)) finalOptions[k] = options[k];
    }

    finalOptions.cache = 'no-store';
    finalOptions.headers = mergeHeaders({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }, finalOptions.headers || {});

    if (String(finalOptions.method || 'GET').toUpperCase() !== 'GET') {
      finalOptions.headers['x-csrf-token'] = (W.config && W.config.csrf_token) || finalOptions.headers['x-csrf-token'] || '';
    }

    if (W.AbortController && FETCH_TIMEOUT_MS > 0) {
      var controller = new W.AbortController();
      var timer = setTimeout(function () {
        try { controller.abort(); } catch (e) {}
      }, FETCH_TIMEOUT_MS);

      finalOptions.signal = controller.signal;

      return fetch(url, finalOptions).then(function (res) {
        clearTimeout(timer);
        return res;
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
    }

    return fetch(url, finalOptions);
  }

  function fetchFirstJson(urls, options) {
    var i = 0;
    var lastErr = null;

    function next() {
      if (i >= urls.length) {
        return Promise.reject(lastErr || new Error('all_bridge_urls_failed'));
      }

      var url = urls[i++];

      return fetchWithTimeout(url, options).then(function (res) {
        if (!res.ok) {
          lastErr = new Error(url + ' HTTP ' + res.status);
          return next();
        }

        return res.json();
      }).catch(function (err) {
        lastErr = err;
        return next();
      });
    }

    return next();
  }

  function extractList(data) {
    if (!data) return [];

    if (Array.isArray(data)) return data;

    var candidates = [
      data.data,
      data.conversations,
      data.conversation_list,
      data.conversationList,
      data.list,
      data.result,
      data.response,
      data.response && data.response.data,
      data.response && data.response.conversations,
      data.response && data.response.list
    ];

    for (var i = 0; i < candidates.length; i++) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }

    return [];
  }

  function msgTs(m) {
    return toMs(
      get(m, ['timestamp', 'message_timestamp', 'client_msg_no_time', 'created_at', 'createdAt', 'time'], null),
      0
    ) || 0;
  }

  function msgSeq(m) {
    var v = get(m, ['message_seq', 'messageSeq', 'seq', 'message_id', 'messageId', 'id'], 0);
    var n = +v || 0;
    return n;
  }

  function newestFromArray(arr) {
    if (!Array.isArray(arr) || !arr.length) return null;

    var best = null;
    var bestScore = -1;

    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m) continue;

      var score = Math.max(msgTs(m), msgSeq(m));
      if (!best || score >= bestScore) {
        best = m;
        bestScore = score;
      }
    }

    return best || arr[arr.length - 1] || null;
  }

  function extractLatestConversationMessage(c) {
    if (!c) return {};

    var direct = c.lastMessage || c.last_message || c.lastMsg || c.last_msg || c.latestMessage || c.latest_message || c.message || c.msg || null;
    if (direct) return direct;

    var arrays = [
      c.recents,
      c.messages,
      c.message_list,
      c.messageList,
      c.last_messages,
      c.lastMessages,
      c.latest_messages,
      c.latestMessages
    ];

    for (var i = 0; i < arrays.length; i++) {
      var found = newestFromArray(arrays[i]);
      if (found) return found;
    }

    return {};
  }

  var WKAdapter = {
    token: null,
    uid: '',
    ensured: false,
    ensureTokenPromise: null,

    ensureToken: function () {
      if (this.ensured && this.uid) return Promise.resolve({ uid: this.uid, token: this.token });

      if (this.ensureTokenPromise) return this.ensureTokenPromise;

      var self = this;

      this.ensureTokenPromise = fetchFirstJson(getBridgeUrl(TOKEN_PATH), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(function (data) {
        self.ensured = true;
        self.uid = String((data && data.uid) || myUid() || '');
        self.token = data && data.token || '';

        if (self.uid) Store.uid = self.uid;

        log('token ensured', self.uid);

        return data;
      }).catch(function (err) {
        warn('token ensure failed', err && err.message ? err.message : err);
        throw err;
      }).then(function (data) {
        self.ensureTokenPromise = null;
        return data;
      }, function (err) {
        self.ensureTokenPromise = null;
        throw err;
      });

      return this.ensureTokenPromise;
    },

    fetchConversations: function () {
      var self = this;
      var payload = {
        uid: String(Store.uid || myUid() || ''),
        version: 0,
        msg_count: MSG_COUNT,
        _: Date.now()
      };

      return fetchFirstJson(getBridgeUrl(CONV_SYNC_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'x-wkchat-refresh': String(Date.now())
        },
        body: JSON.stringify(payload)
      }).then(function (data) {
        var list = extractList(data);
        return list.map(function (c) { return self.normalizeConversation(c); }).filter(Boolean);
      });
    },

    normalizeConversation: function (c) {
      if (!c || typeof c !== 'object') return null;

      var channelType = +get(c, ['channel_type', 'channelType', 'type'], 1) || 1;

      if (channelType && channelType !== 1) {
        return null;
      }

      var last = extractLatestConversationMessage(c);

      var channelId = String(
        get(c, [
          'channel_id',
          'channelId',
          'target_uid',
          'targetUid',
          'target',
          'uid',
          'to_uid',
          'toUid',
          'touid'
        ], '') ||
        get(last, ['channel_id', 'channelId', 'target_uid', 'targetUid', 'to_uid', 'toUid', 'touid', 'from_uid', 'fromUid', 'fromuid'], '') ||
        ''
      );

      var selfUidForChannel = String(Store.uid || myUid() || '');
      if (channelId && selfUidForChannel && channelId === selfUidForChannel) {
        var altChannelId = String(get(last, ['target_uid', 'targetUid', 'to_uid', 'toUid', 'touid', 'channel_id', 'channelId'], '') || '');
        if (altChannelId && altChannelId !== selfUidForChannel) channelId = altChannelId;
      }

      var roomId = String(
        get(c, [
          'roomId',
          'room_id',
          'nodebb_room_id',
          'nbb_room_id',
          'chat_room_id',
          'chatRoomId'
        ], '') ||
        nestedGet(c, [
          'extra.roomId',
          'extra.room_id',
          'extra.nodebb_room_id',
          'extra.nbb_room_id',
          'nodebb.roomId',
          'nodebb.room_id'
        ], '') ||
        ''
      );

      var realNodeBBRoomId = roomId;

      if (!channelId && realNodeBBRoomId) channelId = realNodeBBRoomId;

      if (!realNodeBBRoomId && !channelId) return null;

      // 悟空 conversation/sync 大多数情况下只有 channel_id，没有 NodeBB roomId。
      // 列表内部仍用 channel_id 做稳定 key，但点击时会先解析/创建 NodeBB roomId 后再打开 /chats/{roomId}。
      roomId = realNodeBBRoomId || channelId;

      var ts = toMs(
        get(last, [
          'timestamp',
          'message_timestamp',
          'client_msg_no_time',
          'created_at',
          'createdAt',
          'time'
        ], null) ||
        get(c, [
          'timestamp',
          'last_msg_timestamp',
          'lastMsgTimestamp',
          'updated_at',
          'updatedAt',
          'time'
        ], null),
        Date.now()
      );

      var text = payloadTextFromMessage(last);
      if (text === '[消息]') {
        text = trimPreview(get(c, ['last_text', 'lastText', 'preview', 'content'], '') || '') || '[消息]';
      }

      var unread = +get(c, ['unread', 'unread_count', 'unreadCount', 'reddot'], 0) || 0;

      var msgKey = String(
        get(last, ['message_id', 'messageId', 'client_msg_no', 'clientMsgNo', 'message_seq', 'messageSeq', 'seq', 'id'], '') ||
        get(c, ['last_message_id', 'lastMessageId', 'last_msg_id', 'lastMsgId', 'last_msg_seq', 'lastMsgSeq', 'last_seq', 'version'], '') ||
        ''
      );

      var name = String(
        get(c, [
          'roomName',
          'room_name',
          'name',
          'title',
          'channel_name',
          'channelName',
          'username',
          'displayname',
          'displayName',
          'nickname',
          'nick'
        ], '') ||
        ''
      );

      var avatar = String(
        get(c, [
          'avatar',
          'picture',
          'face',
          'channel_avatar',
          'channelAvatar'
        ], '') ||
        ''
      );

      var flag = String(
        get(c, ['language_flag', 'location', 'flag'], '') ||
        ''
      );

      var status = normalizeStatus(get(c, ['status', 'online_status', 'onlineStatus'], ''));

      var room = {
        roomId: roomId,
        room_id: roomId,
        nodebb_room_id: realNodeBBRoomId,
        nbb_room_id: realNodeBBRoomId,
        _hasNodeBBRoomId: !!realNodeBBRoomId,
        channel_id: channelId,
        channel_type: 1,
        roomName: name,
        users: channelId ? [{
          uid: channelId,
          username: name,
          displayname: name,
          picture: avatar,
          language_flag: flag,
          status: status
        }] : [],
        unread: unread,
        teaser: {
          content: text,
          timestamp: ts,
          timestampISO: new Date(ts).toISOString()
        },
        last_message: last,
        _msgKey: msgKey,
        _wk: 1,
        _raw: DEBUG_WK ? safeJsonClone(c) : null
      };

      return room;
    },

    normalizeMessage: function (detail) {
      var data = detail && detail.detail ? detail.detail : detail;

      if (!data) return null;

      if (data.message && typeof data.message === 'object') {
        data = Object.assign({}, data, data.message);
      }

      var msg = data.message || data.msg || data.data || data;

      var channelId = String(
        get(data, [
          'channel_id',
          'channelId',
          'target_uid',
          'targetUid',
          'from',
          'fromUid',
          'from_uid',
          'fromuid',
          'uid',
          'to_uid',
          'touid'
        ], '') ||
        get(msg, ['channel_id', 'channelId', 'from_uid', 'fromUid', 'fromuid', 'uid'], '') ||
        ''
      );

      var roomId = String(
        get(data, [
          'roomId',
          'room_id',
          'nodebb_room_id',
          'nbb_room_id',
          'chat_room_id',
          'chatRoomId'
        ], '') ||
        get(msg, ['roomId', 'room_id', 'nodebb_room_id', 'nbb_room_id'], '') ||
        ''
      );

      if (!roomId) {
        if (channelId && Store.uidToRoom[channelId]) roomId = Store.uidToRoom[channelId];
        else roomId = channelId;
      }

      if (!channelId) {
        if (roomId && Store.roomToUid[roomId]) channelId = Store.roomToUid[roomId];
        else channelId = roomId;
      }

      var fromUid = String(
        get(data, ['fromUid', 'from_uid', 'fromuid', 'from', 'uid'], '') ||
        get(msg, ['fromUid', 'from_uid', 'fromuid', 'uid'], '') ||
        ''
      );

      var ts = toMs(
        get(msg, ['timestamp', 'message_timestamp', 'time', 'created_at', 'createdAt'], null) ||
        get(data, ['timestamp', 'message_timestamp', 'time', 'created_at', 'createdAt'], null),
        Date.now()
      );

      var text = payloadTextFromMessage(msg);

      if (text === '[消息]') {
        text = trimPreview(
          get(data, ['text', 'content', 'message', 'body'], '') ||
          get(msg, ['text', 'content', 'message', 'body'], '') ||
          '',
          60
        ) || '[消息]';
      }

      var unread = typeof data.unread === 'number'
        ? data.unread
        : (typeof data.unread_count === 'number' ? data.unread_count : null);

      var isSelf =
        data.self === true ||
        data.self === 1 ||
        String(fromUid || '') === String(Store.uid || myUid() || '');

      return {
        roomId: roomId,
        channelId: channelId,
        fromUid: fromUid,
        text: text,
        timestamp: ts,
        unread: unread,
        self: isSelf,
        msgKey: String(
          get(msg, ['message_id', 'messageId', 'client_msg_no', 'clientMsgNo', 'message_seq', 'messageSeq', 'seq', 'id'], '') ||
          get(data, ['message_id', 'messageId', 'client_msg_no', 'clientMsgNo', 'message_seq', 'messageSeq', 'seq', 'id'], '') ||
          ''
        ),
        raw: DEBUG_WK ? safeJsonClone(detail) : null
      };
    }
  };

  var Store = {
    uid: '',
    rooms: [],
    byId: {},
    profiles: {},
    uidToRoom: {},
    roomToUid: {},
    activeRoom: '',
    activeTargetUid: '',
    meta: { pinned: {}, hidden: {}, remarks: {}, readAt: {}, readSnap: {} },
    _dirty: true,
    _filtered: null,
    _saveTimer: 0,
    _savePending: false,
    _localReadAt: {},

    init: function (uid) {
      uid = String(uid || '');

      if (this.uid === uid && this.rooms.length) return;

      this.uid = uid;
      this.rooms = [];
      this.byId = {};
      this.profiles = {};
      this.uidToRoom = {};
      this.roomToUid = {};
      this.activeRoom = '';
      this.activeTargetUid = '';
      this.meta = { pinned: {}, hidden: {}, remarks: {}, readAt: {}, readSnap: {} };
      this._dirty = true;
      this._filtered = null;
      this._localReadAt = {};

      try {
        var raw = null;
        var prefixes = ['wk19112_', 'wk19111_', 'wk19110_', 'wk19109_', 'wk19108_', 'wk19107_', 'wk19106_', 'wk19105_', 'wk19104_', 'wk19103_', 'wk19102_', 'wk19101_', 'wk19100_', 'wk1999_', 'wk1998_', 'wk1997_', 'wk1996_'];

        for (var pi = 0; pi < prefixes.length; pi++) {
          raw = localStorage.getItem(prefixes[pi] + uid);
          if (raw) break;
        }

        if (raw) {
          var d = JSON.parse(raw);
          this.rooms = d.r || [];
          this.profiles = d.p || {};
          this.uidToRoom = d.u || {};
          this.roomToUid = d.ru || {};
          this.meta = d.m || { pinned: {}, hidden: {}, remarks: {}, readAt: {} };

          if (!this.meta.pinned) this.meta.pinned = {};
          if (!this.meta.hidden) this.meta.hidden = {};
          if (!this.meta.remarks) this.meta.remarks = {};
          if (!this.meta.readAt) this.meta.readAt = {};
          if (!this.meta.readSnap) this.meta.readSnap = {};
        }
      } catch (e) {
        warn('store init', e);
      }

      this.rooms = (this.rooms || []).filter(Boolean).slice(0, MAX_CONV);
      this._rebuildIndex();
    },

    _roomKey: function (room) {
      return roomStableId(room);
    },

    _resolveKey: function (roomOrId) {
      if (!roomOrId) return '';
      return typeof roomOrId === 'object' ? this._roomKey(roomOrId) : String(roomOrId);
    },

    roomKeys: function (room) {
      var keys = [];

      function add(v) {
        v = String(v || '');
        if (v && keys.indexOf(v) === -1) keys.push(v);
      }

      if (!room) return keys;

      add(this._roomKey(room));
      add(room.roomId);
      add(room.room_id);
      add(room.channel_id);
      add(room.channelId);

      var ch = roomChannelId(room);
      add(ch);

      if (ch && this.uidToRoom[ch]) add(this.uidToRoom[ch]);

      var id = this._roomKey(room);
      if (id && this.roomToUid[id]) add(this.roomToUid[id]);

      return keys;
    },

    _getMetaKeys: function (roomOrId) {
      var keys = [];
      var self = this;

      function add(v) {
        v = String(v || '');
        if (v && keys.indexOf(v) === -1) keys.push(v);
      }

      if (roomOrId && typeof roomOrId === 'object') {
        this.roomKeys(roomOrId).forEach(add);
      } else {
        add(this._resolveKey(roomOrId));
      }

      keys.slice().forEach(function (k) {
        if (self.uidToRoom[k]) add(self.uidToRoom[k]);
        if (self.roomToUid[k]) add(self.roomToUid[k]);
      });

      return keys;
    },

    _metaGet: function (type, roomOrId) {
      var map = this.meta[type] || {};
      var keys = this._getMetaKeys(roomOrId);

      for (var i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(map, keys[i])) return map[keys[i]];
      }

      return type === 'remarks' ? '' : 0;
    },

    _metaSet: function (type, roomOrId, value) {
      var map = this.meta[type] || (this.meta[type] = {});
      var keys = this._getMetaKeys(roomOrId);
      var primary = keys[0] || '';

      if (!primary) return;

      if (value) map[primary] = value;
      else delete map[primary];

      for (var i = 1; i < keys.length; i++) delete map[keys[i]];

      this.markDirty();
      this.save();
    },

    isPinned: function (roomOrId) { return !!this._metaGet('pinned', roomOrId); },

    isHidden: function (roomOrId) {
      var hiddenAt = +this._metaGet('hidden', roomOrId) || 0;
      if (!hiddenAt) return false;

      var room = typeof roomOrId === 'object' ? roomOrId : this.byId[this._resolveKey(roomOrId)];
      if (!room) return true;

      var ts = Math.max(roomActivityTs(room), +room._lastPatchedAt || 0);
      return ts <= hiddenAt;
    },

    getHiddenAt: function (roomOrId) {
      var v = +this._metaGet('hidden', roomOrId) || 0;
      return v > 1 ? v : 0;
    },

    getRemark: function (roomOrId) {
      return String(this._metaGet('remarks', roomOrId) || '');
    },

    setPinned: function (roomOrId, flag) {
      this._metaSet('pinned', roomOrId, flag ? 1 : 0);
    },

    setHidden: function (roomOrId, flag) {
      this._metaSet('hidden', roomOrId, flag ? Date.now() : 0);
    },

    setRemark: function (roomOrId, text) {
      text = String(text || '').trim().replace(/\s+/g, ' ');
      if (text.length > 30) text = text.slice(0, 30);
      this._metaSet('remarks', roomOrId, text);
    },

    clearRemark: function (roomOrId) {
      this._metaSet('remarks', roomOrId, '');
    },

    _readSnap: function (roomOrId, ts) {
      var room = typeof roomOrId === 'object' ? roomOrId : this.byId[this._resolveKey(roomOrId)];
      var text = room && room.teaser ? trimPreview(room.teaser.content || '', 120) : '';
      var msgKey = room && room._msgKey ? String(room._msgKey) : '';

      return {
        at: Date.now(),
        ts: toMs(ts || (room ? roomActivityTs(room) : Date.now()), Date.now()),
        text: text,
        msgKey: msgKey
      };
    },

    noteLocalRead: function (roomOrId, ts) {
      var keys = this._getMetaKeys(roomOrId);
      var id = this._resolveKey(roomOrId);

      if (!keys.length && id) keys = [id];
      if (!keys.length) return 0;

      var v = toMs(ts || Date.now());
      var snap = this._readSnap(roomOrId, v);

      this.meta.readAt = this.meta.readAt || {};
      this.meta.readSnap = this.meta.readSnap || {};

      for (var i = 0; i < keys.length; i++) {
        this._localReadAt[keys[i]] = v;
        if ((+this.meta.readAt[keys[i]] || 0) < v) this.meta.readAt[keys[i]] = v;
        this.meta.readSnap[keys[i]] = snap;
      }

      return v;
    },

    getReadAt: function (roomOrId) {
      var keys = this._getMetaKeys(roomOrId);
      var map = this.meta.readAt || {};
      var out = 0;

      for (var i = 0; i < keys.length; i++) {
        var v = +map[keys[i]] || 0;
        if (v > out) out = v;

        v = +this._localReadAt[keys[i]] || 0;
        if (v > out) out = v;
      }

      return out;
    },

    isLocallyRead: function (roomOrId) {
      var room = typeof roomOrId === 'object' ? roomOrId : this.byId[this._resolveKey(roomOrId)];
      if (!room) return false;

      var ts = roomActivityTs(room);
      var readAt = this.getReadAt(room);
      var keys = this._getMetaKeys(room);
      var map = this.meta.readSnap || {};
      var text = trimPreview(room.teaser && room.teaser.content || '', 120);
      var msgKey = room._msgKey ? String(room._msgKey) : '';
      var now = Date.now();
      var sawSnap = false;

      // 19.10.11：不要只因为 readAt 比服务端 timestamp 新就误判已读。
      // 手机端/服务端时间可能有偏差；如果快照里的 msgKey 或预览文本已经变化，必须视为新消息。
      for (var i = 0; i < keys.length; i++) {
        var snap = map[keys[i]];
        if (!snap) continue;
        sawSnap = true;

        if (msgKey && snap.msgKey && msgKey !== String(snap.msgKey)) return false;
        if (text && snap.text && text !== String(snap.text)) return false;

        if (msgKey && snap.msgKey && msgKey === String(snap.msgKey)) return true;

        if (text && snap.text && text === String(snap.text)) {
          var snapTs = +snap.ts || 0;
          var snapAt = +snap.at || 0;

          if (snapTs && ts && Math.abs(ts - snapTs) <= 3000) return true;
          if (snapAt && now - snapAt < 120000) return true;
        }
      }

      if (readAt && ts && ts <= readAt) return !sawSnap;

      return false;
    },

    _rebuildIndex: function () {
      this.byId = {};
      var now = Date.now();

      for (var i = 0; i < this.rooms.length; i++) {
        var r = this.rooms[i];

        if (!r) continue;

        var id = this._roomKey(r);
        var ch = roomChannelId(r);

        if (id) this.byId[id] = r;
        if (ch) this.byId[ch] = r;

        var realNbbId = nodebbRoomId(r);

        if (realNbbId && ch) {
          this.uidToRoom[ch] = realNbbId;
          this.roomToUid[realNbbId] = ch;
        }

        if (Array.isArray(r.users)) {
          for (var j = 0; j < r.users.length; j++) {
            var u = r.users[j] || {};
            var uid = String(u.uid || '');

            if (!uid || uid === this.uid) continue;

            var prof = {
              uid: uid,
              username: u.displayname || u.username || r.roomName || '',
              picture: u.picture || '',
              flag: u.language_flag || u.location || '',
              status: normalizeStatus(u.status),
              _ts: now
            };

            if (!this.profiles[uid] || now - (this.profiles[uid]._ts || 0) > PROFILE_TTL) {
              this.profiles[uid] = prof;
            }
          }
        }
      }

      this.markDirty();
    },

    replaceRooms: function (rooms) {
      var prevOrder = {};

      this.rooms.forEach(function (r, idx) {
        var id = roomStableId(r);
        if (id) prevOrder[id] = idx;
      });

      var oldById = this.byId || {};
      var out = [];
      var seen = {};

      rooms.forEach(function (incoming) {
        if (!incoming) return;

        var id = roomStableId(incoming);
        if (!id) return;

        var old = oldById[id] || oldById[roomChannelId(incoming)] || null;

        if (old) {
          var oldTs = roomActivityTs(old);
          var newTs = roomActivityTs(incoming);
          var oldKey = old._msgKey ? String(old._msgKey) : '';
          var newKey = incoming._msgKey ? String(incoming._msgKey) : '';
          var incomingText = incoming.teaser && incoming.teaser.content ? String(incoming.teaser.content) : '';

          // 轮询结果是权威数据。只有在“同一条消息/无有效预览、并且本地事件明显更新”时，才保留本地 patch。
          // 旧版这里只判断 oldTs >= newTs，容易把新同步回来的 teaser 覆盖成旧消息。
          if (
            old._lastPatchedAt && old.teaser &&
            oldTs > newTs &&
            (!newKey || !oldKey || newKey === oldKey) &&
            (!incomingText || incomingText === '[消息]')
          ) {
            incoming.teaser = old.teaser;
            incoming._lastPatchedAt = old._lastPatchedAt;
          } else {
            incoming._lastPatchedAt = 0;
          }

          if (!incoming.roomName && old.roomName) incoming.roomName = old.roomName;
          if ((!incoming.users || !incoming.users.length) && old.users) incoming.users = old.users;
          if (!incoming.nodebb_room_id && old.nodebb_room_id) incoming.nodebb_room_id = old.nodebb_room_id;
          if (!incoming.nbb_room_id && old.nbb_room_id) incoming.nbb_room_id = old.nbb_room_id;
          if (old._hasNodeBBRoomId && !incoming._hasNodeBBRoomId) incoming._hasNodeBBRoomId = true;
        }

        if (Store.isLocallyRead(incoming)) incoming.unread = 0;

        Store.roomKeys(incoming).forEach(function (k) { seen[k] = 1; });
        seen[id] = 1;
        out.push(incoming);
      });

      this.rooms.forEach(function (r) {
        var id = roomStableId(r);
        if (!id || seen[id]) return;

        if (r._lastPatchedAt && Date.now() - r._lastPatchedAt < 20000) out.push(r);
      });

      sortRoomsStable(out, prevOrder);

      this.rooms = out.slice(0, MAX_CONV);
      this._rebuildIndex();
      this.save();
    },

    patchMessage: function (meta, source) {
      if (!meta) return false;

      var roomId = String(meta.roomId || '');
      var channelId = String(meta.channelId || '');

      if (!roomId && channelId && this.uidToRoom[channelId]) roomId = this.uidToRoom[channelId];
      if (!channelId && roomId && this.roomToUid[roomId]) channelId = this.roomToUid[roomId];

      var room =
        (roomId && this.byId[roomId]) ||
        (channelId && this.byId[channelId]) ||
        null;

      if (!room) {
        if (!roomId && !channelId) return false;

        room = {
          roomId: roomId || channelId,
          room_id: roomId || channelId,
          channel_id: channelId || roomId,
          channel_type: 1,
          roomName: '',
          users: (channelId || meta.fromUid) ? [{ uid: channelId || meta.fromUid }] : [],
          unread: 0,
          teaser: {
            content: meta.text || '[消息]',
            timestamp: meta.timestamp || Date.now(),
            timestampISO: new Date(meta.timestamp || Date.now()).toISOString()
          },
          _wk: 1,
          _stub: 1
        };

        this.rooms.unshift(room);
      }

      roomId = String(room.roomId || room.room_id || roomId || '');
      channelId = String(room.channel_id || channelId || '');

      if (roomId && channelId) {
        this.uidToRoom[channelId] = roomId;
        this.roomToUid[roomId] = channelId;
      }

      if (!room.teaser) room.teaser = {};

      room.teaser.content = meta.text || room.teaser.content || '[消息]';
      room.teaser.timestamp = meta.timestamp || Date.now();
      room.teaser.timestampISO = new Date(room.teaser.timestamp).toISOString();
      if (meta.msgKey) room._msgKey = String(meta.msgKey);
      room._lastPatchedAt = Date.now();
      room._stub = 0;

      var active = this.isRoomActive(room);
      if (this.isLocallyRead(room)) {
        room.unread = 0;
      } else if (typeof meta.unread === 'number' && meta.unread >= 0) {
        room.unread = meta.unread;
      } else if (!meta.self && !active) {
        room.unread = Math.max(1, (room.unread || 0) + 1);
      } else if (active) {
        room.unread = 0;
        this.noteLocalRead(room, Date.now());
      }

      if (this.isHidden(room)) {
        var hiddenAt = this.getHiddenAt(room);
        if ((room.teaser.timestamp || Date.now()) > hiddenAt) this.setHidden(room, false);
      }

      var idx = this.rooms.indexOf(room);
      if (idx > -1) this.rooms.splice(idx, 1);

      this.rooms.unshift(room);
      sortRoomsStable(this.rooms, {});
      if (this.rooms.length > MAX_CONV) this.rooms.length = MAX_CONV;

      this._rebuildIndex();
      ProfileHydrator.schedule(this.rooms, 120);
      this.save();

      log('patch message', source || '', roomId, channelId, meta.text);

      return true;
    },

    isRoomActive: function (room) {
      var activeRoom = String(this.activeRoom || '');
      var activeTarget = String(this.activeTargetUid || '');
      var keys = this.roomKeys(room);

      for (var i = 0; i < keys.length; i++) {
        if (keys[i] === activeRoom || keys[i] === activeTarget) return true;
      }

      return false;
    },

    getFiltered: function () {
      if (!this._dirty && this._filtered) return this._filtered;

      var pins = [];
      var rest = [];

      for (var i = 0; i < this.rooms.length; i++) {
        var room = this.rooms[i];

        if (!room) continue;

        var active = this.isRoomActive(room);

        if (this.isHidden(room) && !active) continue;

        if (this.isPinned(room)) pins.push(room);
        else rest.push(room);
      }

      this._filtered = pins.concat(rest);
      this._dirty = false;

      return this._filtered;
    },

    markDirty: function () {
      this._dirty = true;
      this._filtered = null;
    },

    save: function () {
      this._savePending = true;

      if (this._saveTimer) return;

      var self = this;

      this._saveTimer = setTimeout(function () {
        self._saveTimer = 0;

        if (!self._savePending) return;

        self._savePending = false;
        self._doSave();
      }, SAVE_THROTTLE_MS);
    },

    saveNow: function () {
      if (this._saveTimer) {
        clearTimeout(this._saveTimer);
        this._saveTimer = 0;
      }

      this._savePending = false;
      this._doSave();
    },

    _doSave: function () {
      try {
        var rooms = this.rooms.slice(0, MAX_CONV).map(function (r) {
          return {
            roomId: r.roomId || r.room_id || '',
            room_id: r.room_id || r.roomId || '',
            channel_id: r.channel_id || r.channelId || '',
            channel_type: r.channel_type || 1,
            roomName: r.roomName || '',
            users: Array.isArray(r.users) ? r.users.slice(0, 4).map(function (u) {
              return {
                uid: u.uid,
                username: u.username,
                displayname: u.displayname,
                userslug: u.userslug,
                picture: u.picture,
                language_flag: u.language_flag,
                location: u.location,
                status: u.status
              };
            }) : [],
            unread: r.unread || 0,
            teaser: r.teaser ? {
              content: r.teaser.content || '',
              timestamp: toMs(r.teaser.timestamp || r.teaser.timestampISO || 0, 0),
              timestampISO: r.teaser.timestampISO || ''
            } : null,
            nodebb_room_id: r.nodebb_room_id || r.nbb_room_id || '',
            nbb_room_id: r.nbb_room_id || r.nodebb_room_id || '',
            _hasNodeBBRoomId: !!r._hasNodeBBRoomId,
            _lastPatchedAt: r._lastPatchedAt || 0,
            _msgKey: r._msgKey || '',
            _stub: r._stub ? 1 : 0,
            _wk: 1
          };
        });

        localStorage.setItem('wk19112_' + this.uid, JSON.stringify({
          r: rooms,
          p: this.profiles,
          u: this.uidToRoom,
          ru: this.roomToUid,
          m: this.meta
        }));
      } catch (e) {
        warn('save', e);
      }
    },

    baseName: function (room) {
      if (!room) return '聊天';

      var ch = roomChannelId(room);
      var prof = ch ? this.profiles[ch] : null;

      // 悟空 conversation/sync 常常只给 channel_id，旧版会先显示“用户 6”。
      // 优先用 NodeBB 用户资料补齐昵称；只有资料不存在时才显示兜底名。
      if (prof && prof.username && !isGenericUserLabel(prof.username, ch)) return prof.username;

      if (room.roomName && !isGenericUserLabel(room.roomName, ch)) return room.roomName;

      if (room.users && room.users.length) {
        for (var i = 0; i < room.users.length; i++) {
          var u = room.users[i] || {};
          if (String(u.uid || '') !== String(this.uid || '')) {
            var uname = u.displayname || u.username || '';
            if (uname && !isGenericUserLabel(uname, u.uid || ch)) return uname;
            if (prof && prof.username) return prof.username;
            return '用户 ' + (u.uid || ch || '');
          }
        }
      }

      return ch ? ('用户 ' + ch) : '聊天';
    },

    displayName: function (room) {
      return this.getRemark(room) || this.baseName(room);
    },

    getOtherUser: function (room) {
      if (!room || !room.users || !room.users.length) return null;

      for (var i = 0; i < room.users.length; i++) {
        if (String(room.users[i].uid || '') !== String(this.uid || '')) return room.users[i];
      }

      return room.users[0];
    }
  };


  var ProfileHydrator = {
    inflight: {},
    failedAt: {},
    timer: 0,

    schedule: function (rooms, delay) {
      if (!rooms || !rooms.length) return;

      var self = this;

      if (this.timer) clearTimeout(this.timer);

      this.timer = setTimeout(function () {
        self.timer = 0;
        self.fetchForRooms(rooms || Store.rooms || []);
      }, typeof delay === 'number' ? delay : 80);
    },

    collectKeys: function (rooms) {
      var keys = [];
      var seen = {};
      var selfUid = String(Store.uid || myUid() || '');

      function add(v) {
        v = String(v || '').trim();
        if (!v || v === selfUid || seen[v]) return;
        seen[v] = 1;
        keys.push(v);
      }

      (rooms || []).forEach(function (r) {
        if (!r) return;

        add(roomChannelId(r));

        if (Array.isArray(r.users)) {
          r.users.forEach(function (u) {
            if (!u) return;
            add(u.uid);
            if (u.userslug) add(u.userslug);
            if (u.username && !isGenericUserLabel(u.username, u.uid)) add(u.username);
          });
        }
      });

      return keys;
    },

    needsFetch: function (key) {
      key = String(key || '').trim();
      if (!key) return false;
      if (this.inflight[key]) return false;

      var now = Date.now();
      if (this.failedAt[key] && now - this.failedAt[key] < 5 * 60000) return false;

      var p = Store.profiles[key];
      if (!p) return true;

      // _nodebbTs 表示已经从 NodeBB 用户接口补过资料。头像/国旗本来可能为空，所以不能无限请求。
      if (p._nodebbTs && now - p._nodebbTs < PROFILE_TTL) return false;

      if (!p.username || isGenericUserLabel(p.username, key)) return true;
      if (!p.picture && !p.flag && !p.status) return true;
      if (now - (p._ts || 0) > PROFILE_TTL) return true;

      return false;
    },

    fetchForRooms: function (rooms) {
      var self = this;
      var keys = this.collectKeys(rooms).filter(function (k) { return self.needsFetch(k); }).slice(0, PROFILE_BATCH);

      if (!keys.length) return;

      var pending = keys.length;
      var changed = false;

      function done(ok) {
        if (ok) changed = true;
        pending--;

        if (pending <= 0 && changed) {
          Store.markDirty();
          Store.save();
          VList.scheduleRefresh();
          Ctrl.healthKick('profiles');

          setTimeout(function () {
            if (Ctrl.mounted && isChats(location.pathname)) self.fetchForRooms(Store.rooms || []);
          }, 250);
        }
      }

      keys.forEach(function (key) {
        self.fetchOne(key).then(function (ok) { done(ok); }, function () { done(false); });
      });
    },

    fetchOne: function (key) {
      var self = this;
      key = String(key || '').trim();

      if (!key) return Promise.resolve(false);

      this.inflight[key] = true;

      return fetch(userApiUrl(key), {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (raw) {
        var u = extractUserPayload(raw);

        if (!u || !(u.uid || u.username || u.displayname)) {
          self.failedAt[key] = Date.now();
          return false;
        }

        self.apply(key, u);
        return true;
      }).catch(function (err) {
        self.failedAt[key] = Date.now();
        warn('profile hydrate failed', key, err && err.message ? err.message : err);
        return false;
      }).then(function (ok) {
        delete self.inflight[key];
        return ok;
      });
    },

    apply: function (key, u) {
      var now = Date.now();
      var uid = String(u.uid || key || '');
      var username = String(u.displayname || u.username || u.userslug || uid || '').trim();

      var prof = {
        uid: uid,
        username: username,
        userslug: u.userslug || '',
        picture: u.picture || u.uploadedpicture || '',
        flag: u.language_flag || u.location || '',
        status: normalizeStatus(u.status),
        _ts: now,
        _nodebbTs: now
      };

      [key, uid, u.username, u.userslug].forEach(function (k) {
        k = String(k || '').trim();
        if (k) Store.profiles[k] = prof;
      });

      var aliases = {};
      [key, uid, u.username, u.userslug].forEach(function (k) {
        k = String(k || '').trim();
        if (k) aliases[k] = 1;
      });

      (Store.rooms || []).forEach(function (r) {
        if (!r) return;

        var ch = roomChannelId(r);
        var matched = ch && aliases[ch];

        if (!matched && Array.isArray(r.users)) {
          for (var i = 0; i < r.users.length; i++) {
            var ru = r.users[i] || {};
            if (aliases[String(ru.uid || '')] || aliases[String(ru.username || '')] || aliases[String(ru.userslug || '')]) {
              matched = true;
              break;
            }
          }
        }

        if (!matched) return;

        if (!Array.isArray(r.users) || !r.users.length) r.users = [{}];

        var target = null;

        for (var j = 0; j < r.users.length; j++) {
          var item = r.users[j] || {};
          if (String(item.uid || '') !== String(Store.uid || '')) {
            target = item;
            r.users[j] = target;
            break;
          }
        }

        if (!target) {
          target = {};
          r.users.push(target);
        }

        target.uid = uid;
        target.username = u.username || username;
        target.displayname = username;
        target.userslug = u.userslug || target.userslug || '';
        target.picture = prof.picture;
        target.language_flag = u.language_flag || '';
        target.location = u.location || '';
        target.status = u.status || prof.status;

        if (!r.channel_id || aliases[String(r.channel_id)]) r.channel_id = uid;
        if (!r.roomName || isGenericUserLabel(r.roomName, ch)) r.roomName = '';
      });
    }
  };

  var Menu = {
    mask: null,
    head: null,
    list: null,
    active: null,

    ensure: function () {
      if (this.mask && this.mask.isConnected) return;

      var mask = D.createElement('div');
      mask.className = 'wk-mm';
      mask.innerHTML = '<div class="wk-ms"><div class="wk-mh"></div><div class="wk-ml"></div></div>';

      D.body.appendChild(mask);

      this.mask = mask;
      this.head = mask.querySelector('.wk-mh');
      this.list = mask.querySelector('.wk-ml');

      var self = this;

      mask.addEventListener('click', function (e) {
        if (e.target === mask) self.close();
      });

      mask.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      mask.addEventListener('selectstart', function (e) { e.preventDefault(); }, true);
    },

    btn: function (text, cls, fn) {
      var b = D.createElement('button');
      b.type = 'button';
      b.className = 'wk-ma' + (cls ? ' ' + cls : '');
      b.textContent = text;
      b.addEventListener('click', fn);
      return b;
    },

    open: function (room) {
      if (!room) return;

      this.ensure();
      this.active = room;

      var pinned = Store.isPinned(room);
      var hidden = Store.isHidden(room);
      var remark = Store.getRemark(room);
      var self = this;

      this.head.textContent = Store.displayName(room);
      this.list.innerHTML = '';

      this.list.appendChild(this.btn(pinned ? '取消置顶' : '置顶会话', '', function () {
        Store.setPinned(room, !pinned);
        VList.scheduleRefresh();
        self.close();
      }));

      this.list.appendChild(this.btn(remark ? '修改备注' : '添加备注', '', function () {
        self.close();

        setTimeout(function () {
          var val = W.prompt('请输入备注（留空清除）', remark || '');
          if (val === null) return;

          val = String(val || '').trim();

          if (val) Store.setRemark(room, val);
          else Store.clearRemark(room);

          VList.scheduleRefresh();
        }, 30);
      }));

      if (remark) {
        this.list.appendChild(this.btn('清除备注', '', function () {
          Store.clearRemark(room);
          VList.scheduleRefresh();
          self.close();
        }));
      }

      this.list.appendChild(this.btn(hidden ? '恢复会话' : '删除会话', hidden ? '' : 'wk-danger', function () {
        Store.setHidden(room, !hidden);
        VList.scheduleRefresh();
        self.close();
      }));

      this.list.appendChild(this.btn('取消', 'wk-cancel', function () {
        self.close();
      }));

      this.mask.style.display = 'flex';

      requestAnimationFrame(function () {
        self.mask.setAttribute('data-v', '1');
      });
    },

    close: function () {
      if (!this.mask) return;

      var m = this.mask;

      m.removeAttribute('data-v');

      setTimeout(function () {
        if (m && m.isConnected) m.style.display = 'none';
      }, 200);

      this.active = null;
    }
  };

  function walkMessageLike(input, cb, depth, seen) {
    depth = depth || 0;
    if (depth > 5 || input == null) return;

    seen = seen || [];

    if (typeof input === 'string') {
      var s = input.trim();
      if (!s) return;
      if (s.charAt(0) === '{' || s.charAt(0) === '[') {
        var parsed = tryParseJson(s);
        if (parsed != null) walkMessageLike(parsed, cb, depth + 1, seen);
      }
      return;
    }

    if (typeof input !== 'object') return;

    for (var si = 0; si < seen.length; si++) {
      if (seen[si] === input) return;
    }
    seen.push(input);

    if (Array.isArray(input)) {
      for (var ai = 0; ai < input.length; ai++) walkMessageLike(input[ai], cb, depth + 1, seen);
      return;
    }

    var hasPeer = !!get(input, [
      'channel_id', 'channelId', 'target_uid', 'targetUid',
      'from_uid', 'fromUid', 'fromuid', 'to_uid', 'toUid', 'touid',
      'roomId', 'room_id', 'uid'
    ], '');

    var hasPayload =
      input.payload != null || input.payload_decoded != null || input.decoded_payload != null ||
      input.message_payload != null || input.messagePayload != null ||
      input.messageContent != null || input.message_content != null ||
      input.content != null || input.text != null || input.body != null || input.msg != null ||
      (input.message && typeof input.message === 'object');

    if (hasPeer && hasPayload) cb(input);

    var nestedKeys = [
      'message', 'msg', 'data', 'payload', 'content', 'body', 'result', 'response',
      'messages', 'message_list', 'messageList', 'recents', 'events'
    ];

    for (var i = 0; i < nestedKeys.length; i++) {
      if (input[nestedKeys[i]] != null) walkMessageLike(input[nestedKeys[i]], cb, depth + 1, seen);
    }
  }

  function patchRealtimePayload(payload, source) {
    var patched = false;
    var seenKeys = {};

    walkMessageLike(payload, function (obj) {
      var meta = WKAdapter.normalizeMessage(obj);
      if (!meta || (!meta.roomId && !meta.channelId)) return;

      var key = [meta.roomId || '', meta.channelId || '', meta.msgKey || '', meta.timestamp || '', meta.text || ''].join('|');
      if (seenKeys[key]) return;
      seenKeys[key] = 1;

      if (Store.patchMessage(meta, source || 'realtime')) patched = true;
    });

    if (patched) {
      Store.markDirty();
      VList.scheduleRefresh();
      Ctrl.healthKick(source || 'realtime');
      ProfileHydrator.schedule(Store.rooms, 120);
    }

    return patched;
  }


  function getSdkShared() {
    var wk = W.wk || W.WKSDK || W.WKIM || null;

    try {
      if (W.wk && W.wk.WKSDK && typeof W.wk.WKSDK.shared === 'function') return W.wk.WKSDK.shared();
      if (W.WKSDK && typeof W.WKSDK.shared === 'function') return W.WKSDK.shared();
      if (wk && wk.WKSDK && typeof wk.WKSDK.shared === 'function') return wk.WKSDK.shared();
    } catch (e) {}

    return null;
  }

  function sdkChannelId(m) {
    if (!m) return '';

    var ch = m.channel || m.channelInfo || m.channel_id || m.channelId || m.channelID || null;

    if (typeof ch === 'string' || typeof ch === 'number') return String(ch);

    if (ch && typeof ch === 'object') {
      return String(
        ch.channelID || ch.channelId || ch.channel_id || ch.id || ch.uid || ''
      );
    }

    return String(get(m, ['channelID', 'channelId', 'channel_id', 'targetUID', 'targetUid', 'target_uid', 'toUID', 'toUid', 'to_uid', 'touid'], '') || '');
  }

  function sdkMessageToRealtimePayload(m) {
    m = m || {};

    var selfUid = String(Store.uid || myUid() || '');
    var fromUid = String(get(m, ['fromUID', 'fromUid', 'from_uid', 'fromuid', 'from', 'uid'], '') || '');
    var toUid = String(get(m, ['toUID', 'toUid', 'to_uid', 'touid', 'targetUID', 'targetUid', 'target_uid'], '') || '');
    var channelId = sdkChannelId(m);
    var isSelf = !!(fromUid && selfUid && fromUid === selfUid);

    if (!channelId || (selfUid && channelId === selfUid)) {
      channelId = isSelf ? toUid : fromUid;
    }

    if (!channelId && fromUid && fromUid !== selfUid) channelId = fromUid;
    if (!channelId && toUid && toUid !== selfUid) channelId = toUid;

    var payload =
      m.payload != null ? m.payload :
      m.messagePayload != null ? m.messagePayload :
      m.message_payload != null ? m.message_payload :
      m.content != null ? m.content :
      m.messageContent != null ? m.messageContent :
      m.message_content != null ? m.message_content :
      m.body != null ? m.body :
      null;

    return {
      channel_id: channelId,
      channelId: channelId,
      from_uid: fromUid,
      fromUid: fromUid,
      to_uid: toUid,
      toUid: toUid,
      uid: channelId,
      payload: payload,
      content: payload,
      message: m,
      timestamp: get(m, ['timestamp', 'message_timestamp', 'time', 'created_at', 'createdAt'], null) || Date.now(),
      message_seq: get(m, ['messageSeq', 'message_seq', 'seq'], ''),
      message_id: get(m, ['messageID', 'messageId', 'message_id', 'id'], ''),
      client_msg_no: get(m, ['clientMsgNo', 'client_msg_no'], ''),
      self: isSelf
    };
  }

  var WukongRealtime = {
    _started: false,
    _loading: false,
    _listenerBound: false,
    _statusBound: false,
    _connected: false,
    _lastMessageAt: 0,
    _lastError: '',
    _scriptPromise: null,
    _tokenPromise: null,

    isHealthy: function () {
      return !!(SDK_REALTIME && this._connected);
    },

    start: function () {
      if (!SDK_REALTIME) return;
      if (this._loading) return;

      var self = this;
      this._loading = true;

      this.ensure().then(function () {
        self._loading = false;
      }).catch(function (err) {
        self._loading = false;
        self._lastError = err && err.message ? err.message : String(err || 'sdk_realtime_failed');
        warn('sdk realtime failed', self._lastError);
      });
    },

    ensure: function () {
      var self = this;

      return this.ensureToken().then(function () {
        return self.ensureSdk();
      }).then(function () {
        return self.bindSdk();
      });
    },

    ensureToken: function () {
      if (this._tokenPromise) return this._tokenPromise;

      this._tokenPromise = WKAdapter.ensureToken().then(function (data) {
        if (data && data.uid) Store.uid = String(data.uid);
        return data;
      }).then(function (data) {
        WukongRealtime._tokenPromise = null;
        return data;
      }, function (err) {
        WukongRealtime._tokenPromise = null;
        throw err;
      });

      return this._tokenPromise;
    },

    ensureSdk: function () {
      if (getSdkShared()) return Promise.resolve(true);
      if (this._scriptPromise) return this._scriptPromise;

      this._scriptPromise = new Promise(function (resolve, reject) {
        var existing = D.getElementById('wkchat-wukong-sdk');

        if (existing) {
          existing.addEventListener('load', function () { resolve(true); }, { once: true });
          existing.addEventListener('error', function () { reject(new Error('wk_sdk_load_failed')); }, { once: true });
          setTimeout(function () {
            if (getSdkShared()) resolve(true);
            else reject(new Error('wk_sdk_existing_not_ready'));
          }, 1200);
          return;
        }

        var s = D.createElement('script');
        s.id = 'wkchat-wukong-sdk';
        s.async = true;
        s.src = SDK_URL;
        s.onload = function () { resolve(true); };
        s.onerror = function () { reject(new Error('wk_sdk_load_failed')); };
        (D.head || D.documentElement).appendChild(s);
      }).then(function (v) {
        WukongRealtime._scriptPromise = null;
        return v;
      }, function (err) {
        WukongRealtime._scriptPromise = null;
        throw err;
      });

      return this._scriptPromise;
    },

    bindSdk: function () {
      var sdk = getSdkShared();
      var token = WKAdapter.token || '';
      var uid = String(WKAdapter.uid || Store.uid || myUid() || '');

      if (!sdk || !sdk.config || !uid || !token) throw new Error('wk_sdk_not_ready');

      sdk.config.uid = uid;
      sdk.config.token = String(token);
      sdk.config.addr = WKWS_ADDR || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + WKWS_PATH);

      var self = this;

      if (!this._listenerBound && sdk.chatManager && typeof sdk.chatManager.addMessageListener === 'function') {
        this._listenerBound = true;

        sdk.chatManager.addMessageListener(function (m) {
          self._lastMessageAt = Date.now();

          var payload = sdkMessageToRealtimePayload(m);

          if (!Ctrl.mounted || !isChats(location.pathname)) {
            if (isChatDetail(location.pathname)) Net._needReturnSync = true;
            return;
          }

          if (!patchRealtimePayload(payload, 'wk-sdk')) {
            Net.scheduleSync('wk-sdk:fallback', 250);
          }
        });
      }

      if (!this._statusBound && sdk.connectManager && typeof sdk.connectManager.addConnectStatusListener === 'function') {
        this._statusBound = true;
        sdk.connectManager.addConnectStatusListener(function (status) {
          var st = String(status && (status.status || status.value || status) || '').toLowerCase();
          var connected = status === 1 || status === '1' || st === 'connected' || st === 'connect' || st === 'success' || st === 'online';
          self._connected = !!connected;
          if (connected && Ctrl.mounted && isChats(location.pathname)) Net.scheduleSync('wk-sdk:connected', 500);
        });
      }

      if (sdk.connectManager && typeof sdk.connectManager.connect === 'function') {
        try { sdk.connectManager.connect(); } catch (e) {}
      }

      this._started = true;
      return true;
    }
  };

  var Net = {
    _syncing: false,
    _syncTimer: 0,
    _pollTimer: 0,
    _lastSyncTs: 0,
    _lastOkTs: 0,
    _listening: false,
    _eventHandlers: [],
    _wsInstalled: false,
    _nativeWS: null,
    _syncAgain: '',
    _needReturnSync: false,
    _syncSerial: 0,

    start: function () {
      this.bindWukongEvents();
      WukongRealtime.start();
      if (REALTIME_WS_TAP) this.installWkwsTap();
      this._lastOkTs = 0;
      this.scheduleSync(this._needReturnSync ? 'return-dirty' : 'start', 0);
      this._needReturnSync = false;
      this.startPoll();
    },

    stop: function () {
      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
        this._syncTimer = 0;
      }

      if (this._pollTimer) {
        clearTimeout(this._pollTimer);
        this._pollTimer = 0;
      }

      this._eventHandlers.forEach(function (h) {
        try { W.removeEventListener(h.name, h.fn); } catch (e) {}
      });

      this._eventHandlers = [];
      this._listening = false;
      this._syncing = false;
      this._syncAgain = '';
      this._syncSerial++;
    },

    sync: function (reason) {
      if (this._syncing) {
        this._syncAgain = reason || 'queued';
        return;
      }

      this._syncing = true;

      var self = this;
      var serial = ++this._syncSerial;

      log('sync start', reason || '');

      WKAdapter.fetchConversations().then(function (rooms) {
        // 如果这次请求是在离开列表页前发出的，返回时可能已经过期；丢弃，避免旧响应覆盖新列表。
        if (serial !== self._syncSerial) return;

        Store.replaceRooms(rooms);
        ProfileHydrator.schedule(Store.rooms, 80);
        self._lastOkTs = Date.now();

        if (Ctrl.mounted && isChats(location.pathname)) {
          Ctrl.setError(false);
          Ctrl.setLoading(false);
          VList.scheduleRefresh();
          Ctrl.healthKick('sync:' + (reason || ''));
        }
      }).catch(function (err) {
        if (serial !== self._syncSerial) return;
        warn('sync failed', reason || '', err && err.message ? err.message : err);

        if (Ctrl.mounted && isChats(location.pathname) && Store.getFiltered().length === 0) {
          Ctrl.setError(true, '加载失败，请重试');
        }
      }).then(function () {
        if (serial !== self._syncSerial) return;

        var again = self._syncAgain;
        self._syncAgain = '';
        self._syncing = false;
        self._lastSyncTs = Date.now();

        if (again && Ctrl.mounted && isChats(location.pathname)) {
          self.scheduleSync('queued:' + again, 80);
        }
      });
    },

    scheduleSync: function (reason, delay) {
      var now = Date.now();
      var gap = now - (this._lastSyncTs || 0);

      if (delay == null) {
        delay = gap >= SYNC_MIN_GAP_MS ? 0 : SYNC_TRAILING_MS;
      }

      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
        this._syncTimer = 0;
      }

      var self = this;

      this._syncTimer = setTimeout(function () {
        self._syncTimer = 0;
        self.sync(reason || 'scheduled');
      }, delay);
    },

    startPoll: function () {
      if (this._pollTimer) clearTimeout(this._pollTimer);

      var self = this;

      function loop() {
        if (!Ctrl.mounted || !isChats(location.pathname)) {
          self._pollTimer = setTimeout(loop, 1000);
          return;
        }

        var realtimeHealthy = WukongRealtime.isHealthy();
        var healthy = realtimeHealthy || (Date.now() - (self._lastOkTs || 0) < (POLL_UNHEALTHY_MS * 2));
        var wait = realtimeHealthy ? POLL_HEALTHY_MS : (healthy ? POLL_UNHEALTHY_MS : Math.max(4000, Math.floor(POLL_UNHEALTHY_MS / 2)));

        if (!D.hidden) self.scheduleSync(realtimeHealthy ? 'poll-verify' : 'poll-fallback', 0);

        self._pollTimer = setTimeout(loop, wait);
      }

      this._pollTimer = setTimeout(loop, 1200);
    },

    bindWukongEvents: function () {
      if (!REALTIME_EVENTS || this._listening) return;

      this._listening = true;

      var self = this;
      var names = [
        'wk:message', 'wk-message', 'wk.message', 'wk:new_message', 'wk:newMessage',
        'wukong:message', 'wukong-message', 'wukong.message',
        'wkim:message', 'im:message', 'messageReceived', 'newMessage'
      ];

      names.forEach(function (name) {
        var fn = function (ev) {
          self.handleWukongEvent(ev && ev.detail != null ? ev.detail : ev, 'event:' + name);
        };

        W.addEventListener(name, fn);
        self._eventHandlers.push({ name: name, fn: fn });
      });

      // 尝试绑定常见 emitter，不依赖具体 SDK 名称，失败会静默回退到轮询。
      setTimeout(function () {
        var globals = [W.WKSDK, W.WKIM, W.wk, W.wkim, W.wkSDK, W.WKChatSDK];
        var eventNames = ['message', 'newMessage', 'messageReceived', 'recv', 'conversation.update', 'conversationUpdated'];

        globals.forEach(function (g, gi) {
          var obj = g && (g.shared || g.default || g.instance || g);
          if (!obj || obj.__wkChatBound) return;

          var on = typeof obj.on === 'function' ? obj.on : (typeof obj.addListener === 'function' ? obj.addListener : null);
          if (!on) return;

          obj.__wkChatBound = true;
          eventNames.forEach(function (evName) {
            try {
              on.call(obj, evName, function (payload) {
                self.handleWukongEvent(payload, 'emitter:' + gi + ':' + evName);
              });
            } catch (e) {}
          });
        });
      }, 300);
    },

    handleWukongEvent: function (detail, source) {
      if (!Ctrl.mounted || !isChats(location.pathname)) {
        if (isChatDetail(location.pathname)) this._needReturnSync = true;
        return;
      }

      if (!patchRealtimePayload(detail, source || 'event')) {
        this.scheduleSync((source || 'event') + ':fallback', 300);
      }
    },

    installWkwsTap: function () {
      if (!REALTIME_WS_TAP || this._wsInstalled || !W.WebSocket) return;
      if (W.WebSocket.__wkChatTapped) {
        this._wsInstalled = true;
        return;
      }

      var NativeWS = W.WebSocket;
      var self = this;

      function bind(ws, url) {
        if (!ws || ws.__wkChatTapBound) return ws;
        ws.__wkChatTapBound = true;

        try {
          ws.addEventListener('message', function (ev) {
            if (!Ctrl.mounted || !isChats(location.pathname)) {
              if (isChatDetail(location.pathname)) self._needReturnSync = true;
              return;
            }

            var data = ev && ev.data;
            var patched = false;

            if (typeof data === 'string') {
              patched = patchRealtimePayload(data, 'ws');
              if (!patched && /channel[_-]?id|message[_-]?seq|client[_-]?msg|payload|from[_-]?uid|to[_-]?uid/i.test(data)) {
                self.scheduleSync('ws:fallback', 300);
              }
            } else if (data && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
              var txt = decodeBytesToText(data);
              if (txt) {
                patched = patchRealtimePayload(txt, 'ws-bytes');
                if (!patched && /channel[_-]?id|message[_-]?seq|client[_-]?msg|payload|from[_-]?uid|to[_-]?uid/i.test(txt)) {
                  self.scheduleSync('ws-bytes:fallback', 300);
                }
              }
            }
          });
        } catch (e) {}

        return ws;
      }

      function TappedWebSocket(url, protocols) {
        var ws = arguments.length > 1 ? new NativeWS(url, protocols) : new NativeWS(url);
        return bind(ws, url);
      }

      try {
        TappedWebSocket.prototype = NativeWS.prototype;
        TappedWebSocket.CONNECTING = NativeWS.CONNECTING;
        TappedWebSocket.OPEN = NativeWS.OPEN;
        TappedWebSocket.CLOSING = NativeWS.CLOSING;
        TappedWebSocket.CLOSED = NativeWS.CLOSED;
        TappedWebSocket.__wkChatTapped = true;
        W.WebSocket = TappedWebSocket;
        this._nativeWS = NativeWS;
        this._wsInstalled = true;
      } catch (e) {
        warn('ws tap failed', e && e.message ? e.message : e);
      }
    }
  };

  function skeletonHtml() {
    var out = [];

    for (var i = 0; i < 8; i++) {
      out.push(
        '<div class="wk-ski">' +
          '<div class="wk-ska"></div>' +
          '<div class="wk-skb">' +
            '<div class="wk-skl wk-skn"></div>' +
            '<div class="wk-skl wk-skp"></div>' +
          '</div>' +
          '<div class="wk-skt"></div>' +
        '</div>'
      );
    }

    return out.join('');
  }

  function rootHtml() {
    return (
      '<div class="wk-load" hidden></div>' +
      '<div class="wk-sk" hidden>' + skeletonHtml() + '</div>' +
      '<div class="wk-err" hidden>' +
        '<div class="wk-ert">加载失败，请重试</div>' +
        '<button type="button" class="wk-erb">重试</button>' +
      '</div>' +
      '<div class="wk-sc">' +
        '<div class="wk-ph"></div>' +
        '<ul class="wk-vl"></ul>' +
      '</div>' +
      '<div class="wk-em" style="display:none">暂无会话</div>'
    );
  }

  var VList = {
    pool: [],
    used: 0,
    rS: -1,
    rE: -1,
    _scroller: null,
    _onScroll: null,
    _scrollBound: false,
    _resizer: null,
    _resizeTimer: 0,
    _rafId: 0,
    _refreshQueued: false,
    _delegateBound: false,
    _delegateRoot: null,

    createNode: function () {
      var li = D.createElement('li');

      li.className = 'wk-i';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      li.innerHTML =
        '<div class="wk-aw">' +
          '<img class="wk-av" alt="" draggable="false">' +
          '<div class="wk-st"></div>' +
          '<span class="wk-fl" aria-hidden="true"></span>' +
        '</div>' +
        '<div class="wk-bd">' +
          '<div class="wk-r1">' +
            '<span class="wk-lt">' +
              '<span class="wk-pn"></span>' +
              '<span class="wk-nm"></span>' +
            '</span>' +
            '<span class="wk-tm"></span>' +
          '</div>' +
          '<div class="wk-r2">' +
            '<span class="wk-pv"></span>' +
            '<span class="wk-bx"><span class="wk-bg" style="display:none"></span></span>' +
          '</div>' +
        '</div>';

      li._$ = {
        img: li.querySelector('.wk-av'),
        dot: li.querySelector('.wk-st'),
        flag: li.querySelector('.wk-fl'),
        pin: li.querySelector('.wk-pn'),
        name: li.querySelector('.wk-nm'),
        time: li.querySelector('.wk-tm'),
        prev: li.querySelector('.wk-pv'),
        badge: li.querySelector('.wk-bg')
      };

      li._h = '';
      li._room = null;
      li._suppressClickUntil = 0;

      return li;
    },

    resetStructure: function () {
      this.pool = [];
      this.used = 0;
      this.rS = -1;
      this.rE = -1;
      this._delegateBound = false;
      this._delegateRoot = null;
      this._detachScroll();

      if (this._resizer) {
        this._resizer.disconnect();
        this._resizer = null;
      }

      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = 0;
      }
    },

    _detachScroll: function () {
      if (this._scroller && this._onScroll) {
        this._scroller.removeEventListener('scroll', this._onScroll);
      }

      this._scroller = null;
      this._onScroll = null;
      this._scrollBound = false;
    },

    _bindDelegate: function () {
      var vl = D.querySelector('#wk-root .wk-vl');

      if (!vl) return;

      if (this._delegateBound && this._delegateRoot === vl) return;

      this._delegateBound = false;
      this._delegateRoot = vl;

      var pressTimer = 0;
      var sx = 0;
      var sy = 0;
      var pressTarget = null;
      var tapTimer = 0;
      var tapTarget = null;

      function findItem(el) {
        while (el && el !== vl) {
          if (el.classList && el.classList.contains('wk-i')) return el;
          el = el.parentNode;
        }

        return null;
      }

      function clearPress() {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = 0;
        }

        pressTarget = null;
      }

      function clearTap() {
        if (tapTimer) {
          clearTimeout(tapTimer);
          tapTimer = 0;
        }

        if (tapTarget) {
          tapTarget.classList.remove('wk-tap');
          tapTarget = null;
        }
      }

      vl.addEventListener('touchstart', function (e) {
        var li = findItem(e.target);

        if (!li || !li._room) return;

        clearTap();

        tapTarget = li;
        tapTimer = setTimeout(function () {
          if (tapTarget) tapTarget.classList.add('wk-tap');
        }, 60);

        if (!e.touches || e.touches.length !== 1) return;

        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;

        clearPress();

        pressTarget = li;

        pressTimer = setTimeout(function () {
          pressTimer = 0;

          if (pressTarget && pressTarget._room) {
            pressTarget._suppressClickUntil = Date.now() + 600;
            Menu.open(pressTarget._room);

            if (navigator.vibrate) {
              try { navigator.vibrate(10); } catch (err) {}
            }
          }

          pressTarget = null;
        }, LONG_PRESS_MS);
      }, { passive: true });

      vl.addEventListener('touchmove', function (e) {
        if (!pressTimer || !e.touches || !e.touches.length) return;

        var dx = Math.abs(e.touches[0].clientX - sx);
        var dy = Math.abs(e.touches[0].clientY - sy);

        if (dx > 10 || dy > 10) clearPress();
      }, { passive: true });

      vl.addEventListener('touchend', function () {
        clearPress();
        clearTap();
      }, { passive: true });

      vl.addEventListener('touchcancel', function () {
        clearPress();
        clearTap();
      }, { passive: true });

      vl.addEventListener('contextmenu', function (e) {
        var li = findItem(e.target);

        if (!li || !li._room) return;

        e.preventDefault();

        li._suppressClickUntil = Date.now() + 400;
        Menu.open(li._room);
      });

      vl.addEventListener('click', function (e) {
        var li = findItem(e.target);

        if (!li || !li._room) return;

        if (li._suppressClickUntil && Date.now() < li._suppressClickUntil) {
          e.preventDefault();
          return;
        }

        Ctrl.openConversation(li._room);
      });

      vl.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        var li = findItem(e.target);

        if (!li || !li._room) return;

        e.preventDefault();

        Ctrl.openConversation(li._room);
      });

      this._delegateBound = true;
    },

    bind: function () {
      var sc = D.querySelector('#wk-root .wk-sc');

      if (!sc) return;

      if (this._scrollBound && this._scroller === sc) {
        this._bindDelegate();
        return;
      }

      this._detachScroll();

      this._scroller = sc;

      var self = this;
      var pending = false;

      this._onScroll = function () {
        if (pending) return;

        pending = true;

        requestAnimationFrame(function () {
          pending = false;
          self.render(false);
        });
      };

      sc.addEventListener('scroll', this._onScroll, { passive: true });

      this._scrollBound = true;
      this._bindDelegate();

      if (this._resizer) {
        this._resizer.disconnect();
        this._resizer = null;
      }

      if (typeof ResizeObserver !== 'undefined') {
        this._resizer = new ResizeObserver(function () {
          if (self._resizeTimer) clearTimeout(self._resizeTimer);

          self._resizeTimer = setTimeout(function () {
            self._resizeTimer = 0;

            if (applyItemHeight()) {
              self.rS = -1;
              self.rE = -1;
            }

            self.render(true);
            Ctrl.healthKick('resize');
          }, 120);
        });

        this._resizer.observe(sc);
      }
    },

    scheduleRefresh: function () {
      if (this._refreshQueued) return;

      this._refreshQueued = true;

      var self = this;

      if (this._rafId) cancelAnimationFrame(this._rafId);

      this._rafId = requestAnimationFrame(function () {
        self._rafId = 0;
        self._refreshQueued = false;
        self.rS = -1;
        self.rE = -1;
        self.render(true);
      });
    },

    render: function (force) {
      var sc = D.querySelector('#wk-root .wk-sc');
      var vl = D.querySelector('#wk-root .wk-vl');
      var ph = D.querySelector('#wk-root .wk-ph');
      var em = D.querySelector('#wk-root .wk-em');

      if (!sc || !vl) return false;

      this._bindDelegate();

      var list = Store.getFiltered();
      var total = list.length;

      if (ph) ph.style.height = (total * ITEM_H) + 'px';

      if (em) {
        em.style.display = total === 0 && !Ctrl._loading ? 'flex' : 'none';
      }

      var sk = D.querySelector('#wk-root .wk-sk');

      if (total === 0) {
        for (var z = 0; z < this.used; z++) {
          if (this.pool[z]) this.pool[z].style.display = 'none';
        }

        this.used = 0;
        this.rS = -1;
        this.rE = -1;
        vl.style.display = 'none';

        if (sk) {
          if (Ctrl._loading) {
            sk.removeAttribute('hidden');
            sk.setAttribute('data-v', '1');
          } else {
            sk.setAttribute('hidden', 'hidden');
            sk.removeAttribute('data-v');
          }
        }

        return true;
      }

      if (sk) {
        sk.setAttribute('hidden', 'hidden');
        sk.removeAttribute('data-v');
      }

      vl.style.display = '';

      var viewH = sc.clientHeight;

      if (viewH <= 0) {
        setTimeout(function () { VList.render(true); }, 80);
        return false;
      }

      var scrollTop = sc.scrollTop;
      var start = Math.max(0, Math.floor(scrollTop / ITEM_H) - BUFFER);
      var end = Math.min(total, Math.ceil((scrollTop + viewH) / ITEM_H) + BUFFER);
      var count = end - start;

      while (this.pool.length < count) this.pool.push(this.createNode());

      var rangeChanged = !!force || start !== this.rS || end !== this.rE || count !== this.used;

      if (rangeChanged) {
        for (var i = count; i < this.used; i++) {
          if (this.pool[i]) this.pool[i].style.display = 'none';
        }

        this.used = count;
        this.rS = start;
        this.rE = end;
        vl.style.transform = 'translate3d(0,' + (start * ITEM_H) + 'px,0)';
      }

      for (var vi = 0; vi < count; vi++) {
        var item = this.pool[vi];

        if (item.parentNode !== vl) vl.appendChild(item);

        item.style.display = '';
        this._fill(item, list[start + vi]);
      }

      this._trimPool(count, vl);
      Ctrl.healthKick('render');

      return true;
    },

    _trimPool: function (needed, currentVl) {
      var keep = needed + 20;

      if (this.pool.length <= keep) return;

      for (var i = this.pool.length - 1; i >= keep; i--) {
        var node = this.pool[i];

        if (node && node.parentNode === currentVl) currentVl.removeChild(node);
      }

      this.pool.length = keep;
    },

    _fill: function (li, room) {
      var ref = li._$;
      var id = roomStableId(room);
      var ch = roomChannelId(room);
      var other = Store.getOtherUser(room);
      var prof = ch ? Store.profiles[ch] : null;

      var name = Store.displayName(room) || '未命名会话';
      var avatar = (other && other.picture) || (prof && prof.picture) || '';
      var flagText = (prof && flagEmoji(prof.flag)) || (other && flagEmoji(other.language_flag || other.location)) || '';
      var status = normalizeStatus((prof && prof.status) || (other && other.status) || 'offline');

      var ts = roomActivityTs(room);
      var timeStr = fmtTime(ts);
      var preview = trimPreview(room.teaser && room.teaser.content || '', 60);

      var unread = room.unread || 0;

      if (Store.isLocallyRead(room)) unread = 0;

      var active = Store.isRoomActive(room);
      var pinned = Store.isPinned(room);

      var hash = [
        id,
        ch,
        name,
        avatar,
        flagText,
        status,
        timeStr,
        preview,
        unread,
        active ? 1 : 0,
        pinned ? 1 : 0
      ].join('\x01');

      if (li._h === hash) return;

      li._h = hash;
      li._room = room;

      li.setAttribute('data-act', active ? '1' : '0');
      li.setAttribute('aria-pressed', active ? 'true' : 'false');
      li.setAttribute('aria-label', name);

      ref.name.textContent = name;
      ref.time.textContent = timeStr;
      ref.prev.textContent = preview;

      if (pinned) {
        ref.pin.textContent = '📌';
        ref.pin.setAttribute('data-v', '1');
      } else {
        ref.pin.textContent = '';
        ref.pin.removeAttribute('data-v');
      }

      var src = avatar || avatarFallback(name);

      if (ref.img.getAttribute('src') !== src) ref.img.setAttribute('src', src);

      ref.img.alt = name;
      ref.dot.setAttribute('data-s', status);

      if (flagText) {
        ref.flag.textContent = flagText;
        ref.flag.setAttribute('data-v', '1');
      } else {
        ref.flag.textContent = '';
        ref.flag.removeAttribute('data-v');
      }

      if (unread > 0) {
        ref.badge.style.display = '';
        ref.badge.textContent = unread > 99 ? '99+' : String(unread);
      } else {
        ref.badge.style.display = 'none';
        ref.badge.textContent = '';
      }
    },

    destroy: function () {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = 0;
      }

      this._refreshQueued = false;
      this.resetStructure();

      var root = D.getElementById('wk-root');
      if (root) root.remove();

      Menu.close();
    }
  };

  var Ctrl = {
    mounted: false,
    _uiReady: false,
    _loading: false,
    _loadError: false,
    _mountRetryTimer: 0,
    _routeObs: null,
    _themeObs: null,
    _viewportBound: false,
    _onViewport: null,
    _openToken: 0,

    _getNav: function () {
      return D.querySelector('[component="chat/nav-wrapper"]');
    },

    _ensureRoot: function (nav) {
      if (!nav) return null;

      var roots = D.querySelectorAll('#wk-root');

      if (roots.length > 1) {
        for (var i = 0; i < roots.length - 1; i++) roots[i].remove();
      }

      var root = D.getElementById('wk-root');
      var recreated = false;

      if (!root || !root.isConnected) {
        if (root) root.remove();

        root = D.createElement('div');
        root.id = 'wk-root';
        root.innerHTML = rootHtml();
        nav.appendChild(root);
        recreated = true;
      } else if (root.parentNode !== nav) {
        nav.appendChild(root);
        recreated = true;
      }

      if (!root.querySelector('.wk-sc') || !root.querySelector('.wk-vl')) {
        root.innerHTML = rootHtml();
        recreated = true;
      }

      if (recreated) VList.resetStructure();

      var retry = root.querySelector('.wk-erb');

      if (retry && !retry.__wkBound) {
        retry.__wkBound = true;
        retry.addEventListener('click', function () {
          Ctrl.retryLoad();
        });
      }

      if (!root.__wkCtxBound) {
        root.__wkCtxBound = true;

        root.addEventListener('contextmenu', function (e) {
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          e.preventDefault();
        });

        root.addEventListener('selectstart', function (e) {
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          e.preventDefault();
        }, true);

        root.addEventListener('dragstart', function (e) {
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          e.preventDefault();
        }, true);
      }

      applyItemHeight();

      return root;
    },

    setReady: function (flag) {
      this._uiReady = !!flag;

      if (this._uiReady) {
        D.body.setAttribute('data-wk', '1');
        D.documentElement.setAttribute('data-wk', '1');
        D.body.removeAttribute('data-wk-probe');
        D.documentElement.removeAttribute('data-wk-probe');
      } else {
        D.body.removeAttribute('data-wk');
        D.documentElement.removeAttribute('data-wk');
      }
    },

    setProbe: function (flag) {
      if (flag) {
        D.body.setAttribute('data-wk-probe', '1');
        D.documentElement.setAttribute('data-wk-probe', '1');
      } else {
        D.body.removeAttribute('data-wk-probe');
        D.documentElement.removeAttribute('data-wk-probe');
      }
    },

    isReady: function () {
      return !!this._uiReady;
    },

    setLoading: function (flag) {
      this._loading = !!flag;

      var hasData = Store.getFiltered().length > 0;
      var sk = D.querySelector('#wk-root .wk-sk');
      var err = D.querySelector('#wk-root .wk-err');
      var em = D.querySelector('#wk-root .wk-em');

      if (sk) {
        if (flag && !hasData && !this._loadError) {
          sk.removeAttribute('hidden');
          sk.setAttribute('data-v', '1');
        } else {
          sk.setAttribute('hidden', 'hidden');
          sk.removeAttribute('data-v');
        }
      }

      if (err && (flag || hasData || !this._loadError)) {
        err.setAttribute('hidden', 'hidden');
        err.removeAttribute('data-v');
      }

      if (em && flag) em.style.display = 'none';
    },

    setError: function (flag, msg) {
      this._loadError = !!flag;

      var hasData = Store.getFiltered().length > 0;
      var err = D.querySelector('#wk-root .wk-err');
      var errText = D.querySelector('#wk-root .wk-ert');
      var sk = D.querySelector('#wk-root .wk-sk');

      if (errText && msg) errText.textContent = msg;

      if (sk && flag) {
        sk.setAttribute('hidden', 'hidden');
        sk.removeAttribute('data-v');
      }

      if (err) {
        if (flag && !hasData) {
          err.removeAttribute('hidden');
          err.setAttribute('data-v', '1');
        } else {
          err.setAttribute('hidden', 'hidden');
          err.removeAttribute('data-v');
        }
      }
    },

    mount: function () {
      var uid = myUid();

      if (!uid) return;

      var nav = this._getNav();

      if (!nav) {
        this.setReady(false);
        this.setProbe(true);
        this._watchRouteContainer();

        if (this._mountRetryTimer) clearTimeout(this._mountRetryTimer);

        var self = this;

        this._mountRetryTimer = setTimeout(function () {
          self._mountRetryTimer = 0;
          if (isChats(location.pathname)) self.mount();
        }, MOUNT_RETRY_MS);

        return;
      }

      if (this._mountRetryTimer) {
        clearTimeout(this._mountRetryTimer);
        this._mountRetryTimer = 0;
      }

      this._unwatchRouteContainer();

      Store.init(uid);
      ProfileHydrator.schedule(Store.rooms, 150);
      this._syncActiveRoom();

      var root = this._ensureRoot(nav);

      if (!root) return;

      this.mounted = true;

      var hasCache = Store.getFiltered().length > 0;

      this.setProbe(true);
      this.setReady(false);
      this.setError(false);
      this.setLoading(!hasCache);

      VList.bind();
      applyItemHeight();

      if (hasCache) {
        VList.render(true);
        this.setReady(true);
        this.setProbe(false);
        this.setLoading(false);
      } else {
        VList.scheduleRefresh();
      }

      Net.start();
      this._watchTheme();
      this._watchViewport();
      this.forceRelayout();
    },

    unmount: function () {
      this._openToken++;

      if (this._mountRetryTimer) {
        clearTimeout(this._mountRetryTimer);
        this._mountRetryTimer = 0;
      }

      this._unwatchRouteContainer();
      this.setReady(false);
      this.setProbe(false);
      Net.stop();
      VList.destroy();
      this._unwatchTheme();
      this._unwatchViewport();
      this.mounted = false;
    },

    retryLoad: function () {
      this.setError(false);
      this.setLoading(Store.getFiltered().length === 0);
      Net.scheduleSync('retry', 0);
    },

    forceRelayout: function () {
      if (!this.mounted || !isChats(location.pathname)) return;

      var self = this;

      requestAnimationFrame(function () {
        if (!self.mounted || !isChats(location.pathname)) return;

        self._syncActiveRoom();
        self._ensureRoot(self._getNav());
        applyItemHeight();
        VList.bind();
        VList.rS = -1;
        VList.rE = -1;
        VList.render(true);
        self.healthKick('force');
      });
    },

    healthKick: function () {
      if (!this.mounted || !isChats(location.pathname)) return;

      var nav = this._getNav();
      var root = D.getElementById('wk-root');
      var sc = root && root.querySelector('.wk-sc');

      if (nav && root && root.parentNode === nav && sc && sc.clientHeight > 0) {
        this.setReady(true);
        this.setProbe(false);
      } else {
        this.setProbe(true);
      }
    },

    _syncActiveRoom: function () {
      Store.activeRoom = '';
      Store.activeTargetUid = '';

      if (W.ajaxify && W.ajaxify.data && W.ajaxify.data.roomId) {
        Store.activeRoom = String(W.ajaxify.data.roomId);
      } else {
        var m = stripBase(location.pathname).match(/\/chats\/([^/?#]+)/);
        if (m) Store.activeRoom = decodeURIComponent(m[1]);
      }

      if (Store.activeRoom && Store.roomToUid[Store.activeRoom]) {
        Store.activeTargetUid = Store.roomToUid[Store.activeRoom];
      }

      Store.markDirty();
    },

    openConversation: function (room) {
      if (!room) return;

      this._openToken++;

      var token = this._openToken;
      var ch = roomChannelId(room);
      var realRoomId = nodebbRoomId(room);
      var stableId = roomStableId(room) || ch || realRoomId;

      if (!stableId && !realRoomId && !ch) return;

      Store.activeRoom = realRoomId || stableId || '';
      if (ch) Store.activeTargetUid = ch;

      room.unread = 0;
      Store.noteLocalRead(room, Date.now());
      Store.markDirty();
      Store.save();
      VList.scheduleRefresh();

      var self = this;

      this._resolveNodeBBRoomId(room).then(function (resolvedRoomId) {
        if (token !== self._openToken) return;

        if (!resolvedRoomId) {
          warn('open failed: no nodebb room id', { stableId: stableId, channelId: ch, room: room });
          return;
        }

        room.nodebb_room_id = String(resolvedRoomId);
        room.nbb_room_id = String(resolvedRoomId);
        room._hasNodeBBRoomId = true;
        Store.uidToRoom[ch || stableId] = String(resolvedRoomId);
        Store.roomToUid[String(resolvedRoomId)] = ch || stableId;
        Store.noteLocalRead(room, Date.now());
        Store.save();

        self._openNodeBBRoute(resolvedRoomId);
      }).catch(function (err) {
        warn('open conversation error', err && err.message ? err.message : err);
      });
    },

    _resolveNodeBBRoomId: function (room) {
      var direct = nodebbRoomId(room);
      if (direct) return Promise.resolve(direct);

      var ch = roomChannelId(room) || roomStableId(room);

      if (!ch) return Promise.resolve('');

      if (Store.uidToRoom[ch] && Store.uidToRoom[ch] !== ch) {
        return Promise.resolve(Store.uidToRoom[ch]);
      }

      return this._openByTargetUid(ch);
    },

    _ensureNumericUid: function (key) {
      key = String(key || '').trim();
      if (!key) return Promise.resolve(0);

      if (isNumericId(key)) return Promise.resolve(parseInt(key, 10));

      var prof = Store.profiles[key];
      if (prof && prof.uid && isNumericId(prof.uid)) return Promise.resolve(parseInt(prof.uid, 10));

      var url = userApiUrl(key);
      if (!url) return Promise.resolve(0);

      return fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (raw) {
          var u = extractUserPayload(raw);
          if (!u || !u.uid || !isNumericId(u.uid)) return 0;

          var p = {
            uid: String(u.uid),
            username: u.displayname || u.username || '',
            picture: u.picture || '',
            flag: u.language_flag || u.location || '',
            status: normalizeStatus(u.status),
            _ts: Date.now()
          };

          Store.profiles[String(key)] = p;
          Store.profiles[String(u.uid)] = p;
          if (u.username) Store.profiles[String(u.username)] = p;
          if (u.userslug) Store.profiles[String(u.userslug)] = p;
          Store.save();

          return parseInt(u.uid, 10);
        }).catch(function () { return 0; });
    },

    _openByTargetUid: function (targetKey) {
      var self = this;
      targetKey = String(targetKey || '').trim();

      return this._ensureNumericUid(targetKey).then(function (numericUid) {
        if (!numericUid) return '';

        return self._findExistingNodeBBRoom(numericUid).then(function (roomId) {
          if (roomId) return roomId;
          return self._createNodeBBRoom(numericUid);
        }).then(function (roomId) {
          roomId = String(roomId || '');

          if (roomId) {
            Store.uidToRoom[targetKey] = roomId;
            Store.roomToUid[roomId] = targetKey;
            Store.save();
          }

          return roomId;
        });
      });
    },

    _findExistingNodeBBRoom: function (numericUid) {
      numericUid = String(numericUid || '');
      if (!numericUid) return Promise.resolve('');

      return fetch(basePath() + '/api/v3/chats?perPage=100', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (json) {
        var payload = json && (json.response || json) || {};
        var rooms = payload.rooms || payload.data || [];

        if (!Array.isArray(rooms)) return '';

        for (var i = 0; i < rooms.length; i++) {
          var rm = rooms[i] || {};
          var users = rm.users || [];

          for (var j = 0; j < users.length; j++) {
            if (String((users[j] || {}).uid || '') === numericUid) {
              return String(rm.roomId || rm.room_id || '');
            }
          }
        }

        return '';
      }).catch(function () { return ''; });
    },

    _createNodeBBRoom: function (numericUid) {
      numericUid = parseInt(numericUid, 10);
      if (!numericUid) return Promise.resolve('');

      return fetch(basePath() + '/api/v3/chats', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-csrf-token': (W.config && W.config.csrf_token) || ''
        },
        body: JSON.stringify({ uids: [numericUid] })
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (json) {
        var data = json && (json.response || json) || {};
        return String(data.roomId || data.room_id || '');
      }).catch(function () { return ''; });
    },

    _openNodeBBRoute: function (roomId) {
      roomId = String(roomId || '');
      if (!roomId) return;

      var slug = mySlug();
      var pattern = cfg('openPathPattern', '');

      var path;

      if (pattern) {
        path = pattern
          .replace('{slug}', encodeURIComponent(slug || ''))
          .replace('{roomId}', encodeURIComponent(roomId))
          .replace('{id}', encodeURIComponent(roomId));
      } else {
        path = slug
          ? ('user/' + encodeURIComponent(slug) + '/chats/' + encodeURIComponent(roomId))
          : ('chats/' + encodeURIComponent(roomId));
      }

      path = String(path || '').replace(/^\/+/, '');

      log('open nbb route', path);

      // 从列表页进入具体聊天前先释放接管，防止 data-wk/probe 残留把 NodeBB 原生输入框挤到上面。
      setDetailMode(true);
      try { this.unmount(); } catch (e) {}

      if (W.ajaxify && typeof W.ajaxify.go === 'function') {
        W.ajaxify.go(path);
      } else {
        location.href = basePath() + '/' + path;
      }
    },

    _watchRouteContainer: function () {
      if (this._routeObs) return;

      var self = this;

      this._routeObs = new MutationObserver(function () {
        if (!isChats(location.pathname)) return;

        var nav = self._getNav();

        if (!nav) return;

        self._unwatchRouteContainer();
        self.mount();
      });

      if (D.body) {
        this._routeObs.observe(D.body, { childList: true, subtree: true });
      }
    },

    _unwatchRouteContainer: function () {
      if (this._routeObs) {
        this._routeObs.disconnect();
        this._routeObs = null;
      }
    },

    _watchTheme: function () {
      if (this._themeObs) return;

      this._themeObs = new MutationObserver(function () {
        VList.scheduleRefresh();
      });

      this._themeObs.observe(D.documentElement, {
        attributes: true,
        attributeFilter: ['data-bs-theme', 'class']
      });

      if (D.body) {
        this._themeObs.observe(D.body, {
          attributes: true,
          attributeFilter: ['data-bs-theme', 'class']
        });
      }
    },

    _unwatchTheme: function () {
      if (this._themeObs) {
        this._themeObs.disconnect();
        this._themeObs = null;
      }
    },

    _watchViewport: function () {
      if (this._viewportBound) return;

      this._viewportBound = true;

      var self = this;

      this._onViewport = function () {
        if (!self.mounted || !isChats(location.pathname)) return;

        setTimeout(function () {
          if (!self.mounted || !isChats(location.pathname)) return;

          if (applyItemHeight()) {
            VList.rS = -1;
            VList.rE = -1;
          }

          VList.render(true);
          self.healthKick('viewport');
        }, 120);
      };

      W.addEventListener('resize', this._onViewport, { passive: true });
      W.addEventListener('orientationchange', this._onViewport, { passive: true });
    },

    _unwatchViewport: function () {
      if (!this._viewportBound) return;

      this._viewportBound = false;

      if (this._onViewport) {
        W.removeEventListener('resize', this._onViewport);
        W.removeEventListener('orientationchange', this._onViewport);
      }

      this._onViewport = null;
    }
  };


  var ChatDetailFix = {
    _obs: null,
    _timer: 0,

    start: function () {
      if (!isChatDetail(location.pathname)) return;

      D.documentElement.setAttribute('data-wk-detail', '1');
      if (D.body) D.body.setAttribute('data-wk-detail', '1');

      this.normalizeSoon(0);

      if (this._obs || !D.body || typeof MutationObserver === 'undefined') return;

      var self = this;
      this._obs = new MutationObserver(function () {
        self.normalizeSoon(80);
      });

      this._obs.observe(D.body, { childList: true, subtree: true, characterData: true });
    },

    stop: function () {
      D.documentElement.removeAttribute('data-wk-detail');
      if (D.body) D.body.removeAttribute('data-wk-detail');
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = 0;
      }
      if (this._obs) {
        this._obs.disconnect();
        this._obs = null;
      }
    },

    normalizeSoon: function (delay) {
      var self = this;
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(function () {
        self._timer = 0;
        self.normalizeWkCallTexts();
      }, delay || 0);
    },

    labelForWkCall: function (text) {
      text = String(text == null ? '' : text).trim();
      if (text.indexOf('__wkcall__:') !== 0) return '';

      var raw = text.slice('__wkcall__:'.length).trim();
      var obj = tryParseJson(raw) || {};
      var type = String(obj.type || '').toLowerCase();
      var mode = String(obj.mode || '').toLowerCase();
      var suffix = mode === 'video' ? '视频' : (mode === 'audio' || mode === 'voice' ? '语音' : '');

      if (type === 'cancel') return '[' + (suffix || '') + '通话已取消]';
      if (type === 'reject') return '[' + (suffix || '') + '通话已拒绝]';
      if (type === 'busy') return '[对方忙线]';
      if (type === 'accept' || type === 'connected') return '[' + (suffix || '') + '通话中]';
      if (type === 'hangup' || type === 'end' || type === 'finish') return '[' + (suffix || '') + '通话已结束]';
      if (type === 'ringing' || type === 'invite') return '[' + (suffix || '') + '通话邀请]';
      return '[通话消息]';
    },

    normalizeWkCallTexts: function () {
      if (!isChatDetail(location.pathname) || !D.body || !D.createTreeWalker || typeof NodeFilter === 'undefined') return;

      var walker = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var v = node && node.nodeValue ? node.nodeValue : '';
          if (v.indexOf('__wkcall__:') === -1) return NodeFilter.FILTER_REJECT;
          var p = node.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          var tag = p.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      var nodes = [];
      var n;
      while ((n = walker.nextNode())) nodes.push(n);

      for (var i = 0; i < nodes.length; i++) {
        var txt = String(nodes[i].nodeValue || '').trim();
        var label = this.labelForWkCall(txt);
        if (label) nodes[i].nodeValue = label;
      }
    }
  };

  function routeCheck() {
    if (isChatDetail(location.pathname)) {
      setDetailMode(true);
      if (Ctrl.mounted || D.getElementById('wk-root')) Ctrl.unmount();
      ChatDetailFix.start();
      return;
    }

    if (isChats(location.pathname)) {
      ChatDetailFix.stop();
      setEarlyProbe();
      requestAnimationFrame(function () {
        if (!isChats(location.pathname)) return;
        Ctrl.mount();
        Net.scheduleSync('route-list', 0);
        setTimeout(function () { if (Ctrl.mounted && isChats(location.pathname)) Net.scheduleSync('route-list-verify', 450); }, 450);
        setTimeout(function () { if (Ctrl.mounted && isChats(location.pathname)) Net.scheduleSync('route-list-verify2', 1200); }, 1200);
      });
      return;
    }

    if (Ctrl.mounted || D.getElementById('wk-root')) Ctrl.unmount();
    clearListModeFlags();
    ChatDetailFix.stop();
  }

  var RouteWatcher = {
    _last: '',
    _timer: 0,
    _patchedHistory: false,

    key: function () {
      return String(location.pathname || '') + '|' + String(location.search || '') + '|' + String(location.hash || '');
    },

    kick: function (delay) {
      var self = this;
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(function () {
        self._timer = 0;
        self._last = self.key();
        routeCheck();
      }, typeof delay === 'number' ? delay : 30);
    },

    start: function () {
      var self = this;
      this._last = this.key();

      if (!this._patchedHistory && W.history) {
        this._patchedHistory = true;
        ['pushState', 'replaceState'].forEach(function (name) {
          var nativeFn = W.history[name];
          if (typeof nativeFn !== 'function' || nativeFn.__wkChatPatched) return;
          var patched = function () {
            var ret = nativeFn.apply(this, arguments);
            self.kick(20);
            return ret;
          };
          patched.__wkChatPatched = true;
          try { W.history[name] = patched; } catch (e) {}
        });
      }

      setInterval(function () {
        var k = self.key();
        if (k !== self._last) {
          self._last = k;
          routeCheck();
        }
      }, 500);
    }
  };

  W.addEventListener('beforeunload', function () {
    if (Ctrl.mounted) Store.saveNow();
  });

  W.addEventListener('pagehide', function () {
    if (Ctrl.mounted) Store.saveNow();
  });

  if (W.jQuery) {
    W.jQuery(D).ready(routeCheck);

    W.jQuery(W).on('action:ajaxify.end', function () {
      routeCheck();

      setTimeout(function () {
        if (isChats(location.pathname) && Ctrl.mounted) {
          Ctrl._syncActiveRoom();
          Ctrl.forceRelayout();
          Net.scheduleSync('ajaxify', 0);
        }
      }, 60);
    });
  } else {
    D.addEventListener('DOMContentLoaded', routeCheck);

    W.addEventListener('popstate', function () {
      routeCheck();

      setTimeout(function () {
        if (isChats(location.pathname) && Ctrl.mounted) {
          Ctrl._syncActiveRoom();
          Ctrl.forceRelayout();
          Net.scheduleSync('popstate', 0);
        }
      }, 60);
    });
  }

  D.addEventListener('visibilitychange', function () {
    if (!D.hidden && Ctrl.mounted && isChats(location.pathname)) {
      Ctrl.forceRelayout();
      Net.scheduleSync('visible', 0);
    }
  });

  W.addEventListener('focus', function () {
    if (Ctrl.mounted && isChats(location.pathname)) {
      Ctrl.forceRelayout();
      Net.scheduleSync('focus', 0);
    }
  });

  W.addEventListener('pageshow', function () {
    if (isChats(location.pathname) || isChatDetail(location.pathname)) {
      routeCheck();

      setTimeout(function () {
        if (Ctrl.mounted && isChats(location.pathname)) {
          Ctrl.forceRelayout();
          Net.scheduleSync('pageshow', 0);
        }
      }, 80);
    }
  });

  W.addEventListener('contextmenu', function (e) {
    if (!isChats(location.pathname)) return;

    var t = e.target;

    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    e.preventDefault();
  }, true);

  W.WKChat = {
    version: VERSION,
    mount: function () { Ctrl.mount(); },
    unmount: function () { Ctrl.unmount(); },
    sync: function () { Net.scheduleSync('api', 0); },
    retryLoad: function () { Ctrl.retryLoad(); },
    forceRelayout: function () { Ctrl.forceRelayout(); },
    openRoom: function (id) {
      var room = Store.byId[String(id || '')] || {
        roomId: String(id || ''),
        room_id: String(id || ''),
        channel_id: String(id || '')
      };

      Ctrl.openConversation(room);
    },
    openConversation: function (room) { Ctrl.openConversation(room); },
    pin: function (id) { Store.setPinned(Store.byId[String(id)] || id, true); VList.scheduleRefresh(); },
    unpin: function (id) { Store.setPinned(Store.byId[String(id)] || id, false); VList.scheduleRefresh(); },
    hide: function (id) { Store.setHidden(Store.byId[String(id)] || id, true); VList.scheduleRefresh(); },
    unhide: function (id) { Store.setHidden(Store.byId[String(id)] || id, false); VList.scheduleRefresh(); },
    remark: function (id, text) { Store.setRemark(Store.byId[String(id)] || id, text); VList.scheduleRefresh(); },
    clearRemark: function (id) { Store.clearRemark(Store.byId[String(id)] || id); VList.scheduleRefresh(); },
    resetMeta: function () {
      Store.meta = { pinned: {}, hidden: {}, remarks: {}, readAt: {}, readSnap: {} };
      Store.markDirty();
      Store.save();
      VList.scheduleRefresh();
    },
    hiddenList: function () {
      var out = [];
      var m = Store.meta.hidden || {};
      Object.keys(m).forEach(function (k) { if (m[k]) out.push(k); });
      return out;
    },
    getMeta: function () { return safeJsonClone(Store.meta); },
    debugNow: function () {
      var root = D.getElementById('wk-root');
      var sc = root && root.querySelector('.wk-sc');
      var vl = root && root.querySelector('.wk-vl');
      var top = Store.getFiltered().slice(0, 10).map(function (r, idx) {
        return {
          idx: idx,
          roomId: r.roomId || r.room_id || '',
          channel_id: r.channel_id || '',
          unread: r.unread || 0,
          teaser: r.teaser && r.teaser.content || '',
          ts: roomActivityTs(r)
        };
      });

      var snap = {
        version: VERSION,
        mounted: Ctrl.mounted,
        ready: Ctrl.isReady(),
        root: !!root,
        scHeight: sc ? sc.clientHeight : 0,
        vlChildren: vl && vl.children ? vl.children.length : 0,
        uid: Store.uid,
        rooms: Store.rooms.length,
        filtered: Store.getFiltered().length,
        tokenEnsured: !!WKAdapter.ensured,
        bridgeBases: BRIDGE_BASES,
        realtimeEvents: REALTIME_EVENTS,
        sdkRealtime: SDK_REALTIME,
        sdkConnected: WukongRealtime.isHealthy(),
        sdkLastMessageAt: WukongRealtime._lastMessageAt || 0,
        sdkLastError: WukongRealtime._lastError || '',
        realtimeWsTap: REALTIME_WS_TAP,
        top: top
      };

      if (W.console && W.console.log) {
        try { W.console.log('[WKChat] debug', snap); } catch (e) {}
      }

      return snap;
    },
    hydrateProfiles: function () { ProfileHydrator.schedule(Store.rooms, 0); },
    testRealtime: function (payload) { return patchRealtimePayload(payload, 'api-test'); },
    startRealtime: function () { WukongRealtime.start(); return true; },
    realtime: WukongRealtime,
    forceSyncNow: function () { Net._needReturnSync = false; Net.scheduleSync('api-force', 0); return true; },
    routeCheck: function () { routeCheck(); return true; },

    dumpTop: function (n) {
      var rows = Store.getFiltered().slice(0, n || 10).map(function (r, idx) {
        return {
          idx: idx,
          roomId: r.roomId || r.room_id || '',
          channel_id: r.channel_id || '',
          name: Store.displayName(r),
          unread: r.unread || 0,
          teaser: r.teaser && r.teaser.content || '',
          ts: roomActivityTs(r)
        };
      });

      if (W.console && W.console.table) {
        try { W.console.table(rows); } catch (e) {}
      }

      return rows;
    },
    setDebug: function (flag) {
      DEBUG_WK = !!flag;
      return DEBUG_WK;
    },
    store: Store,
    adapter: WKAdapter
  };

  RouteWatcher.start();
  routeCheck();

})(window, document);
