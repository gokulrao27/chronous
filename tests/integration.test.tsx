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

describe('App day planner interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it('navigates day using yesterday/tomorrow controls', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByText('Try Demo Mode (No Account)'));
    await screen.findAllByText(/Good (Morning|Afternoon|Evening), Demo User/);

    const initialDate = screen.getByText(/\w+, \w+ \d{1,2}, \d{4}/).textContent;
    await user.click(screen.getByText('Tomorrow'));
    const nextDate = screen.getByText(/\w+, \w+ \d{1,2}, \d{4}/).textContent;
    expect(nextDate).not.toEqual(initialDate);

    await user.click(screen.getByText('Yesterday'));
    const backDate = screen.getByText(/\w+, \w+ \d{1,2}, \d{4}/).textContent;
    expect(backDate).toEqual(initialDate);
  });

  it('allows opening schedule modal from a time slot', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByText('Try Demo Mode (No Account)'));
    await screen.findAllByText(/Good (Morning|Afternoon|Evening), Demo User/);

    await user.click(screen.getAllByText('Click to schedule')[0]);
    expect(await screen.findByText('Schedule Meeting', { selector: 'h2' })).toBeDefined();
  });
});
