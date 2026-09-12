/**
 * /api/chat — 강진청자 국보 AI 안내 도우미 '청이' (Vercel Serverless Function, CommonJS)
 *
 * 요청:  POST  { message: string, history?: [{ role: 'user'|'model', text: string }] }
 * 응답:  { ok: true, model: string, text: string }  |  { ok: false, error: string }
 *
 * 처리 순서
 *   1) Origin 허용 목록 검사 → 2) IP별 간이 속도제한 → 3) 입력 검증
 *   4) Gemini(2.5-flash → 2.5-flash-lite) → 실패 시 Groq(gpt-oss-120b → llama-3.3-70b)
 *
 * 환경변수: GEMINI_API_KEY, GROQ_API_KEY  (Vercel 프로젝트 설정 → Environment Variables)
 * [위험] API 키는 절대 로그·응답에 포함하지 않는다. 오류 메시지도 상태코드만 남긴다.
 */

'use strict';

// ───────────────────────────── 지식 베이스 ─────────────────────────────
// 사이트 HTML(index/works/tableware/products/craft/plaque/gift/buy/guide/en)에서 추출한 사실만 담는다.
// 여기에 없는 내용은 모델이 지어내지 않도록 시스템 프롬프트에서 통제한다.
const KNOWLEDGE = `
[공방 개요]
- 상호: 강진청자 국보(國寶) — 주식회사 국보. (구)강진탐진청자. 고려청자 브랜드 「비취에 물들다」.
- 1987년 강진탐진청자로 창업, 2대째 가업 승계. 강진 유일의 청자 가업승계자 김보배 대표(작가).
- 흙(강진 청자토)을 3년 이상 재우고, 자연재료 무균열 청자유약을 입혀 1300℃ 환원소성. 티가 있는 것은 판매하지 않음.
- 강진은 국보·보물로 지정된 고려청자의 80% 이상이 만들어진 고려청자의 본향.
- 1인 공방이며 모든 공정에 김보배 작가의 손길이 들어감.

[위치·연락처·영업]
- 주소: 전라남도 강진군 대구면 청자촌길 20-16 (고려청자박물관 앞). 영문: 20-16 Cheongjachon-gil, Daegu-myeon, Gangjin-gun, Jeollanam-do, Korea.
- 현장: 갤러리 카페 「비취에 물들다」 (강진청자 체험&갤러리카페, 복합문화공간). 연중무휴(Open year-round)로 안내되나, 고객센터 전화는 일요일 휴무.
- '거시기 청자' 체험: 갤러리카페에서 마음에 드는 청자 잔을 직접 골라 음료를 마시고 그 잔을 그대로 가져가는 체험. (B급 청자를 살린 아이디어)
- 고객센터: 010-3637-7583 (+82 10-3637-7583), 일요일 휴무. 단체 주문·기업 선물·긴급 배송·작품 소장·감사패 의뢰 모두 이 번호.
- 공식 온라인 구매: 네이버 스마트스토어 「비취에 물들다」 smartstore.naver.com/beechuree (생활식기·굿즈 — 모란·푸딩 시리즈, 거시기 청자 기획전)
- 네이버 스마트스토어 「국보 공방」 smartstore.naver.com/craft_kb (달항아리·매병 등 작품·공예 라인)
- 기타 판매처: 초록믿음강진(강진군 농특산품 직거래 쇼핑몰, ☎ 061-433-8844), 두보닷컴(명인명품 전문몰 — 운학문 반상기·모란문 다기)
- 소량 구매는 스마트스토어, 단체·기업·감사패는 전화 문의.

[수상·언론]
- 2023 전국민화공모전 대상(문화체육관광부 장관상) — 김보배 대표, 작품 '곰봉산 동자신선들의 만찬'.
- 2024 중소벤처기업부 '강한 소상공인 성장지원사업' 전남 유일 선정.
- 2021 사회적기업가 육성사업 관광·로컬콘텐츠 특화분야 선정.
- 2014·2015 우수공예품 선정(청자 운학문 부부 반상기, 청자 옻칠 연잎형 다기).
- 보도: 에너지경제 2023.09, 식품외식경영 2024.10, 장강뉴스 2021.08.

[제작 공정 10단계]
01 소지 수비·토련(청자토 3년 이상 숙성) → 02 물레 성형 → 03 조각 → 04 상감(백토·자토를 메워 넣는 고려 기법) → 05 건조 → 06 초벌 → 07 시유(자연재료 무균열 청자유약) → 08 재벌 1300℃ → 09 선별 → 10 포장·발송(작가가 직접 선별·포장).

[작품 (works)]
- 김보배 作 매병·주병·달항아리 등 66점 갤러리. 대표작: 청자 상감 운학문 매병(30×52cm), 청자 상감 모란문 매병·주병 一對, 청자 상감 운학문 주병(28×51cm), 백자 달항아리, 순청자 달항아리, 청자 비룡형 주자, 투각 칠보문 향로, 옻칠 연잎형 다기 등.
- 문양 상징: 운학문(雲鶴文)=비상과 영속·지속 성장, 모란문(牡丹文)=부귀영화, 연화문(蓮花文)=청렴과 고결(공공기관·문화재단 수여에 적합).
- 모든 작품은 국·영문 작품 보증서와 함께 전달, 오동나무 함 각인 제작 가능. 작품 가격은 사이트에 없음 → 소장·도록 문의 010-3637-7583.

[제품·소품 컬렉션 (products) — 동일가 55,000원(부가세 포함), 국영문 보증서 동봉]
- 백자 달항아리 / 청자 달항아리: 국보 제262호 조선 백자 달항아리 미니어처. 0.5호(H8~9cm), 1호(H10~12cm) 각 55,000원. 1.5호~4호는 별도 문의. 크기 ±1~2cm 오차.
- 상감청자 운학문 매병 55,000원 / 상감청자 운학문 주병 55,000원 (단품, 국영문 보증서 동봉 가능)
- 청자 와인잔 「운학잔」 A·B타입 55,000원
- 운학문 실크 스카프·넥타이 각 55,000원 (낱개 구매 가능)
- 연잎형 청자 반상기 세트(대접 4점 + 크라프트 상자 + 남색 비단 보자기 + 작품보증서) 140,000원 부가세 별도(포함 154,000원)
- 연잎형 청자 다기 세트: 구성·가격 별도 문의
- 고려청자 운학문·국화문 자석 책갈피(각 4색, 25×65mm) 5,500원
- 청자 굿즈 에코백(니트 손목가방 2종) 10,000원

[생활식기 (tableware) — 전 41종, 식기세척기·전자레인지 사용 가능, 규격 ±5mm 오차]
▷ 모란 시리즈 (부귀영화 상징 모란꽃 문양의 대표 시리즈)
 세트: 모란 반상기세트 2인(밥공기2·국대접2) 70,000 / 소소 반상기(+찬기소2) 90,000 / 소중 반상기(찬기 소1·중1) 97,000 / 대중소 반상기(찬기 소·중·대 각1) 127,000 / 찬기세트(소·중·대) 57,000 / 접시세트(1호+2호) 132,000 / 뚜껑머그세트 2인 72,600 / 다기세트 2인(뚜껑2·거름망2·머그2) 92,600
 단품: 밥공기 15,000 / 국대접 20,000 / 찬기 소 10,000·중 17,000·대 30,000 / 접시 1호 55,000·2호 77,000 / 머그 26,300 / 뚜껑머그 36,300 / 1인다기(뚜껑·거름망·머그) 46,300
 규격(mm): 밥공기 Ø100×H60, 국대접 Ø130×H60, 찬기 소 Ø115×H29·중 Ø138×H32·대 Ø155×H36, 접시 1호 Ø235×H35·2호 Ø275×H35, 머그 Ø90×H95, 뚜껑 Ø100×H15, 거름망 Ø90×H65
▷ 푸딩 시리즈 (푸딩컵 닮은 부드러운 굽의 캐주얼 라인 — 브런치·디저트)
 세트: 푸딩 반상기세트 2인 70,000 / 소소 반상기 100,000 / 찬기세트(소스볼·찬기 소·중) 43,000 / 접시세트(S·M·L) 120,000
 단품: 밥공기 15,000 / 국대접 20,000 / 소스볼 8,000 / 찬기 소 15,000·중 20,000 / 머그 20,000 / 접시 S 30,000·M 40,000·L 50,000
 규격(mm): 밥공기 Ø104×H64, 국대접 Ø125×H64, 소스볼 Ø83×H48, 찬기 소 Ø114×H33·중 Ø130×H38, 머그 Ø84×H81, 접시 S Ø202×H23·M Ø229×H28·L Ø253×H33
▷ 구름·연꽃·매화 시리즈
 세트: 구름접시 세트 납작형/오목형(S+L) 각 110,000 / 연꽃 디저트볼 세트(3개) 99,000 / 매화꽃 수저(커트러리) 받침 세트(3개) 59,400
 단품: 오목구름·납작구름 접시 S 각 33,000, L 각 77,000 / 연꽃 디저트볼 33,000 / 당초문 코스터 26,400 / 매화꽃 커트러리 받침대 19,800
 규격(mm): 납작구름 S 150×110×15·L 280×210×25, 오목구름 S 135×103×23·L 270×206×32, 연꽃 디저트볼 Ø95×H70, 당초문 코스터 Ø138×H15, 매화꽃 받침 Ø110×H15
- 가격 단위는 원. 생활식기 가격은 사이트 표기 기준이며 스마트스토어 가격과 다를 수 있으니 최종 가격은 스마트스토어 확인 안내.

[감사패·상패 (plaque) — 1987년부터 주문 제작, 문안 각인 포함, 받침대 포함, 부가세 별도]
- 종류: 감사패·공로패·기념패·교회패·홀인원패. 문안을 보내주면 상감 청자에 새겨 구워 전달.
- 매병 감사패: 소 25cm 부분상감 12만원 / 전체상감 20만원 · 중 30cm 15만원 / 25만원 · 대 35cm 30만원 / 35만원 · 특대 40cm 전체상감 60만원 · 특대 42cm 전체상감 70만원
- 원형 감사패: 지름 23~24cm 7만원 · 지름 30cm 12만원
- 연잎형·직사각형·항아리형 등 다른 형태도 제작 가능. 제작 의뢰 010-3637-7583. 제작 기간은 사이트에 명시되지 않음 → 전화 문의.

[기업 선물 (gift) — 브레인파크 에디션]
- "통역이 필요 없는 선물" — 외국인 답례품으로 사랑받는 고려청자.
- 구성: 청자 소품 5종(백자 달항아리, 청자 달항아리, 상감청자 운학문 매병, 상감청자 운학문 주병, 운학잔 와인잔 A·B타입) + 실크 2종(스카프/넥타이), 동일가 55,000원(부가세 포함).
- 국·영문 진품 보증서 동봉, 보자기 포장 기본, 오동나무박스 +10,000원(상자 위 기업 로고·기념 문구 각인 가능).
- 의전 패키지 3단계: ① 전통 오동나무 함(桐木函) ② 작가 서명 국·영문 작품 보증서 ③ 전통 보자기 매듭 포장.
- 소액 기념품부터 의전용 대작까지 예산별 맞춤 구성. 예산·수량·일정을 주면 제작 가능 여부와 납기 회신, 단체 주문은 수량별 별도 견적. 결제·물량은 한꺼번에, 발송은 행사마다 나눠서 택배 가능.
- 포장: 보자기 포장 · 국보 종이박스(손잡이형).

[이용안내 (guide)]
- 포장: 기본 안전포장 종이박스 무료 / 보자기 포장 상자 크기별 5,000~10,000원 / 전통 오동나무박스 추가 10,000원
- 사용: 식기세척기·전자레인지 사용 가능. 가스레인지 등 직화 사용 불가. 부드러운 스펀지 세척 권장(금속 수세미 금지).
- 배송·교환: 1인 공방이라 화·수·목 요일별 집중 출고. 배송 중 파손 시 100% 즉시 재발송(수취 당일 연락 필요). 명절 전 혼잡기에는 미리 연락. 배송비·단순변심 환불 규정은 사이트에 명시되지 않음 → 스마트스토어 또는 전화 확인 안내.
- 용어: 청자 Celadon / 비색 Celadon Blue-Green(翠色) / 상감 Sanggam Inlay(象嵌) / 운학문 Cloud and Crane(雲鶴文) / 매병 Prunus Vase(梅瓶) / 주병 Wine Bottle(酒瓶) / 달항아리 Moon Jar / 무균열 Crack-free(無貫入) / 보자기 Bojagi / 낙관 Artist's seal(落款)

[사이트 페이지]
홈 /index.html · 제작 공정 /craft.html · 작품 /works.html · 제품·소품 /products.html · 감사패 /plaque.html · 생활식기 /tableware.html · 기업 선물 /gift.html · 이용안내 /guide.html · 구매·문의 /buy.html · English /en.html
`.trim();

