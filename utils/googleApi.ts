import { GOOGLE_CLIENT_ID } from '../constants';
import { CalendarEvent } from '../types';

// Types for Google API global objects
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize Google API Client
export const initializeGoogleApi = async (): Promise<void> => {
  return new Promise((resolve) => {
    // 1. Load GAPI (Client Library)
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        // apiKey: 'YOUR_API_KEY', // Optional if using OAuth only for access
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
        ],
      });
      gapiInited = true;
      checkInit(resolve);
    });

    // 2. Load GIS (Identity Services)
    if (window.google) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (resp: any) => {
               // Default empty handler to satisfy initialization requirement.
               // We override this in requestLogin.
               if (resp.error) console.error("Auth Error:", resp);
            }, 
        });
        gisInited = true;
        checkInit(resolve);
    }
  });
};

function checkInit(resolve: () => void) {
  if (gapiInited && gisInited) {
    resolve();
  }
}

// Request Access Token
export const requestLogin = (): Promise<{ accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
        reject('Google API not initialized');
        return;
    }

    // Override the callback for this specific request
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      
      // CRITICAL: Set the token for the GAPI client so subsequent API calls work
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(resp);
      }

      resolve({ accessToken: resp.access_token });
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// Fetch User Profile using Token
export const fetchUserProfile = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
};

// --- Calendar API ---

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      'calendarId': 'primary',
      'timeMin': (new Date()).toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 50,
      'orderBy': 'startTime',
    });

    const events = response.result.items;
    return events.map((event: any) => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      location: event.location,
      description: event.description,
      type: 'imported' as const
    }));
  } catch (err) {
    console.error('Error fetching calendar events', err);
    return [];
  }
};

export const createGoogleCalendarEvent = async (eventDetails: any, attendees: string[]) => {
    const event = {
        'summary': eventDetails.title,
        'location': eventDetails.location,
        'description': eventDetails.description,
        'start': {
          'dateTime': eventDetails.start.toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'end': {
          'dateTime': eventDetails.end.toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'attendees': attendees.map(email => ({ 'email': email })),
        // Default Google Meet
        'conferenceData': {
            'createRequest': {
                'requestId': Math.random().toString(36).substring(7),
                'conferenceSolutionKey': { 'type': 'hangoutsMeet' },
            },
        },
    };

    const request = window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
        'conferenceDataVersion': 1,
        'sendUpdates': 'all', // Sends emails to attendees via Calendar automatically
    });

    return request.execute();
};

// --- Gmail API (Send Email) ---

export const sendGmail = async (to: string[], subject: string, message: string) => {
    // Basic email construction
    const emailLines = [];
    emailLines.push(`To: ${to.join(', ')}`);
    emailLines.push('Content-type: text/html;charset=utf-8');
    emailLines.push('MIME-Version: 1.0');
    emailLines.push(`Subject: ${subject}`);
    emailLines.push('');
    emailLines.push(message);

    const email = emailLines.join('\r\n').trim();
    
    // Base64URL encode (URL-safe)
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        await window.gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'resource': {
                'raw': base64EncodedEmail
            }
        });
        return true;
    } catch (e) {
        console.error("Gmail API Error", e);
        throw e;
    }
};
