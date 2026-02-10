
# ChronosSync

A professional, privacy-first visual dashboard for coordinating distributed teams across timezones.

## Features

- **Visual Timeline**: Drag-to-move timeline to see overlap across timezones.
- **Google Calendar Sync**: Import events and push meetings to Google Calendar.
- **Privacy First**: Data is stored locally in your browser (`localStorage`).
- **Team Management**: Add members with specific roles and working hours.
- **Holiday Awareness**: Automatic detection of major holidays based on timezone.

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

## Configuration

To use Google Sign-In and Calendar features:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a Project and configure **OAuth Consent Screen**.
3. Create **OAuth 2.0 Client ID** credentials (Web Application).
4. Add `http://localhost:5173` to **Authorized JavaScript origins**.
5. Copy the Client ID into `constants.ts`.

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS
- Google Identity Services (GIS)
- Lucide React Icons