const SYSTEM_PROMPT = `너는 '청이'다. 전남 강진 고려청자 공방 「강진청자 국보(비취에 물들다)」 홈페이지의 AI 안내 도우미다.
역할과 말투:
- 친절하고 정확하게, 짧게 답한다. 한국어 존댓말을 쓴다. 답변은 보통 2~5문장, 가격표 같은 목록이 필요할 때만 간단한 목록을 쓴다.
- 사용자가 영어·일본어·중국어 등 다른 언어로 물으면 그 언어로 답한다.
- 아래 [지식]에 있는 사실만 말한다. 지식에 없는 내용(재고, 제작 기간, 배송비, 할인, 사이트에 없는 가격 등)은 모른다고 솔직히 말하고, 고객센터 010-3637-7583(일요일 휴무) 또는 네이버 스마트스토어 smartstore.naver.com/beechuree 를 안내한다.
- 숫자·가격·이름을 지어내거나 바꾸지 않는다. 부가세 포함/별도 표기를 그대로 전한다.
- 관련 페이지가 있으면 경로(예: /tableware.html)를 한 번 알려준다.
- 청자와 무관한 질문(정치·의료·법률·코딩 등)은 정중히 사양하고 공방 안내로 돌아온다.
- 마크다운 표는 쓰지 않는다. 굵게 표시(**)는 쓰지 않는다. 이모지는 🏺 정도만 가끔 쓴다.

[지식]
${KNOWLEDGE}`;

