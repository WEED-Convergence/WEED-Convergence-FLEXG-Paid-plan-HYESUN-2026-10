# WEED-Convergence-FLEXG-Paid-plan-HYESUN-2026-10

## 화면설계서 정적 프로토타입

좌측 인덱스 / 가운데 화면 / 우측 화면설명 3단 구성의 정적 프로토타입이며, 가운데 화면 위에 협의용 스티커 메모를 붙이고 지울 수 있습니다.

이 프로젝트는 Vercel 배포를 전제로 합니다. 메모 API는 Vercel 서버리스 함수 + Vercel Blob에 저장되므로, 순수 `node` 단독 실행으로는 API가 동작하지 않습니다.

### 로컬 실행 방법

```
vercel dev
```

(`vercel dev`를 실행합니다. 최초 1회는 `vercel link`로 이 저장소를 Vercel 프로젝트에 연결하고, `vercel env pull`로 `.env.local`에 `BLOB_READ_WRITE_TOKEN`을 받아와야 합니다.) 이후 안내되는 주소로 접속합니다.

### 배포

GitHub 저장소를 Vercel 프로젝트에 연결해두면 `main` 브랜치에 푸시할 때마다 자동 배포됩니다. 별도 빌드 설정은 필요 없습니다.

### 구조

- `public/*.html` : 화면별 프로토타입 (`P-01`, `P-02`, `SA-01`)
- `public/style.css` : 공통 레이아웃/컴포넌트 스타일
- `public/sticky-notes.css`, `public/js/sticky-notes.js` : 스티커 메모 기능
- `public/js/screens.js` : 좌측 인덱스에 표시할 화면 목록
- `public/js/notes-store.js` : 메모 API 호출 및 10초 주기 폴링
- `public/js/layout.js` : 좌측 인덱스 / 우측 화면설명·남은 메모 패널 렌더링
- `api/notes/index.js` : 메모 목록 조회(`GET`)·추가(`POST`) 서버리스 함수
- `api/notes/[id].js` : 메모 수정(`PATCH`)·삭제(`DELETE`) 서버리스 함수
- `lib/notes-blob.js` : Vercel Blob 기반 메모 저장/조회 공통 로직, 화면별 샘플 메모 시드
- `vercel.json` : 루트 경로(`/`)를 `P-01` 화면으로 연결하는 리라이트

새 화면을 추가할 때는 `public/js/screens.js`의 목록에 항목을 추가하고, 동일한 3단 구성의 HTML 파일을 `public/`에 만들면 됩니다.
