# Directive: Environment Setup (Phase 0)

## Goal
Establish a robust foundation for the Next.js 15 project with seamless Oracle XE connectivity.

## Prerequisites
- Node.js 20+
- Python 3.10+ (for execution scripts)
- Oracle Instant Client (REQUIRED for older Oracle XE versions as `python-oracledb` requires Thick mode)

## Step 1: Directory Structure
Ensure the following directories exist:
- `directives/`: Store all SOPs.
- `execution/`: Store all deterministic Python scripts.
- `.tmp/`: For temporary assets and processing files.

## Step 2: Environment Variables (`.env`)
Required keys:
```env
# Oracle XE
ORACLE_USER=your_user
ORACLE_PASS=your_pass
ORACLE_CONN_STR=your_host:1521/XE

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## Step 3: Oracle Connection Test
1. Create `execution/test_oracle_conn.py`.
2. Use the `oracledb` Python library.
3. Verify that a simple `SELECT 1 FROM DUAL` works.

## 🛡️ SQL Safety Guardrails (CRITICAL)
- **Read-Only Access**: All autonomous database interactions must use **SELECT** queries ONLY.
- **No Mutations**: `INSERT`, `UPDATE`, `DELETE`, `DROP`, or `ALTER` statements are strictly forbidden for the AI to execute independently. Any data mutation requirements must be explicitly requested and reviewed by the user.

## Edge Cases & Self-annealing
- **Connectivity Error**: If connection fails, check VPN status or Firewall settings. Update this directive if specific proxy settings are needed.
- **Library Mismatch**: If `oracledb` fails due to Missing Oracle Client, switch to "Thin Mode" if possible and document the change.