// ───────────────────────────── 설정 ─────────────────────────────
const ALLOWED_ORIGINS = ['https://art1987.kr', 'https://www.art1987.kr'];
const MAX_MESSAGE_LEN = 1000;
const MAX_HISTORY = 12;          // 서버에서 한 번 더 자른다 (위젯은 8개 전송)
const RATE_LIMIT = 20;           // 분당 요청 수
const RATE_WINDOW_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 25 * 1000;

// [위험] 인메모리 속도제한은 서버리스 인스턴스마다 따로 유지된다.
// 인스턴스가 여러 개 뜨면 실제 한도는 20/min × 인스턴스 수가 된다. 강한 제한이 필요하면 Upstash/KV 등 외부 저장소로 바꿔야 한다.
const rateMap = new Map();

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl 등 Origin 없는 요청(서버 간·테스트) 허용. 브라우저는 항상 Origin을 보낸다.
  try {
    const u = new URL(origin);
    if (ALLOWED_ORIGINS.includes(u.origin)) return true;
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch (_) { /* 잘못된 Origin → 거부 */ }
  return false;
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkRate(ip) {
  const now = Date.now();
  // 가끔 오래된 항목 정리 (메모리 누수 방지)
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now - v.start > RATE_WINDOW_MS) rateMap.delete(k);
  }
  const rec = rateMap.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  rec.count += 1;
  return rec.count <= RATE_LIMIT;
}

