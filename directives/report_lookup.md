# Directive: Report Lookup (Phase 2)

## Goal
Enable customers to look up their calibration history and equipment status using **TBMASMAN** (Registration-based Equipment Management).

## Schema Mapping
- **Equipment Management (`TBMASMAN`)**:
  - `ISID`: Issued ID (Join Key)
  - `SERN`: Serial Number (Confirmed)
  - `MODL`: Model Name
  - `NAEM`: Equipment Name
  - `MNFC`: Manufacturer
  - `CUST`: Customer Code (Must match `CORPID` from `TWUSRMAN`)
  - `REGD`: Registration Date
- **Company Information (`TBSUPMAN`)**:
  - `CUST_CODE`: Customer Code
  - `COID`: Company ID
- **Calibration Records (`TBCALMAN`)**:
  - *Note*: Use this table for detailed calibration results if necessary.
  - `PDF_REPT`: Potential field for PDF report link.

## Retrieval Logic
1. **Query**:
   ```sql
   SELECT 
       M.ISID, M.NAEM, M.MODL, M.SERN, M.REGD, M.CUST
   FROM 
       TBMASMAN M
   WHERE 
       M.CUST = :user_corp_id
   ORDER BY 
       M.REGD DESC
   ```
2. **File Access**:
   - [TODO] Clarify with the user where the actual PDF file names are stored now that `TBCALRPT` is deprecated.

## Safety Guardrails
- **SELECT Only**: All retrieval logic must use `SELECT` queries.
- **Access Control**: Users MUST only see data matching their `CORPID` from `CUSTCAL.TWUSRMAN`.

## Safety Guardrails
- **SELECT Only**: All retrieval logic must use `SELECT` queries.
- **Access Control**: Users MUST only see reports matching their `CUST` code from `TBUSRMAN`.
