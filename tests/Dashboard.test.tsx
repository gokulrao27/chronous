import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('Dashboard enterprise shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);

    if (!(navigator as any).clipboard) {
      Object.defineProperty(window.Navigator.prototype, 'clipboard', {
        configurable: true,
        get() {
          return { writeText: vi.fn().mockResolvedValue(undefined) };
        },
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const bootDashboard = async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Try Demo Mode (No Account)'));
    await screen.findByText('Plan the day with confidence');
    return user;
  };

  it('renders core dashboard sections and day grid at 7 AM start', async () => {
    await bootDashboard();

    expect(screen.getByText('Plan the day with confidence')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('Booking Links')).toBeDefined();
    expect(screen.getByText('7:00 AM')).toBeDefined();
  });

  it('supports primary and secondary header actions', async () => {
    const user = await bootDashboard();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    await user.click(screen.getByRole('button', { name: /add task/i }));
    expect(logSpy).toHaveBeenCalledWith('add-task-primary-clicked');

    await user.click(screen.getByRole('button', { name: /share availability/i }));
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0][0]).toContain('/availability/');
  });

  it('marks sidebar items as draggable and toggles integrations', async () => {
    const user = await bootDashboard();

    const taskCard = screen.getByText('Prepare client brief').closest('div[draggable="true"]');
    expect(taskCard).toBeTruthy();
    expect(taskCard?.getAttribute('draggable')).toBe('true');

    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('false');

    await user.click(integrationsButton);

    expect(integrationsButton.getAttribute('aria-expanded')).toBe('true');
    const nav = integrationsButton.closest('nav') as HTMLElement;
    expect(within(nav).getByText('Sync Calendar')).toBeDefined();
  });

  it('shows key logic markers including focus score and standup event', async () => {
    await bootDashboard();

    expect(screen.getByText('82 / 100')).toBeDefined();
    expect(screen.getByText('External: Morning Standup')).toBeDefined();
  });
});