// body가 문자열/버퍼로 올 수도 있어 방어적으로 파싱
function parseBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  try { return JSON.parse(Buffer.isBuffer(b) ? b.toString('utf8') : String(b)); }
  catch (_) { return null; }
}

// history 정규화: role은 user|model만, text는 문자열, 길이 제한
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const h of history) {
    if (!h || typeof h.text !== 'string') continue;
    const role = h.role === 'model' || h.role === 'assistant' ? 'model' : h.role === 'user' ? 'user' : null;
    if (!role) continue;
    const text = h.text.trim().slice(0, MAX_MESSAGE_LEN);
    if (!text) continue;
    out.push({ role, text });
  }
  return out.slice(-MAX_HISTORY);
}

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ───────────────────────────── Gemini ─────────────────────────────
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

async function callGemini(model, message, history, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const contents = history.map((h) => ({ role: h.role, parts: [{ text: h.text }] }));
  contents.push({ role: 'user', parts: [{ text: message }] });
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 700,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    // [위험] 키는 헤더로만 전달. URL 쿼리에 붙이면 로그에 남을 수 있어 피한다.
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  }, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`gemini ${model} http ${res.status}`);
  const data = await res.json();
  const cand = data && data.candidates && data.candidates[0];
  const text = cand && cand.content && cand.content.parts
    ? cand.content.parts.map((p) => p.text || '').join('').trim()
    : '';
  if (!text) throw new Error(`gemini ${model} empty (${(cand && cand.finishReason) || 'no candidate'})`);
  return text;
}

