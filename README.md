# ChronosSync

A production-focused workspace for distributed scheduling that combines:
- Google SSO + profile access
- Google Calendar scheduling and invite automation
- Gmail follow-up sending
- Google Tasks sync (SyncTasks-style planning)

## Features

- **Google Sign-In (GIS OAuth2)** with robust client/bootstrap handling.
- **Member onboarding invites** via Gmail with acceptance link that routes invitees into the app.
- **Calendar sync** from primary Google Calendar.
- **Meeting scheduling** into Google Calendar with Meet link and attendee invites.
- **Optional Gmail message send** for custom meeting follow-ups and member onboarding invites.
- **Task workspace** backed by Google Tasks API (sync + create tasks).
- **Timezone team planning UI** for global teams.

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Google Cloud Configuration

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project.
3. Configure OAuth consent screen.
4. Create OAuth 2.0 credential as **Web application**.
5. Add `http://localhost:5173` to **Authorized JavaScript origins**.
6. Enable APIs:
   - Google Calendar API
   - Gmail API
   - Google Tasks API
7. Put your OAuth Client ID into `constants.ts`.

### Avoiding `403 access_denied` during sign-in

- Keep your first sign-in request minimal (`openid`, `userinfo.email`, `userinfo.profile`).
- Request Calendar / Tasks / Gmail scopes only when the user performs those actions.
- Ensure your OAuth consent screen is published (or your account is listed under Test users if still in Testing mode).
- If your app requests restricted scopes like `gmail.send`, use the same Google Cloud project where those APIs are enabled and configured.

> If you see `redirect_uri=storagerelay://blob/...`, your OAuth client is usually not Web type or your JS origin does not exactly match current app origin.

## Production Hardening Checklist

- Move client ID to runtime environment variable (do not hardcode in source for prod).
- Add backend for audit logs, scheduling policies, and secure multi-tenant data.
- Add monitoring/error reporting (Sentry/Datadog).
- Add role-based authorization for team operations.
- Add E2E tests for OAuth, scheduling, and tasks sync flows.

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS
- Google Identity Services (GIS)
- Google Calendar / Gmail / Tasks APIs

## Troubleshooting Optional Rollup Binary on Windows ARM

If `npm run dev` fails with an error like `Cannot find module @rollup/rollup-win32-arm64-msvc`, this repo now runs a preflight check (`scripts/ensure-rollup-optional.mjs`) before `dev` and `build` to auto-install the matching optional Rollup binary.

If you still hit the issue, run:

```bash
rm -rf node_modules package-lock.json
npm install
```

Then retry:

```bash
npm run dev
```
