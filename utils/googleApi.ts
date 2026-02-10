import { GOOGLE_CLIENT_ID } from '../constants';
import { CalendarEvent, SyncedTask } from '../types';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

const waitForGlobal = (globalName: 'google' | 'gapi', timeoutMs = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if ((window as any)[globalName]) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`${globalName} script did not load. Ensure index.html includes the Google script tags.`));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
};

export const initializeGoogleApi = async (): Promise<void> => {
  if (gapiInited && gisInited && tokenClient) {
    return;
  }

  await Promise.all([waitForGlobal('gapi'), waitForGlobal('google')]);

  await new Promise<void>((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
            'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
          ],
        });

        gapiInited = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (resp: any) => {
      if (resp.error) console.error('Auth Error:', resp);
    },
    error_callback: (err: any) => {
      console.error('Google OAuth popup error', err);
    },
  });

  gisInited = true;
};

export const requestLogin = (prompt: 'consent' | '' = 'consent'): Promise<{ accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google API not initialized'));
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }

      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(resp);
      }

      resolve({ accessToken: resp.access_token });
    };

    tokenClient.error_callback = (err: any) => {
      reject(err);
    };

    tokenClient.requestAccessToken({ prompt });
  });
};

export const revokeGoogleToken = (accessToken?: string) => {
  if (accessToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(accessToken, () => undefined);
  }

  if (window.gapi?.client) {
    window.gapi.client.setToken(null);
  }
};

export const fetchUserProfile = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google profile');
  }

  return response.json();
};

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    });

    const events = response.result.items || [];
    return events.map((event: any) => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      location: event.location,
      description: event.description,
      type: 'imported' as const,
    }));
  } catch (err) {
    console.error('Error fetching calendar events', err);
    return [];
  }
};

export const createGoogleCalendarEvent = async (eventDetails: any, attendees: string[]) => {
  const event = {
    summary: eventDetails.title,
    location: eventDetails.location,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: eventDetails.end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: attendees.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(7),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const request = window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  return request.execute();
};

export const sendGmail = async (to: string[], subject: string, message: string) => {
  const emailLines = [];
  emailLines.push(`To: ${to.join(', ')}`);
  emailLines.push('Content-type: text/html;charset=utf-8');
  emailLines.push('MIME-Version: 1.0');
  emailLines.push(`Subject: ${subject}`);
  emailLines.push('');
  emailLines.push(message);

  const email = emailLines.join('\r\n').trim();

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await window.gapi.client.gmail.users.messages.send({
    userId: 'me',
    resource: {
      raw: base64EncodedEmail,
    },
  });

  return true;
};

export const fetchGoogleTasks = async (): Promise<SyncedTask[]> => {
  const listsResponse = await window.gapi.client.tasks.tasklists.list({
    maxResults: 20,
  });

  const lists = listsResponse.result.items || [];
  const taskBatches = await Promise.all(
    lists.map(async (list: any) => {
      const res = await window.gapi.client.tasks.tasks.list({
        tasklist: list.id,
        showCompleted: true,
        maxResults: 100,
      });

      const tasks = res.result.items || [];
      return tasks.map((task: any) => ({
        id: task.id,
        title: task.title || 'Untitled task',
        notes: task.notes,
        due: task.due,
        status: task.status === 'completed' ? 'completed' : 'needsAction',
        listId: list.id,
        listTitle: list.title || 'My Tasks',
      } as SyncedTask));
    }),
  );

  return taskBatches.flat();
};

export const createGoogleTask = async (listId: string, title: string, notes?: string, due?: string) => {
  const response = await window.gapi.client.tasks.tasks.insert({
    tasklist: listId,
    resource: {
      title,
      notes,
      due,
    },
  });

  return response.result;
};

export const fetchPrimaryTaskListId = async (): Promise<string | null> => {
  const listsResponse = await window.gapi.client.tasks.tasklists.list({ maxResults: 1 });
  const first = listsResponse.result.items?.[0];
  return first?.id || null;
};
