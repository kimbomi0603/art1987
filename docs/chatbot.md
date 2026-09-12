# AI 안내 도우미 '청이' — 설치·운영 안내

## 무엇이 추가되었나

| 파일 | 역할 |
|---|---|
| `api/chat.js` | Vercel 서버리스 함수. 질문을 받아 Gemini(2.5-flash → 2.5-flash-lite)에 묻고, 실패하면 Groq(gpt-oss-120b → llama-3.3-70b)로 넘어간다. 사이트 내용을 정리한 지식 베이스가 코드 안에 들어 있다. |
| `chat-widget.js` | 모든 페이지 우하단에 뜨는 3D 청자 캐릭터(Three.js)와 채팅창. CDN이 막히면 🏺 이모지로 대체된다. |
| `vercel.json` | 보안 헤더(nosniff, frame-ancestors 'self') |
| `*.html` (10개) | `</body>` 앞에 `<script src="/chat-widget.js" defer></script>` 한 줄 추가. `en.html`은 `data-lang="en"` 이 붙어 영어로 인사한다. |
| `docs/chatbot.md` | 이 문서 |

봇 성격: 존댓말, 짧고 정확하게. 사이트에 없는 내용은 모른다고 하고 고객센터 010-3637-7583 / 스마트스토어 smartstore.naver.com/beechuree 를 안내한다. 사용자가 영어로 물으면 영어로 답한다.

## Vercel 환경변수 (반드시 설정)

Vercel 프로젝트 → Settings → Environment Variables

| 이름 | 값 | 비고 |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio에서 발급 | 1순위 |
| `GROQ_API_KEY` | console.groq.com에서 발급 | Gemini 실패 시 대체 |

둘 중 하나만 있어도 동작한다. 둘 다 없으면 봇이 "아직 준비되지 않았습니다" 라고 답한다. 환경변수를 넣은 뒤에는 **재배포**해야 반영된다.

## 테스트

배포 후 터미널에서:

```
curl -X POST https://art1987.kr/api/chat -H 'content-type: application/json' -d '{"message":"청자 가격"}'
```

정상이면 `{"ok":true,"model":"gemini-2.5-flash","text":"..."}` 형태로 온다.
`ok:false` 이면 `error` 문구를 보고, Vercel 대시보드 → Functions 로그에서 `[chat] all providers failed:` 줄을 확인한다(모델명과 HTTP 상태만 기록되고 키는 남지 않는다).

브라우저 테스트: 아무 페이지나 열어 4초 뒤 말풍선이 뜨는지, 캐릭터를 눌러 채팅창이 열리는지, 칩(예: "청자 가격대는?")을 눌러 답이 오는지 확인.

## 지식 베이스 수정

가격·영업시간 등이 바뀌면 `api/chat.js` 상단의 `KNOWLEDGE` 문자열을 고치고 배포한다. HTML 페이지만 고치면 봇은 모른다.

## 제한·주의

- 속도제한(분당 20회/IP)은 서버리스 인스턴스마다 따로 센다. 실제 한도는 더 느슨할 수 있다. 강하게 막으려면 Upstash 등 외부 저장소가 필요하다.
- 허용 출처: art1987.kr, www.art1987.kr, *.vercel.app, localhost. 도메인이 바뀌면 `api/chat.js`의 `ALLOWED_ORIGINS` 수정.
- AI 답변은 참고용이다. 채팅창 하단에 그 문구가 항상 표시된다.
