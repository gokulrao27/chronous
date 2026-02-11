import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from '../App';

vi.mock('../utils/googleApi', () => ({
  initializeGoogleApi: vi.fn().mockResolvedValue(undefined),
  requestLogin: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
  fetchUserProfile: vi.fn().mockResolvedValue({
    name: 'Demo User',
    email: 'alex@example.com',
    picture: 'https://picsum.photos/100',
  }),
  fetchCalendarEvents: vi.fn().mockResolvedValue([]),
  fetchGoogleTasks: vi.fn().mockResolvedValue([]),
  createGoogleTask: vi.fn().mockResolvedValue(undefined),
  fetchPrimaryTaskListId: vi.fn().mockResolvedValue('primary'),
  revokeGoogleToken: vi.fn(),
  ensureGoogleScopes: vi.fn().mockResolvedValue(undefined),
  sendGmail: vi.fn().mockResolvedValue(true),
  GOOGLE_CALENDAR_SCOPE: 'calendar',
  GOOGLE_TASKS_SCOPE: 'tasks',
  GOOGLE_GMAIL_SEND_SCOPE: 'gmail',
}));

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it('shows login screen by default', () => {
    render(<App />);
    expect(screen.getByText('Authentication Required')).toBeDefined();
    expect(screen.getByText('Try Demo Mode (No Account)')).toBeDefined();
  });

  it('renders sidebar and minimal home after login', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByText('Try Demo Mode (No Account)'));

    expect((await screen.findAllByText(/Good (Morning|Afternoon|Evening), Demo User/)).length).toBe(1);
    expect(screen.getByText('New Event')).toBeDefined();
    expect(screen.getByText('Integrations')).toBeDefined();
    expect(screen.getByText('Find Best Time')).toBeDefined();
    expect(screen.getByText('Calendar')).toBeDefined();
    expect(screen.getByText('Add Task')).toBeDefined();
    expect(screen.getByText('Share Availability')).toBeDefined();
    expect(screen.getByText('Daily Briefing')).toBeDefined();
  });
});
