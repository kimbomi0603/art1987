/*
 * chat-widget.js — 강진청자 국보 AI 안내 도우미 '청이' 위젯
 * 사용: <script src="/chat-widget.js" defer></script>   (영문 페이지: data-lang="en")
 * - 우하단 런처: Three.js(CDN)로 그린 3D 청자 캐릭터. CDN 실패 시 🏺 이모지로 대체.
 * - 클릭 → 채팅 패널. /api/chat 에 POST { message, history(최근 8개) }.
 * - 외부 CSS 없음. 모든 스타일은 이 파일 안에 있음.
 */
(function () {
  'use strict';
  if (window.__cheongiWidget) return; // 중복 삽입 방지
  window.__cheongiWidget = true;

  var script = document.currentScript;
  var LANG = (script && script.getAttribute('data-lang')) === 'en' ? 'en' : 'ko';
  var API = (script && script.getAttribute('data-api')) || '/api/chat';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
  var HISTORY_MAX = 8;

  // ── 문구 (언어별) ──
  var T = {
    ko: {
      name: '청이', sub: '강진청자 국보 · AI 안내',
      bubble: '안녕하세요, 청이예요 🏺 청자 제작 방법을 알려드릴까요? 문양·기법·가격도 물어보세요',
      greet: '안녕하세요, 강진청자 국보의 안내 도우미 청이예요 🏺 청자는 어떻게 만들어지는지(청자토 3년 숙성부터 1300℃ 재벌까지 10단계), 운학문·모란문·상감 같은 어려운 문양과 기법의 뜻, 그리고 가격·감사패 주문·배송·AS·오시는 길까지 쉽게 설명해 드려요. 무엇이든 물어보세요.',
      chips: ['청자는 어떻게 만들어요?', '상감기법·운학문이 뭐예요?', '청자 가격대는?', '감사패 주문은 어떻게?', '배송·AS 안내', '공방 위치·방문'],
      placeholder: '메시지를 입력하세요',
      send: '보내기', open: '청이에게 물어보기', close: '닫기',
      typing: '청이가 답을 준비하고 있어요…',
      errNet: '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요. 급하시면 고객센터 010-3637-7583(일요일 휴무)으로 연락 주세요.',
      errRate: '질문이 너무 빨라요. 잠시 후 다시 보내주세요.',
      note: 'AI 답변은 참고용이며, 정확한 가격·재고는 스마트스토어와 고객센터에서 확인해 주세요.',
    },
    en: {
      name: 'Cheong-i', sub: 'Gangjin Celadon GUKBO · AI Guide',
      bubble: 'Hi, I’m Cheong-i 🏺 Ask me anything',
      greet: 'Hello! I’m Cheong-i, the AI guide for Gangjin Celadon GUKBO 🏺 Want to know how celadon is made (10 steps, from 3-year aged clay to the 1300℃ second firing) or what the crane-and-cloud and inlay techniques mean? I can also help with prices, corporate gifts, shipping, and directions.',
      chips: ['How is celadon made?', 'What is sanggam inlay?', 'Price range?', 'Corporate gifts', 'Shipping & care', 'Where is the studio?'],
      placeholder: 'Type a message',
      send: 'Send', open: 'Ask Cheong-i', close: 'Close',
      typing: 'Cheong-i is thinking…',
      errNet: 'Connection problem. Please try again shortly, or call +82 10-3637-7583 (closed Sundays).',
      errRate: 'Too many messages. Please wait a moment.',
      note: 'AI answers are for reference. Confirm prices and stock via the official store or by phone.',
    },
  }[LANG];

  // ── 스타일 (사이트 다크 팔레트: bg #111315 / jade #82A89F / gold #C4A97D / ink #F0EFEA) ──
  var CSS = ''
    + '#cw-root{--cw-bg:#181B1E;--cw-bg2:#111315;--cw-line:#24292C;--cw-ink:#F0EFEA;--cw-muted:#9BA09E;--cw-jade:#82A89F;--cw-jade-deep:#528277;--cw-gold:#C4A97D;--cw-user:#2A4A44;'
    + 'position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.55;color:var(--cw-ink)}'
    + '#cw-root *{box-sizing:border-box}'
    + '#cw-launch{position:relative;width:84px;height:84px;border:0;background:transparent;padding:0;cursor:pointer;display:block;filter:drop-shadow(0 8px 18px rgba(0,0,0,.45))}'
    + '#cw-launch:focus-visible{outline:2px solid var(--cw-gold);outline-offset:4px;border-radius:50%}'
    + '#cw-launch canvas{display:block;width:84px;height:84px;pointer-events:none}'
    + '#cw-fallback{width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#a7cdc2,#6fae9b 55%,#3f7a6b);display:flex;align-items:center;justify-content:center;font-size:40px;border:2px solid rgba(240,239,234,.35);animation:cw-bob 3s ease-in-out infinite}'
    + '@keyframes cw-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}'
    + '#cw-bubble{position:absolute;right:92px;bottom:26px;max-width:230px;background:var(--cw-ink);color:#1b1f21;padding:9px 12px;border-radius:14px 14px 4px 14px;font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s;pointer-events:none;white-space:nowrap}'
    + '#cw-bubble.show{opacity:1;transform:translateY(0);pointer-events:auto}'
    + '#cw-bubble:after{content:"";position:absolute;right:-6px;bottom:8px;border:6px solid transparent;border-left-color:var(--cw-ink);border-bottom:0}'
    + '#cw-panel{position:absolute;right:0;bottom:96px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 130px);background:var(--cw-bg);border:1px solid var(--cw-line);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .22s,transform .22s}'
    + '#cw-panel.open{opacity:1;transform:none;pointer-events:auto}'
    + '#cw-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--cw-bg2);border-bottom:1px solid var(--cw-line)}'
    + '#cw-head .cw-av{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#a7cdc2,#6fae9b 55%,#3f7a6b);display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}'
    + '#cw-head .cw-t{flex:1;min-width:0}'
    + '#cw-head .cw-n{font-weight:600;font-size:15px;letter-spacing:.02em}'
    + '#cw-head .cw-s{font-size:11px;color:var(--cw-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '#cw-close{border:0;background:transparent;color:var(--cw-muted);font-size:22px;line-height:1;cursor:pointer;padding:4px 6px;border-radius:8px}'
    + '#cw-close:hover,#cw-close:focus-visible{color:var(--cw-ink);background:var(--cw-line);outline:none}'
    + '#cw-msgs{flex:1;overflow-y:auto;padding:14px 12px 6px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth}'
    + '.cw-m{max-width:86%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-break:break-word;font-size:13.5px}'
    + '.cw-m.bot{align-self:flex-start;background:var(--cw-bg2);border:1px solid var(--cw-line);border-bottom-left-radius:4px}'
    + '.cw-m.user{align-self:flex-end;background:var(--cw-user);color:var(--cw-ink);border-bottom-right-radius:4px}'
    + '.cw-m.err{align-self:flex-start;background:rgba(158,51,36,.18);border:1px solid rgba(158,51,36,.5);border-bottom-left-radius:4px}'
    + '.cw-m a{color:var(--cw-gold);text-decoration:underline}'
    + '.cw-typing{align-self:flex-start;color:var(--cw-muted);font-size:12px;padding:2px 6px;display:flex;align-items:center;gap:6px}'
    + '.cw-typing i{width:5px;height:5px;border-radius:50%;background:var(--cw-jade);display:inline-block;animation:cw-dot 1.2s infinite}'
    + '.cw-typing i:nth-child(2){animation-delay:.2s}.cw-typing i:nth-child(3){animation-delay:.4s}'
    + '@keyframes cw-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}'
    + '#cw-chips{display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px 8px}'
    + '#cw-chips button{border:1px solid var(--cw-jade-deep);background:transparent;color:var(--cw-jade);border-radius:999px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit}'
    + '#cw-chips button:hover,#cw-chips button:focus-visible{background:var(--cw-jade-deep);color:var(--cw-ink);outline:none}'
    + '#cw-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--cw-line);background:var(--cw-bg2)}'
    + '#cw-in{flex:1;min-width:0;background:var(--cw-bg);border:1px solid var(--cw-line);color:var(--cw-ink);border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;resize:none;max-height:96px}'
    + '#cw-in:focus{outline:none;border-color:var(--cw-jade)}'
    + '#cw-send{border:0;background:var(--cw-jade-deep);color:var(--cw-ink);border-radius:12px;padding:0 16px;font-size:14px;cursor:pointer;font-family:inherit;flex:none}'
    + '#cw-send:hover,#cw-send:focus-visible{background:var(--cw-jade);outline:none;color:#111315}'
    + '#cw-send:disabled{opacity:.5;cursor:default}'
    + '#cw-note{font-size:10.5px;color:var(--cw-muted);padding:0 12px 8px;background:var(--cw-bg2)}'
    + '@media (max-width:480px){#cw-root{right:12px;bottom:12px}#cw-panel{position:fixed;left:0;right:0;bottom:0;width:100vw;max-width:100vw;height:100%;max-height:100dvh;border-radius:0;border:0}#cw-bubble{max-width:200px;white-space:normal}}'
    + '@media (prefers-reduced-motion:reduce){#cw-fallback,#cw-panel,#cw-bubble{animation:none;transition:none}}';

  // ── DOM 생성 ──
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children) children.forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  var style = el('style', { text: CSS });
  var root = el('div', { id: 'cw-root' });
  var bubble = el('div', { id: 'cw-bubble', text: T.bubble, role: 'status' });
  var launch = el('button', { id: 'cw-launch', type: 'button', 'aria-label': T.open, 'aria-expanded': 'false', 'aria-controls': 'cw-panel', title: T.open });

  var msgs = el('div', { id: 'cw-msgs', role: 'log', 'aria-live': 'polite', 'aria-label': T.name });
  var chips = el('div', { id: 'cw-chips' });
  var input = el('textarea', { id: 'cw-in', rows: '1', placeholder: T.placeholder, 'aria-label': T.placeholder, maxlength: '1000' });
  var sendBtn = el('button', { id: 'cw-send', type: 'submit', text: T.send, 'aria-label': T.send });
  var form = el('form', { id: 'cw-form' }, [input, sendBtn]);
  var closeBtn = el('button', { id: 'cw-close', type: 'button', 'aria-label': T.close, html: '&times;' });
  var head = el('div', { id: 'cw-head' }, [
    el('div', { 'class': 'cw-av', 'aria-hidden': 'true', text: '🏺' }),
    el('div', { 'class': 'cw-t' }, [el('div', { 'class': 'cw-n', text: T.name }), el('div', { 'class': 'cw-s', text: T.sub })]),
    closeBtn,
  ]);
  var panel = el('div', { id: 'cw-panel', role: 'dialog', 'aria-modal': 'false', 'aria-label': T.name + ' chat', 'aria-hidden': 'true' },
    [head, msgs, chips, form, el('div', { id: 'cw-note', text: T.note })]);

  root.appendChild(panel); root.appendChild(bubble); root.appendChild(launch);

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(root);
    initCharacter();
    setTimeout(function () { if (!isOpen) bubble.classList.add('show'); }, 4000);
    setTimeout(function () { bubble.classList.remove('show'); }, 14000);
  }

  // ── 대화 상태 ──
  var history = [];   // [{role:'user'|'model', text}]
  var isOpen = false, busy = false, greeted = false;

  function linkify(text) {
    // 텍스트 → 안전한 HTML (escape 후 URL/경로/전화번호만 링크)
    var esc = text.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    esc = esc.replace(/\*\*(.+?)\*\*/g, '$1'); // 모델이 굵게 표시를 써도 기호 제거
    esc = esc.replace(/(https?:\/\/[^\s<)]+|(?:smartstore\.naver\.com|art1987\.kr)\/[^\s<)]*)/g, function (u) {
      var href = /^https?:/.test(u) ? u : 'https://' + u;
      return '<a href="' + href + '" target="_blank" rel="noopener">' + u + '</a>';
    });
    esc = esc.replace(/(^|[\s(（])(\/(?:index|works|tableware|products|craft|plaque|gift|buy|guide|en)\.html)/g, '$1<a href="$2">$2</a>');
    esc = esc.replace(/(010-\d{4}-\d{4})/g, '<a href="tel:$1">$1</a>');
    return esc;
  }

  function addMsg(text, who) {
    var m = el('div', { 'class': 'cw-m ' + who });
    if (who === 'user') m.textContent = text; else m.innerHTML = linkify(text);
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  var typingEl = null;
  function showTyping(on) {
    if (on && !typingEl) {
      typingEl = el('div', { 'class': 'cw-typing', 'aria-label': T.typing }, [el('i'), el('i'), el('i'), el('span', { text: T.typing })]);
      msgs.appendChild(typingEl); msgs.scrollTop = msgs.scrollHeight;
    } else if (!on && typingEl) { typingEl.remove(); typingEl = null; }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true;
    addMsg(text, 'user');
    input.value = ''; autosize();
    showTyping(true);
    var payload = { message: text, history: history.slice(-HISTORY_MAX) };
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (o) {
        showTyping(false);
        if (o.j && o.j.ok && o.j.text) {
          addMsg(o.j.text, 'bot');
          history.push({ role: 'user', text: text }, { role: 'model', text: o.j.text });
          if (history.length > HISTORY_MAX * 2) history = history.slice(-HISTORY_MAX * 2);
        } else {
          addMsg(o.status === 429 ? T.errRate : ((o.j && o.j.error) || T.errNet), 'err');
        }
      })
      .catch(function () { showTyping(false); addMsg(T.errNet, 'err'); })
      .then(function () { busy = false; sendBtn.disabled = false; input.focus(); });
  }

  function open() {
    isOpen = true; panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
    launch.setAttribute('aria-expanded', 'true'); bubble.classList.remove('show');
    if (!greeted) { greeted = true; addMsg(T.greet, 'bot'); }
    setTimeout(function () { input.focus(); }, 200);
    if (character) character.setHappy();
  }
  function close() {
    isOpen = false; panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
    launch.setAttribute('aria-expanded', 'false'); launch.focus();
  }

  launch.addEventListener('click', function () { isOpen ? close() : open(); });
  bubble.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(input.value); }
  });
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(96, input.scrollHeight) + 'px'; }
  input.addEventListener('input', autosize);
  T.chips.forEach(function (q) {
    var b = el('button', { type: 'button', text: q });
    b.addEventListener('click', function () { send(q); });
    chips.appendChild(b);
  });

  // ── 3D 캐릭터 (Three.js) ──
  var character = null;

  function showFallback() {
    launch.innerHTML = '';
    launch.appendChild(el('div', { id: 'cw-fallback', 'aria-hidden': 'true', text: '🏺' }));
  }

  function loadThree(cb) {
    if (window.THREE) return cb(true);
    var s = document.createElement('script');
    s.src = THREE_URL; s.async = true;
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(false); } }, 8000);
    s.onload = function () { if (!done) { done = true; clearTimeout(timer); cb(!!window.THREE); } };
    s.onerror = function () { if (!done) { done = true; clearTimeout(timer); cb(false); } };
    document.head.appendChild(s);
  }

  function initCharacter() {
    showFallback(); // CDN 로딩 중에도 빈 자리가 없도록 먼저 이모지
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    loadThree(function (ok) {
      if (!ok) return; // 🏺 이모지 유지
      try { character = buildCharacter(window.THREE, reduced); }
      catch (e) { character = null; showFallback(); }
    });
  }

  function buildCharacter(THREE, reduced) {
    var SIZE = 84, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(DPR); renderer.setSize(SIZE, SIZE);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true');
    launch.innerHTML = ''; launch.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.35, 6.2); camera.lookAt(0, 0.1, 0);

    scene.add(new THREE.HemisphereLight(0xdff5ee, 0x1c2a27, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 3); scene.add(key);
    var rim = new THREE.DirectionalLight(0xc4a97d, 0.7); rim.position.set(-3, 1, -2); scene.add(rim);

    var group = new THREE.Group(); scene.add(group);

    // 매병(梅甁) 실루엣: 좁은 입 → 넓은 어깨 → 잘록한 허리 → 굽
    var pts = [];
    var profile = [[0, -1.35], [0.55, -1.35], [0.62, -1.25], [0.66, -0.9], [0.78, -0.4], [0.92, 0.05], [0.98, 0.45], [0.92, 0.82], [0.72, 1.05], [0.42, 1.18], [0.36, 1.32], [0.38, 1.42], [0.30, 1.44], [0, 1.44]];
    profile.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    var bodyGeo = new THREE.LatheGeometry(pts, 48);
    var jade = new THREE.MeshPhysicalMaterial({
      color: 0x6fae9b, roughness: 0.35, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.15,
      sheen: 0.4, sheenColor: new THREE.Color(0xb9e0d4),
    });
    var body = new THREE.Mesh(bodyGeo, jade); group.add(body);

    // 상감 운학문 느낌의 흰 띠 두 줄 (백토 상감을 단순화)
    var band = new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 0.6 });
    var b1 = new THREE.Mesh(new THREE.TorusGeometry(0.985, 0.022, 8, 64), band); b1.rotation.x = Math.PI / 2; b1.position.y = 0.45; group.add(b1);
    var b2 = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.02, 8, 64), band); b2.rotation.x = Math.PI / 2; b2.position.y = -0.95; group.add(b2);

    // 얼굴: 눈 2개(흰자+검은자) + 미소(토러스 조각)
    var face = new THREE.Group(); group.add(face);
    var white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    var black = new THREE.MeshStandardMaterial({ color: 0x1b1f21, roughness: 0.5 });
    var eyes = [];
    [-0.3, 0.3].forEach(function (x) {
      var eg = new THREE.Group();
      var w = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), white);
      var p = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), black); p.position.set(0.02, 0, 0.005);
      var hi = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), white); hi.position.set(0.05, 0.04, 0.01);
      eg.add(w); eg.add(p); eg.add(hi);
      // 어깨 곡면 위에 배치 (반지름 ~0.95, y≈0.35)
      var ang = Math.asin(x / 0.95);
      eg.position.set(Math.sin(ang) * 0.96, 0.35, Math.cos(ang) * 0.96);
      eg.rotation.y = ang;
      face.add(eg); eyes.push(eg);
    });
    var smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 32, Math.PI), black);
    smile.rotation.z = Math.PI; smile.position.set(0, 0.0, 0.985); face.add(smile);
    var cheek = new THREE.MeshStandardMaterial({ color: 0xe8a598, roughness: 0.7, transparent: true, opacity: 0.55 });
    [-0.5, 0.5].forEach(function (x) {
      var c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), cheek);
      var ang = Math.asin(x / 0.97); c.position.set(Math.sin(ang) * 0.975, 0.1, Math.cos(ang) * 0.975); c.rotation.y = ang; face.add(c);
    });

    group.scale.setScalar(0.95);

    // ── 애니메이션 상태 ──
    var t0 = performance.now(), hovered = false, happyUntil = 0, blinkAt = t0 + 2500, blinkDur = 140, running = true;
    launch.addEventListener('mouseenter', function () { hovered = true; });
    launch.addEventListener('mouseleave', function () { hovered = false; });
    launch.addEventListener('focus', function () { hovered = true; });
    launch.addEventListener('blur', function () { hovered = false; });

    function frame(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      if (!reduced) {
        var target = hovered || now < happyUntil;
        // 기본: 천천히 회전 + 위아래 흔들림 / 호버: 정면 보며 좌우로 손 흔들듯 기울임
        group.position.y = Math.sin(t * 1.6) * 0.06;
        if (target) {
          group.rotation.y += (Math.sin(t * 9) * 0.28 - group.rotation.y) * 0.18;
          group.rotation.z += (Math.sin(t * 9) * 0.14 - group.rotation.z) * 0.18;
          group.position.y += Math.abs(Math.sin(t * 9)) * 0.05;
        } else {
          group.rotation.y += (Math.sin(t * 0.5) * 0.35 - group.rotation.y) * 0.05;
          group.rotation.z += (0 - group.rotation.z) * 0.1;
        }
        // 깜빡임: 2.5~5초마다 눈 세로 축소
        if (now >= blinkAt) {
          var k = (now - blinkAt) / blinkDur;
          var s = k < 1 ? Math.max(0.08, Math.abs(Math.cos(k * Math.PI))) : 1;
          eyes.forEach(function (e) { e.scale.y = s; });
          if (k >= 1) blinkAt = now + 2500 + Math.random() * 2500;
        }
      }
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    if (reduced) { renderer.render(scene, camera); }
    else requestAnimationFrame(frame);

    // 탭이 안 보일 때는 렌더 중단 (배터리 절약)
    document.addEventListener('visibilitychange', function () {
      var vis = !document.hidden;
      if (vis && !running && !reduced) { running = true; requestAnimationFrame(frame); }
      else if (!vis) running = false;
    });

    return { setHappy: function () { happyUntil = performance.now() + 1500; } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
