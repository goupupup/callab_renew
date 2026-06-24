# Directive: Frontend FastAPI Transition

## Goal

Move the Next.js frontend from in-process API Routes to the FastAPI backend while keeping screen behavior stable.

## API Client

Use `src/lib/api-client.ts` for new frontend calls:

```ts
import { apiFetch } from "@/lib/api-client";

const response = await apiFetch("/api/equipment");
```

Rules:

- Use relative `/api/*` paths in code.
- Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` only for local development when Next.js and FastAPI run on different ports.
- In production, leave `NEXT_PUBLIC_API_BASE_URL` empty and let Apache route `/api/*` to FastAPI.
- Always use `credentials: "include"` for session cookie support. `apiFetch` does this by default.

## Migration Order

1. Replace dashboard calls.
2. Replace equipment list/export/download/upload calls.
3. Replace search lookup and advanced search calls.
4. Replace schedule calls.
5. Replace account calls.
6. Delete matching Next.js API Routes after each screen is verified against FastAPI.

## Compatibility Notes

- The FastAPI backend currently exposes REST-style search routes such as `/api/search/reg-no`.
- Existing Next.js code still calls legacy query-mode routes such as `/api/search?mode=...`.
- During migration, update each screen to call the new REST path directly through `apiFetch`.
