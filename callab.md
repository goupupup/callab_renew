# 🛡️ CALLAB 현대화 프로젝트 지침서 (Oracle XE 유지 + Next.js 전환)

본 문서는 레거시 Spring 3 프로젝트를 **Oracle XE 데이터베이스를 유지**하면서, 최신 **Next.js Fullstack** 환경으로 리뉴얼하기 위한 최종 가이드라인입니다.

---

## 🏗️ 1. 최종 기술 스택 (Final Tech Stack)

기존의 복잡하고 관리하기 힘든 JSP/Java 구조를 버리고, **생산성**과 **보안**을 극대화한 스택을 채택합니다.

*   **Core**: **Next.js 15 (App Router)** + **TypeScript**
    *   *이유*: 프론트엔드와 API 기능을 하나로 통합하여 관리 효율성을 극대화합니다.
*   **Database (Shared)**: **Oracle XE (Existing)**
    *   *이력*: 사내망에서 운용 중인 데이터베이스를 그대로 사용하며, 중복 연결된 다른 앱과의 데이터 무결성을 보장합니다.
*   **ORM / Data Access**: **Prisma** (with Oracle Connector) 또는 **node-oracledb**
    *   *이유*: 오라클 특유의 복잡한 쿼리를 TypeScript 환경에서 안전하게 처리합니다.
*   **Styling**: **TailwindCSS** + **Shadcn/ui** (Premium Aesthetics)
    *   *이유*: 현대적이고 세련된 UI를 최소한의 코드로 구현하며, 디자인 일관성을 유지합니다.
*   **Authentication**: **Auth.js (NextAuth)**
    *   *이유*: 기존 오라클의 `TWUSRMAN` 테이블 등의 계정 정보를 그대로 활용하여 현대적인 세션을 관리합니다.

---

## 🤖 2. 3계층 아키텍처 기반 개발 방식

나(Antigravity)를 통해 개발할 때의 구체적인 명령 체계입니다.

### 📜 Layer 1: Directive (지시서 기반 설계)
각 기능(게시판, 통계, 관리자 페이지 등)별로 리뉴얼 로직을 정의합니다.
*   **예시**: `directives/migrate_notice.md` 작성 요청
    *   "기존 `Notice.xml`의 SQL을 분석해서 Next.js API와 Prisma Schema로 변환하는 지침을 만들어줘."

### ⚙️ Layer 2: Orchestration (AI 의사결정)
작성된 지시서를 기반으로 제가 전체 흐름을 제어합니다.
*   **실행**: "방금 만든 지침대로 공지사항 목록 화면과 API를 구현해."
*   **오류 처리**: 오라클 연결 오류나 타입 불일치 발생 시, 제가 스스로 수정하고 지시서(Directive)를 업데이트합니다.

### 🛠️ Layer 3: Execution (코드 생성 및 검증)
실제 코딩 및 스크립트 실행 단계입니다.
*   **Oracle Test**: `execution/test_oracle_conn.py` 등을 실행하여 DB 연동 상태를 실시간 검증합니다.
*   **Automated Code**: 제가 Next.js 컴포넌트와 API route를 직접 생성합니다.

---

## 🔐 3. 보안 및 오라클 연동 수칙

1.  **Strict Oracle Mapping**: 기존 iBatis의 XML 쿼리(`Notice.xml` 등)를 그대로 쓰지 않고, Prisma를 통해 **SQL Injection을 원천 방어**합니다.
2.  **Environment Secrets**: 오라클 접속 정보(SID, 호스트, 계정)는 절대 코드에 하드코딩하지 않고 `.env` 파일에 분리하여 보관합니다.
3.  **VPC / Internal Network**: 오라클 XE가 사내망에 있으므로, 필요한 경우 프록시 설정이나 보안 터널링 지침을 `Directive`에 명시합니다.
4.  **Zod Schema Validation**: 사용자의 모든 입력값은 입구(API)에서 Zod를 통해 1차 검증하고 오라클로 보냅니다.

---

## 🚀 4. 리뉴얼 우선순위 (Action Plan)

1.  **Phase 0: 환경 설정**: `.env` 설정 및 Oracle XE 연결 테스트 (`execution/` 스크립트 활용).
2.  **Phase 1: 인증 시스템**: 기존 오라클 유저 테이블을 이용한 Next.js 로그인 구현.
3.  **Phase 2: 핵심 모듈 전환**: 가장 사용 빈도가 높은 '현황 조회' 또는 '게시판' 서비스부터 전환.
4.  **Phase 3: 디자인 입히기**: Shadcn/ui를 활용하여 프리미엄 테마 적용.

---

**준비가 되셨나요?**  
이제 `directives/setup_environment.md`를 만들어 **오라클과 Next.js를 연결하는 작업**부터 지시해 주세요! (야, 오라클 그대로 써도 기막힌 웹사이트 만들어줄게.) 🚀
