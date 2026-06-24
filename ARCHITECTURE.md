# 아키텍처 가이드 (Architecture Guide)

이 문서는 CALLAB RENEWAL 프로젝트의 기술적 설계와 구조를 설명합니다.

## 🏛 프로젝트 개요

기존 Oracle 데이터베이스 기반의 노후화된 교정 관리 시스템을 최신 웹 기술 스택(Next.js)으로 리뉴얼하며, 사용자 경험(UX)과 데이터 관리 효율성 향상을 목표로 합니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: Next.js 15+ (App Router), Tailwind CSS
- **Backend API (Target)**: Python FastAPI REST API
- **Backend API (Current Transition State)**: Next.js API Routes
- **Database**: Oracle Database (EASYCAL 스키마 연동, 백엔드 서버에서만 접근)
- **UI Components**: Shadcn UI 기반 커스텀 컴포넌트
- **Icons**: Lucide React
- **Auth**: NextAuth.js (Oracle DB 기반 사용자 인증)

## 🎯 목표 아키텍처 (Frontend / Backend Split)

현재 구현은 Next.js API Routes가 Oracle DB와 FTP에 직접 연결하는 전환기 구조입니다. 운영 목표는 기존 회사 인프라와 맞춰 프론트엔드와 백엔드를 분리하는 것입니다.

```text
사용자(외부/사내망)
  -> 회사 도메인 / 회사 공인 IP
  -> Apache HTTPD
  -> Next.js Frontend
  -> FastAPI Backend API
  -> Oracle DB / FTP / Legacy Systems
```

- Next.js는 화면 렌더링과 API 호출 클라이언트만 담당합니다.
- FastAPI 백엔드는 인증, 권한, Oracle 조회/수정, FTP 파일 처리, 감사 로그를 담당합니다.
- 브라우저와 프론트엔드 서버에는 Oracle/FTP 접속 정보가 없어야 합니다.
- `/api/*` 요청은 Apache에서 FastAPI 백엔드로 프록시하고, 나머지 요청은 Next.js로 라우팅합니다.

백엔드 구현은 기존 시스템과 동일하게 Spring Boot로 맞출 필요는 없습니다. 현재 Oracle 레거시 스키마와 수작업 SQL이 많기 때문에, 1차 권장안은 `Python 3.11+ + FastAPI + Pydantic + python-oracledb Thick mode`입니다.

상세 전환 지침은 [directives/frontend_backend_split.md](./directives/frontend_backend_split.md)를 따릅니다.

## 📂 주요 폴더 구조 (Folder Structure)

```text
src/
├── app/                  # Next.js App Router (페이지 및 API)
│   ├── api/              # 백엔드 API 엔드포인트 (search, schedule 등)
│   ├── auth/             # 로그인 및 인증 관련 페이지
│   └── dashboard/        # 대시보드 및 검색 UI 핵심 폴더
│       ├── schedule/     # 교정 일정 캘린더 (DST 및 타임존 처리 포함)
│       └── search/       # 고급 검색 (History, Model, Ongoing 등)
├── components/           # 공통 UI 컴포넌트
├── lib/                  # 유틸리티 함수 (db.ts 연동 등)
└── types/                # TypeScript 공용 타입 정의
```

## 🔐 데이터베이스 연동 (Oracle DB)

- 전환기에는 `src/lib/db.ts`에서 `oracledb` 패키지를 사용합니다.
- 목표 구조에서는 FastAPI 백엔드만 Oracle에 직접 연결합니다.
- `EASYCAL` 스키마의 `TBMASMAN`, `TBCALMAN`, `TBSUPMAN` 등 기존 테이블은 백엔드 DTO로 감싸서 프론트엔드에 노출합니다.
- 복잡한 검색 로직은 백엔드 서비스/리포지토리 계층으로 이동합니다.

## ⚙️ 특이 사항 및 최적화

1.  **일정 시스템 (Schedule)**:
    - 일광 절약 시간제(DST)로 인한 날짜 밀림 현상을 방지하기 위해 `Math.round` 기반의 계산 로직을 사용합니다.
    - 서버와 클라이언트 간의 타임존 오차를 줄이기 위해 `parseLocalDate` 헬퍼와 `YYYY-MM-DD` 형식의 문자열 리터럴을 활용합니다.

2.  **고급 검색 (Advanced Search)**:
    - 대량의 데이터를 효율적으로 조회하기 위해 `SearchableDropdown` (콤보박스) 및 고밀도 UI 레이아웃을 적용했습니다.
    - `Master`, `User` 권한에 따른 데이터 노출 범위를 `isMaster` 플래그로 구분합니다.

---

본 아키텍처는 프로젝트의 성장에 따라 지속적으로 업데이트됩니다. 작업 전 반드시 [Agent.md](./Agent.md)를 함께 참조하세요.
