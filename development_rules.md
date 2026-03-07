# 개발 규칙 및 기술 가이드라인 (Development Rules)

본 문서는 Callab Renewal 프로젝트의 일관된 개발과 유지보수를 위해 정의된 주요 기술 규칙 및 비즈니스 로직을 정리합니다.

## 1. 데이터 표시 및 포맷팅 (Data Formatting)

### 날짜 포맷 (Date Format)
- **표시 형식**: `MMM-DD-YYYY` (예: `Mar-15-2026`)
- **예외 처리**: 데이터가 `null`, `undefined`, `0`, `00000000`, 또는 길이가 8자가 아닌 비정상적인 값인 경우 **`---`**로 표시합니다. (UI 및 엑셀 공통 적용)

### 테이블 정렬 (Table Sorting)
- **HCT No (Reg No)**: 내부적으로 숫자를 추출하여 **수치 정렬(Numeric Sort)**을 수행합니다. (오라클 `REGEXP_REPLACE` 및 `TO_NUMBER` 활용)
- **Cal Date (최종 교정일)**: 날짜순 정렬을 수행하며, 빈 값이나 `0`인 데이터는 가장 과거(`00000000`)로 처리하여 정렬 시 하단에 배치됩니다.
- **Next Cal (차기 교정일)**: 날짜순 정렬을 수행하며, 빈 값이나 `0`인 데이터는 정렬 시 가장 하단(Far future `99991231`)에 배치되도록 처리합니다.
- **Model / Serial**: 문자열(String) 기준으로 오름차순/내림차순 정렬을 수행합니다.

---

## 2. FTP 연동 및 파일 다운로드 (FTP & File Download)

### 디렉토리 구조
- **데이터 파일 (Data File)**: `/HCT_CALLAB/gear/` (IIS 가상 디렉토리 절대 경로)
- **성적서 (Report PDF)**: `/report/report_cust_pdf/{year}/`

### 탐색 및 다운로드 규칙
- **다중 확장자 지원**: 데이터 파일 조회 시 `xlsx`, `zip`, `txt` 확장자를 순차적으로 자동 탐색합니다.
- **다운로드 파일명 규칙**:
    - **형식**: `{AssetNo} - {Year}_{CalNo}_{HCTNo}.{Extension}`
    - **예시**: `11408153 - 2025_HA2025C002971_3573.xlsx`
- **파일명 인코딩**: 브라우저 다운로드 시 공백이 `%20`으로 깨지지 않도록 `Content-Disposition` 헤더에서 따옴표(`"`)를 활용해 원문 보존 처리를 합니다.

---

## 3. 권한 및 보안 제어 (Access Control)

### 사용자 역할 (Roles)
- **MASTER (HCT 관리자)**: 모든 고객사 장비 데이터 검색 및 관리 가능. 검색 필터에서 `Company` 필드 사용 가능.
- **GENERAL (고객사)**: 소속 회사(`corpId`) 데이터로만 접근 제어. 보안을 위해 `Company` 검색 필터 노출을 제한함.

### 데이터 무결성
- 오라클 DB 조회 시 `ISID`, `ACCN`, `CUST` 등 주요 상호 참조 필드에 `TRIM()` 함수를 적용하여 공백 문제를 방지합니다.

---

## 4. 엑셀 내보내기 (Excel Export)

### 기술 스택
- 스타일 제어를 위해 **`exceljs`** 라이브러리를 사용합니다.

### 디자인 규칙 (Styles)
- **기본 글꼴**: `Tahoma`
- **헤더**: `Bold`, 배경색(Light Blue: `FFE9EFF7`), 중앙 정렬, 실선 테두리 적용.
- **포함 컬럼**: No, Asset No, HCT No, Equipment Name, Model Name, Serial Number, **Cal Date**, Next Cal.
- **데이터**: 실선 테두리 적용, 행 높이 및 열 너비 자동 최적화.

### 데이터 범위
- **현재 보기 기반 (Current View)**: 현재 사용자가 웹 화면에서 보고 있는 **페이지(Page)**와 **개수(Limit)** 정보를 그대로 유지하여 엑셀을 생성합니다. (단, 전체 보기 상태일 때는 모든 데이터를 포함)

---

## 5. 인프라 및 환경 (Environment)

### 데이터베이스 (Oracle)
- 이전 버전 오라클과의 호환성을 위해 `OFFSET/FETCH` 대신 `ROWNUM`과 `ROW_NUMBER()` 기반의 페이지네이션 쿼리를 작성합니다.

### 오라클 클라이언트 초기화 (Oracle Client Init)
- **멀티 플랫폼 지원**: `process.platform`을 통해 운영체제를 감지하여 초기화합니다.
- **Mac (Darwin)**: 고정된 기본 경로를 참조하거나 `ORACLE_LIB_DIR` 환경 변수를 사용합니다.
- **Windows (Win32)**: 시스템 PATH에 Instant Client가 등록되어 있으면 자동으로 인식하며, 필요한 경우 `ORACLE_LIB_DIR`로 수동 지정이 가능합니다.
- **Thick 모드 필수**: Oracle 11g와의 호환성을 위해 Thick 모드로 초기화하는 로직이 적용되어 있습니다.

### FTP 파일 스트리밍 (FTP File Streaming)
- **전송 완료 보장**: `PassThrough` 스트림의 이벤트를 기다리는 것보다 `basic-ftp`의 `downloadTo` 프로미스 완료를 우선적으로 대기해야 합니다.
- **연결 종료 타이밍**: 전송 데이터는 다 전달되었어도 서버의 최종 응답(226)을 받기 전 연결을 닫으면 `User closed client during task` 에러가 발생하므로, 프로미스가 `resolve` 또는 `reject` 된 직후에만 `close()`를 호출합니다.
- **에러 핸들링**: 전송 중 오류 발생 시 반드시 `proxyStream.destroy(err)`를 호출하여 브라우저 응답을 중단하고 서버 리소스를 해제해야 합니다.

### 데이터 검색 정책 (Search Policy)
- **용어 통일**: 모든 UI와 문서에서 'Registration No', 'Reg No' 대신 **'HCT No'**를 사용합니다.
- **식별자 검색 (Serial, Asset)**: `UPPER(TRIM(COL)) LIKE '%' || UPPER(TRIM(:val)) || '%'`을 사용하여 대소문자/공백 무시 부분 일치 검색을 수행합니다.
- **식별자 검색 (HCT No)**: `UPPER(TRIM(COL)) = UPPER(TRIM(:val))`을 사용하여 대소문자와 공백을 무시한 정확한 일치 검색을 수행합니다.
- **텍스트 검색 (Model, Name, Manufacturer)**: `UPPER(TRIM(COL)) LIKE '%' || UPPER(TRIM(:val)) || '%'`을 사용하여 대소문자 구분 없는 부분 일치 검색을 수행합니다.

### 외부 라이브러리
- **Excel 생성**: `exceljs` (디자인 필요 시), `xlsx` (단순 데이터 전송 시 - 현재는 exceljs 사용 중)
- **FTP 통신**: `basic-ftp`
