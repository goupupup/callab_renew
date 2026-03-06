# Directive: Authentication Migration (Phase 1)

## Goal
Map the legacy `CUSTCAL.TWUSRMAN` (Callab Web Service User Info) table to NextAuth Credentials provider.

## Schema Mapping (`CUSTCAL.TWUSRMAN`)
Based on schema analysis:
- **Identifier**: `USERID` (VARCHAR2/CHAR) - Login ID.
- **Credential**: `PASSWORD` (VARCHAR2/CHAR) - Password.
- **Metadata**:
  - `CORPID`: Corporate ID (Links to customer data in `TBMASMAN` or `TBSUPMAN`).
  - `USERNAME`: Individual User Name.
  - `CORPNAME`: Company Name.
  - `AUTHORITY`: User authority level.
  - `STATE`: Account status (Active/Inactive).

## NextAuth Implementation Strategy
1. **Provider**: Credentials Provider.
2. **Authorize Function**:
   - Query: `SELECT USERID, PASSWORD, USERNAME, CORPID, CORPNAME FROM CUSTCAL.TWUSRMAN WHERE USERID = :id AND STATE = '1'`
   - Security: Check password match (legacy comparison).
3. **Session**: Store `USERID`, `CORPID`, and `CORPNAME` for scoped data access.

## Safety Guardrails
- **SELECT Only**: AI must never use `INSERT/UPDATE` on `CUSTCAL.TWUSRMAN`.
- **Read-Only Scoping**: Always filter by `CORPID` for all subsequent data queries.

## Safety Guardrails
- **SELECT Only**: The `authorize` function must only use `SELECT` to verify credentials.
- **Error Handling**: Use generic error messages ("Invalid ID or Password") to prevent account enumeration.
