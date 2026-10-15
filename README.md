# WEED-Convergence-FLEXG-Paid-plan-HYESUN-2026-10

## 화면설계서 정적 프로토타입

좌측 인덱스 / 가운데 화면 / 우측 화면설명 3단 구성의 정적 프로토타입이며, 가운데 화면 위에 협의용 스티커 메모를 붙이고 지울 수 있습니다.

### 실행 방법

```
node server.js
```

이후 브라우저에서 `http://localhost:4000` 으로 접속합니다. (포트는 `PORT` 환경변수로 변경 가능합니다.)

### 구조

- `public/*.html` : 화면별 프로토타입 (`P-01`, `P-02`, `SA-01`)
- `public/style.css` : 공통 레이아웃/컴포넌트 스타일
- `public/sticky-notes.css`, `public/js/sticky-notes.js` : 스티커 메모 기능
- `public/js/screens.js` : 좌측 인덱스에 표시할 화면 목록
- `public/js/notes-store.js` : 메모 API 호출 및 10초 주기 폴링
- `public/js/layout.js` : 좌측 인덱스 / 우측 화면설명·남은 메모 패널 렌더링
- `server.js` : 정적 파일 제공 + 메모 API (`GET/POST/PATCH/DELETE /api/notes`)
- `data/notes.json` : 메모 저장 파일 (화면별 샘플 메모 포함)

새 화면을 추가할 때는 `public/js/screens.js`의 목록에 항목을 추가하고, 동일한 3단 구성의 HTML 파일을 `public/`에 만들면 됩니다.