// ───────────────────────────── Groq (폴백) ─────────────────────────────
const GROQ_MODELS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'];

async function callGroq(model, message, history, apiKey) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const h of history) messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text });
  messages.push({ role: 'user', content: message });
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'User-Agent': 'Mozilla/5.0 art1987',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 700 }),
  }, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`groq ${model} http ${res.status}`);
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '').trim() : '';
  if (!text) throw new Error(`groq ${model} empty`);
  return text;
}

// ───────────────────────────── 핸들러 ─────────────────────────────
module.exports = async (req, res) => {
  const origin = req.headers.origin;
  const originOk = isAllowedOrigin(origin);

  // CORS: 허용된 Origin만 echo. 같은 도메인(art1987.kr) 호출은 CORS 헤더가 없어도 동작한다.
  if (originOk && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') { res.statusCode = originOk ? 204 : 403; return res.end(); }
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.json({ ok: false, error: 'POST만 지원합니다.' }); }
  if (!originOk) { res.statusCode = 403; return res.json({ ok: false, error: '허용되지 않은 출처입니다.' }); }

  if (!checkRate(clientIp(req))) {
    res.statusCode = 429;
    res.setHeader('Retry-After', '60');
    return res.json({ ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
  }

  const body = parseBody(req);
  if (!body) { res.statusCode = 400; return res.json({ ok: false, error: 'JSON 본문이 올바르지 않습니다.' }); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) { res.statusCode = 400; return res.json({ ok: false, error: 'message가 비어 있습니다.' }); }
  if (message.length > MAX_MESSAGE_LEN) { res.statusCode = 400; return res.json({ ok: false, error: `메시지는 ${MAX_MESSAGE_LEN}자 이내로 보내주세요.` }); }
  const history = sanitizeHistory(body.history);

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) {
    // [위험] 키 미설정 — 배포 후 Vercel 환경변수를 반드시 확인
    res.statusCode = 503;
    return res.json({ ok: false, error: '안내 도우미가 아직 준비되지 않았습니다. 고객센터 010-3637-7583으로 문의해 주세요.' });
  }

  const failures = []; // 모델명 + HTTP 상태만 기록. 키·본문은 남기지 않는다.

  if (geminiKey) {
    for (const m of GEMINI_MODELS) {
      try {
        const text = await callGemini(m, message, history, geminiKey);
        return res.json({ ok: true, model: m, text });
      } catch (e) { failures.push(e && e.message ? e.message : String(e)); }
    }
  }
  if (groqKey) {
    for (const m of GROQ_MODELS) {
      try {
        const text = await callGroq(m, message, history, groqKey);
        return res.json({ ok: true, model: m, text });
      } catch (e) { failures.push(e && e.message ? e.message : String(e)); }
    }
  }

  console.error('[chat] all providers failed:', failures.join(' | '));
  res.statusCode = 502;
  return res.json({
    ok: false,
    error: '지금은 답변을 드리기 어렵습니다. 잠시 후 다시 시도하시거나 고객센터 010-3637-7583(일요일 휴무)으로 문의해 주세요.',
  });
};
