# 길 GIL — 한국 관광정보 사이트

Next.js App Router · TypeScript · 요청별 서버 사이드 렌더링(SSR).

## 실행

Node.js 20.9 이상에서 실행합니다.

```sh
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다. PowerShell 실행 정책이 npm.ps1을 차단하면 `npm.cmd`를 사용하세요.

제공된 키는 `.env.local`에 설정되어 있습니다. 새 환경에서는 `.env.example`을 `.env.local`로 복사하고 `TOUR_API_KEY`를 입력하세요. 인코딩된 키와 원본 키 모두 지원하며 키는 서버에서만 사용됩니다. `.env.local`은 버전 관리에서 제외됩니다.

```sh
npm run typecheck
npm run build
npm start
```

## 기능 및 명세

- 지역, 관광 유형, 번체 키워드 검색 및 정렬, 페이지 이동
- 목록은 대표이미지가 있는 항목을 조회합니다. API 정렬 코드 O(이름순), Q(최근 업데이트순, 기본값), R(최근 등록순)를 사용하며 이미지 없는 항목은 결과와 전체 건수에서 제외됩니다.
- 관광지 상세 소개, 이용 안내, 이미지, 외부 지도 링크
- 모바일 대응, 키보드 탐색, 로딩·빈 결과·API 장애 화면
- `manual.docx` Ver4.4(2026-02-19) 기준 `ChtService2` 사용
- `areaBasedList2`, `searchKeyword2`, `ldongCode2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2` 연동
- 법정동 코드 `lDongRegnCd` 사용. 폐기된 `areaCode` 파라미터는 사용하지 않음
- 키워드 API는 관광 타입 파라미터를 지원하지 않으므로 키워드 검색 시 유형 필터 해제
- 목록과 상세는 `force-dynamic`, 데이터 요청은 `cache: 'no-store'`로 매 요청 서버에서 처리
- 키가 포함된 API URL이나 원본 오류 메시지를 브라우저에 전달하지 않음
- 사이트 UI, 접근성 안내, 메타데이터는 중문 번체이며 페이지 언어는 `zh-Hant`입니다. API 데이터는 번체 원문을 사용하며 원문에 포함된 공식 고유명사는 유지합니다.
- 개발계정 호출 한도는 매뉴얼 기준 일 1,000회. 목록 화면 2회, 상세 최대 4회 호출

히어로 사진은 Unsplash 사진을 `public/korea-hero.jpg`에 저장해 사용하며, 관광지 사진은 API 제공 원본을 사용합니다. 외부 글꼴 또는 사진 연결이 불가능하면 대체 글꼴과 이미지 안내 화면이 표시됩니다. 이미지 사용 시 각 권리자의 이용 조건과 API의 공공누리 표시를 확인하세요.

SSR 문서: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic

## 검증

서버 실행 후 `node scripts/smoke.mjs`로 실제 API 검색·상세 SSR과 키 비노출을 확인합니다. `node scripts/browser-check.mjs`는 설치된 Microsoft Edge를 이용해 데스크톱·모바일 화면, 지역 검색과 상세 이동을 확인합니다. 스크린샷은 버전 관리에서 제외됩니다. 테스트는 실제 API 호출 한도를 사용합니다.

App Router의 스트리밍이 시작된 이후 존재하지 않는 상세 경로는 HTTP 200과 함께 오류 화면 및 `noindex` 메타데이터를 반환할 수 있습니다.
