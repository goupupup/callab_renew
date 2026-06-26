# CALLAB Intranet Deployment Plan

## Target Architecture

```text
Company domain / public IP
  -> Apache reverse proxy
      /api/*        -> FastAPI backend, 127.0.0.1:8000
      /_next/*      -> Next.js frontend, 127.0.0.1:3000
      /*            -> Next.js frontend, 127.0.0.1:3000

FastAPI backend
  -> Oracle DB
  -> FTP / file storage
```

The existing Spring Boot/Tomcat CALLAB service can stay on its current connector and virtual host. The renewal app should use a separate Apache virtual host or a separate path/domain during pilot deployment.

## Server Layout

```text
/opt/callab-renewal/backend      FastAPI application
/opt/callab-renewal/frontend     Next.js application
/etc/callab-renewal/backend.env  backend secrets
/etc/systemd/system/callab-api.service
/etc/systemd/system/callab-web.service
/etc/httpd/conf.d/callab-renewal.conf
```

## Backend Service

Use Python 3.11+ and Oracle Instant Client in production. Thin mode failed against the current legacy Oracle server, so Thick mode is the expected deployment mode. On Windows Server, install the 64-bit Oracle Instant Client, normally under `C:\oracle\instantclient_19_20`, and set `CALLAB_ORACLE_LIB_DIR` to that directory.

```ini
[Unit]
Description=CALLAB Renewal FastAPI backend
After=network.target

[Service]
WorkingDirectory=/opt/callab-renewal/backend
EnvironmentFile=/etc/callab-renewal/backend.env
ExecStart=/opt/callab-renewal/backend/.venv/bin/gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --workers 2
Restart=always
RestartSec=5
User=callab
Group=callab

[Install]
WantedBy=multi-user.target
```

Required backend environment:

```env
CALLAB_ORACLE_USER=
CALLAB_ORACLE_PASSWORD=
CALLAB_ORACLE_DSN=
CALLAB_ORACLE_LIB_DIR=C:\oracle\instantclient_19_20
CALLAB_ORACLE_THICK_MODE=true
CALLAB_SESSION_SECRET=
CALLAB_FTP_HOST=
CALLAB_FTP_USER=
CALLAB_FTP_PASSWORD=
```

## Frontend Service

Production frontend must not contain Oracle, FTP, or NextAuth credentials. Leave `NEXT_PUBLIC_API_BASE_URL` empty when Apache serves frontend and API on the same origin.

```ini
[Unit]
Description=CALLAB Renewal Next.js frontend
After=network.target

[Service]
WorkingDirectory=/opt/callab-renewal/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=callab
Group=callab

[Install]
WantedBy=multi-user.target
```

## Apache Routing

If the renewal app gets its own host name:

```apache
<VirtualHost *:80>
    ServerName callab-renewal.company.example

    ProxyPreserveHost On
    ProxyPass        /api/ http://127.0.0.1:8000/api/
    ProxyPassReverse /api/ http://127.0.0.1:8000/api/

    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

If it must share the existing domain during pilot, use a dedicated path such as `/renewal/` and keep the existing Tomcat mapping unchanged.

## Release Order

1. Build and test on a staging path with VPN or server-local Oracle access.
2. Install Oracle Instant Client and verify FastAPI `/api/health`.
3. Verify `/api/auth/login` and `/api/auth/me` with a test account.
4. Verify read-only dashboard, equipment, and search flows.
5. Enable mutation flows: equipment update, upload, schedules, accounts.
6. Switch Apache route for pilot users.
7. Monitor backend logs, Apache logs, and Oracle connection pool errors.
8. After pilot, retire old Next.js API route deployment artifacts.

## Current Gaps Before Production

- FTP download/upload service is still a backend boundary and needs real FTP implementation.
- Oracle Thick mode requires `CALLAB_ORACLE_LIB_DIR` on the server.
- Audit logging for downloads, uploads, and equipment mutations should be completed before broad rollout.
- Password storage remains legacy-compatible and should be migrated to hashed credentials later.
