# CALLAB RENEWAL (교정 관리 시스템 리뉴얼)

이 프로젝트는 기존 교정 관리 시스템을 최신 웹 기술 스택(Next.js, Tailwind CSS)으로 리뉴얼하는 프로젝트입니다.

## 🚀 시작하기

먼저, 개발 서버를 실행합니다:

```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
# 또는
bun dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

`src/app/page.tsx`를 수정하여 페이지 편집을 시작할 수 있습니다. 파일을 수정하면 페이지가 자동으로 업데이트됩니다.

## 🛠 기술 스택

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: Oracle Database (oracledb)
- **Icons**: Lucide React
- **Authentication**: NextAuth.js

## 📂 주요 구조

- `src/app/dashboard`: 메인 대시보드 및 검색 UI
- `src/app/api`: Oracle DB 연동을 위한 백엔드 API 엔드포인트
- `src/lib/db.ts`: 데이터베이스 연결 유틸리티

## 컴포넌트별 가이드
- 테이블: 헤더에는 모두 sorting 기능이 있어야한다.
- [01]Required 와 같은 format 으로 표시되는 부분들은 대괄호 안의 값만 SQL Query에 반영해야한다.

## SQL SELECT 규칙
- TBMASMAN 테이블의 ISID 는 모두 TRIM 처리 후 검색한다.
- TBCALMAN 테이블의 ISID 는 모두 TRIM 처리 후 검색한다.
- 날짜관련컬럼은 모두 TO_CHAR로 YYYYMMDD format으로 변환 후 검색되어야한다.
- 직원정보 (TAxxxx or Txxxxx) 에 해당하는 코드는 TBEMPMAN 를 참조해서 '[EMID]EMNM' 형식으로 반환한다.
- CAL TYPE, CAL MODE 는 '[CODE]DESN' 형식으로 반환한다. 
- 검색되는 업체코드(cust, mnfc, coid) 는 모두 TBSUPMAN 의 CONM을 Trim해서 반환한다.


---

상세한 아키텍처 정보는 [ARCHITECTURE.md](./ARCHITECTURE.md)를, AI 에이전트 가이드는 [Agent.md](./Agent.md)를 참조하세요.
