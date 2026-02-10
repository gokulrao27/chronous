# ChronosSync

A production-focused workspace for distributed scheduling that combines:
- Google SSO + profile access
- Google Calendar scheduling and invite automation
- Gmail follow-up sending
- Google Tasks sync (SyncTasks-style planning)

## Features

- **Google Sign-In (GIS OAuth2)** with robust client/bootstrap handling.
- **Calendar sync** from primary Google Calendar.
- **Meeting scheduling** into Google Calendar with Meet link and attendee invites.
- **Optional Gmail message send** for custom meeting follow-ups.
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
