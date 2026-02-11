import React, { useEffect, useMemo, useState } from 'react';
import { Timeline } from './components/Timeline';
import { AddMemberModal } from './components/AddMemberModal';
import { ScheduleMeetingModal } from './components/ScheduleMeetingModal';
import { CalendarImportModal } from './components/CalendarImportModal';
import { ManualBlockModal } from './components/ManualBlockModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { INITIAL_TEAM, GOOGLE_CLIENT_ID } from './constants';
import { TeamMember, UserProfile, CalendarEvent, MeetingConfig, SyncedTask } from './types';
import { ChevronRight, Calendar as CalendarIcon, UserPlus, LogIn, Lock, LockKeyhole, FlaskConical, AlertTriangle, Info, CheckSquare, RefreshCcw, Plus, Download, Mail, Users, CalendarClock, LogOut } from 'lucide-react';
import { findBestMeetingTimeOffset } from './utils/timeUtils';
import { initializeGoogleApi, requestLogin, fetchUserProfile, fetchCalendarEvents, fetchGoogleTasks, createGoogleTask, fetchPrimaryTaskListId, revokeGoogleToken, ensureGoogleScopes, GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE, GOOGLE_GMAIL_SEND_SCOPE, sendGmail } from './utils/googleApi';

function App() {
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('chronos_team');
      return saved ? JSON.parse(saved) : INITIAL_TEAM;
    } catch {
      return INITIAL_TEAM;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('All');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCalendarImportOpen, setIsCalendarImportOpen] = useState(false);
  const [isManualBlockOpen, setIsManualBlockOpen] = useState(false);
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>([]);
  const [apiReady, setApiReady] = useState(false);
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const isDemoMode = user?.accessToken === 'mock_token';
  const detectedOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const upsertMember = (incoming: TeamMember) => {
    setMembers(prev => {
      const normalizedEmail = incoming.email?.toLowerCase();
      const index = prev.findIndex(member => {
        if (normalizedEmail && member.email?.toLowerCase() === normalizedEmail) return true;
        return member.name.trim().toLowerCase() === incoming.name.trim().toLowerCase();
      });

      if (index === -1) return [...prev, incoming];

      const next = [...prev];
      next[index] = { ...next[index], ...incoming, id: next[index].id };
      return next;
    });
  };

  const decodeInvitePayload = (payload: string) => {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  };

  useEffect(() => {
    localStorage.setItem('chronos_team', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accepted = params.get('invite_accept');
    const payload = params.get('payload');

    if (accepted !== '1' || !payload) return;

    try {
      const data = decodeInvitePayload(payload);
      upsertMember({
        id: Date.now().toString(),
        name: data.inviteeName,
        email: data.inviteeEmail,
        role: 'External',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        avatarUrl: `https://picsum.photos/100/100?random=${Date.now()}_invitee`,
        workStart: 9,
        workEnd: 17,
      });
      upsertMember({
        id: `${Date.now()}_inviter`,
        name: data.inviterName,
        email: data.inviterEmail,
        role: 'Owner',
        timezone: data.inviterTimezone || 'UTC',
        avatarUrl: `https://picsum.photos/100/100?random=${Date.now()}_inviter`,
        workStart: 9,
        workEnd: 17,
      });
      addToast(`Invite accepted. ${data.inviterName} and ${data.inviteeName} were added to the workspace.`, 'success');
      params.delete('invite_accept');
      params.delete('payload');
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    } catch (error) {
      console.error('Invite acceptance payload invalid', error);
      addToast('Invite link is invalid or expired.', 'error');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (GOOGLE_CLIENT_ID.includes('INSERT_YOUR_GOOGLE_CLIENT_ID_HERE')) return;
        await initializeGoogleApi();
        setApiReady(true);
      } catch (error) {
        console.error('Failed to init Google API', error);
      }
    };
    init();
  }, []);

  const syncCalendar = async (prompt: 'consent' | '' = 'consent') => {
    if (isDemoMode) {
      addToast('Demo mode: calendar sync is simulated.', 'info');
      return;
    }

    try {
      await ensureGoogleScopes([GOOGLE_CALENDAR_SCOPE], prompt);
      const events = await fetchCalendarEvents();
      setMyEvents(events);
      addToast(`Synced ${events.length} calendar events`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Could not sync calendar events', 'error');
    }
  };

  const syncTasks = async (prompt: 'consent' | '' = 'consent') => {
    if (isDemoMode) {
      addToast('Demo mode: task sync is simulated.', 'info');
      return;
    }

    setIsSyncingTasks(true);
    try {
      await ensureGoogleScopes([GOOGLE_TASKS_SCOPE], prompt);
      const synced = await fetchGoogleTasks();
      setTasks(synced);
      addToast(`Synced ${synced.length} tasks from Google Tasks`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to sync tasks. Confirm Google Tasks API is enabled.', 'error');
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const handleLogin = async () => {
    if (GOOGLE_CLIENT_ID.includes('INSERT_YOUR_GOOGLE_CLIENT_ID_HERE')) {
      addToast('Please replace the placeholder in constants.ts with your actual Google Client ID.', 'error');
      return;
    }

    if (!apiReady) {
      addToast('Google Services initializing...', 'info');
      try {
        await initializeGoogleApi();
        setApiReady(true);
      } catch {
        addToast('Initialization failed. Check console for details.', 'error');
        return;
      }
    }

    try {
      const { accessToken } = await requestLogin();
      const profile = await fetchUserProfile(accessToken);
      setUser({
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.picture,
        organization: 'Google Account',
        accessToken,
      });
      addToast(`Welcome, ${profile.name}!`, 'success');
      await syncCalendar('');
      await syncTasks('');
    } catch (error) {
      console.error('Login Failed', error);
      addToast('Login failed. Use a Web application OAuth client ID and add this exact origin to Authorized JavaScript origins in Google Cloud Console.', 'error');
    }
  };

  const handleDemoLogin = () => {
    setUser({
      name: 'Demo User',
      email: 'demo@example.com',
      avatarUrl: 'https://picsum.photos/100/100?random=user',
      organization: 'Demo Mode',
      accessToken: 'mock_token',
    });
    const today = new Date();
    setMyEvents([
      {
        id: 'demo1',
        title: 'Morning Standup',
        start: new Date(today.setHours(10, 0, 0, 0)),
        end: new Date(today.setHours(10, 30, 0, 0)),
        type: 'meeting',
        description: 'Daily sync',
      },
    ]);
    addToast('Entered Demo Mode. Features will be simulated.', 'info');
  };

  const handleLogout = () => {
    revokeGoogleToken(user?.accessToken);
    setUser(null);
    setMyEvents([]);
    setTasks([]);
    addToast('Signed out', 'info');
  };

  const addMember = async (data: Omit<TeamMember, 'id' | 'avatarUrl'>, options: { sendInvite: boolean }) => {
    const newMember: TeamMember = {
      ...data,
      id: Date.now().toString(),
      avatarUrl: `https://picsum.photos/100/100?random=${Date.now()}`,
    };
    upsertMember(newMember);
    addToast(`${data.name} added to the team`, 'success');

    if (!options.sendInvite) return;
    if (!data.email) {
      addToast('Invite email skipped because member email is missing.', 'info');
      return;
    }
    if (!user) {
      addToast('Sign in first to send Gmail invites.', 'error');
      return;
    }

    try {
      await ensureGoogleScopes([GOOGLE_GMAIL_SEND_SCOPE, GOOGLE_CALENDAR_SCOPE], 'consent');
      const payload = {
        inviterName: user.name,
        inviterEmail: user.email,
        inviterTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        inviteeName: data.name,
        inviteeEmail: data.email,
      };
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const acceptUrl = `${window.location.origin}?invite_accept=1&payload=${encodedPayload}`;
      const body = `
        <h2>${user.name} invited you to ChronosSync</h2>
        <p>Hi ${data.name},</p>
        <p>You've been added to a shared scheduling workspace. Click the button below to accept and connect your account.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Accept invite and connect Google</a></p>
      `;
      await sendGmail([data.email], `${user.name} invited you to ChronosSync`, body);
      addToast(`Invite sent to ${data.email}`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to send invite email. Check Gmail scope consent and API setup.', 'error');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(members, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', 'chronos_team_config.json');
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      addToast('Team configuration exported successfully', 'success');
    } catch {
      addToast('Failed to export configuration', 'error');
    }
  };

  const handleFindBestTime = () => {
    const activeMembers = filterRole === 'All' ? members : members.filter(member => member.role === filterRole);
    const bestOffset = findBestMeetingTimeOffset(activeMembers);
    const targetTime = new Date(new Date().getTime() + bestOffset * 60 * 60 * 1000);
    setScheduleDate(targetTime);
    addToast(`Best slot highlighted: ${targetTime.toLocaleString()}`, 'success');
  };

  const connectGmailAccess = async () => {
    if (isDemoMode) {
      addToast('Demo mode: Gmail access is simulated.', 'info');
      return;
    }

    try {
      await ensureGoogleScopes([GOOGLE_GMAIL_SEND_SCOPE], 'consent');
      addToast('Gmail access granted successfully.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Could not grant Gmail access.', 'error');
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) {
      addToast('Enter a task title first.', 'info');
      return;
    }

    if (isDemoMode) {
      setTasks(prev => [{ id: Math.random().toString(36).slice(2), title: newTaskTitle, status: 'needsAction', listId: 'demo', listTitle: 'Demo Tasks' }, ...prev]);
      setNewTaskTitle('');
      addToast('Demo task created.', 'success');
      return;
    }

    try {
      await ensureGoogleScopes([GOOGLE_TASKS_SCOPE], '');
      const listId = await fetchPrimaryTaskListId();
      if (!listId) {
        addToast('No Google task list found on account.', 'error');
        return;
      }
      await createGoogleTask(listId, newTaskTitle.trim());
      setNewTaskTitle('');
      await syncTasks();
    } catch (error) {
      console.error(error);
      addToast('Failed to create task in Google Tasks.', 'error');
    }
  };

  const handleTimelineHourClick = (date: Date) => {
    setScheduleDate(date);
    setIsScheduleOpen(true);
  };

  const handleCalendarImport = (events: CalendarEvent[]) => {
    setMyEvents(prev => [...prev, ...events.map(event => ({ ...event, type: 'imported' as const }))]);
    addToast(`Imported ${events.length} events`, 'success');
  };

  const handleMeetingScheduled = (config: MeetingConfig, date: Date) => {
    setMyEvents(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: config.title,
        start: date,
        end: new Date(date.getTime() + config.duration * 60000),
        location: config.location,
        description: config.description,
        type: 'meeting',
      },
    ]);
  };

  const handleManualBlock = (event: CalendarEvent) => {
    setMyEvents(prev => [...prev, event]);
    addToast('Time blocked on your calendar', 'success');
  };

  const sideBarActions = [
    { label: 'Sync Calendar', icon: RefreshCcw, onClick: () => syncCalendar(), primary: true },
    { label: 'Sync Tasks', icon: CheckSquare, onClick: () => syncTasks(), disabled: isSyncingTasks },
    { label: 'Import ICS', icon: CalendarIcon, onClick: () => setIsCalendarImportOpen(true) },
    { label: 'Add Member', icon: UserPlus, onClick: () => setIsModalOpen(true) },
    { label: 'Connect Gmail', icon: Mail, onClick: connectGmailAccess },
    { label: 'Find Best Time', icon: CalendarClock, onClick: handleFindBestTime },
    { label: 'Block Time', icon: Lock, onClick: () => setIsManualBlockOpen(true) },
    { label: 'Export Config', icon: Download, onClick: handleExport },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-main font-sans selection:bg-brand-100 selection:text-brand-900">
      {!user ? (
        <div className="max-w-md mx-auto mt-24 text-center space-y-6 p-8 animate-fade-in">
          <div className="bg-brand-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockKeyhole className="w-10 h-10 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-text-main">Authentication Required</h2>
          <p className="text-text-sub">Please sign in with Google to sync your calendar and access the team dashboard.</p>

          {GOOGLE_CLIENT_ID.includes('INSERT_YOUR_GOOGLE_CLIENT_ID_HERE') && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 text-left mb-4 flex gap-2 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong>Setup Required:</strong> Please open <code>constants.ts</code> and replace the placeholder with your actual <strong>Client ID</strong> from Google Cloud Console.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={handleLogin} className="w-full py-3 px-6 bg-white border border-stroke hover:bg-gray-50 text-text-main font-bold rounded shadow-md transition-transform active:scale-95 flex items-center justify-center gap-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Sign In to Continue
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stroke"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-canvas px-2 text-text-muted">Or</span></div>
            </div>

            <button onClick={handleDemoLogin} className="w-full py-2.5 px-6 bg-canvas-subtle hover:bg-gray-200 border border-transparent text-text-sub font-semibold rounded transition-colors flex items-center justify-center gap-2 text-sm">
              <FlaskConical className="w-4 h-4" />
              Try Demo Mode (No Account)
            </button>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-xs text-left">
              <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                <Info className="w-4 h-4" />
                Troubleshooting Login
              </div>
              <p className="text-blue-900 mb-2">If you see <code>Error 400: invalid_request</code>, check that your Google Cloud Console <strong>Authorized JavaScript Origins</strong> matches this URL exactly:</p>
              <div className="bg-white p-2 border border-blue-200 rounded font-mono break-all text-gray-700 select-all">{detectedOrigin}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          <aside className="border-r border-stroke bg-[#091734] text-slate-100 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-300">Chronous</p>
                <h1 className="text-2xl font-bold">{greeting}, {user.name}</h1>
              </div>
              <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border border-slate-600" />
            </div>

            <div className="rounded-xl border border-slate-700 bg-[#0c1f42] p-4">
              <div className="flex items-center gap-2 text-sm text-slate-300"><Users className="w-4 h-4" /> Team</div>
              <p className="text-3xl font-bold mt-2">{members.length}</p>
              <p className="text-xs text-slate-400">members connected</p>
            </div>

            <nav className="space-y-2">
              {sideBarActions.map(action => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${action.primary ? 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500' : 'border-slate-700 hover:bg-[#0f274f] text-slate-200'} disabled:opacity-50`}
                >
                  <span className="inline-flex items-center gap-2"><action.icon className="w-4 h-4" /> {action.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>

            <div className="rounded-xl border border-slate-700 p-4 bg-[#0c1f42] space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tasks</p>
              <div className="flex gap-2">
                <input
                  value={newTaskTitle}
                  onChange={event => setNewTaskTitle(event.target.value)}
                  placeholder="Add a task..."
                  className="flex-1 rounded-md bg-[#0a1733] border border-slate-600 px-3 py-2 text-sm"
                />
                <button onClick={createTask} className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-400">No tasks synced yet.</p>
                ) : (
                  tasks.slice(0, 5).map(task => (
                    <div key={`${task.listId}-${task.id}`} className="rounded-md border border-slate-700 px-3 py-2">
                      <p className="text-sm">{task.title}</p>
                      <p className="text-[11px] text-slate-400">{task.listTitle}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button onClick={handleLogout} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-[#0f274f]">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </aside>

          <main className="p-4 md:p-6 lg:p-8 space-y-6">
            {isDemoMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-sm text-amber-800">
                <div className="flex items-center gap-2"><FlaskConical className="w-4 h-4" /> <strong>Demo Mode Active:</strong> Calendar sync and email features are simulated.</div>
                <button onClick={handleLogout} className="underline hover:text-amber-900">Exit</button>
              </div>
            )}

            <section className="rounded-2xl border border-stroke bg-surface p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted">Home</p>
              <h2 className="text-3xl font-bold mt-1">{greeting}, {user.name}</h2>
              <p className="text-text-sub mt-2">Minimal planning view with a focused day timeline. Use the left sidebar for all workspace operations.</p>
            </section>

            <Timeline
              members={members}
              filterRole={filterRole}
              onFilterChange={setFilterRole}
              onHourClick={handleTimelineHourClick}
              myEvents={myEvents}
              userName={user.name}
              selectedDate={scheduleDate}
              onDateChange={setScheduleDate}
            />
          </main>
        </div>
      )}

      <AddMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addMember} />
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        selectedDate={scheduleDate}
        members={filterRole === 'All' ? members : members.filter(m => m.role === filterRole)}
        onToast={(msg, type) => addToast(msg, type)}
        onSchedule={handleMeetingScheduled}
        isDemo={isDemoMode}
      />
      <CalendarImportModal isOpen={isCalendarImportOpen} onClose={() => setIsCalendarImportOpen(false)} onImport={handleCalendarImport} />
      <ManualBlockModal isOpen={isManualBlockOpen} onClose={() => setIsManualBlockOpen(false)} onAdd={handleManualBlock} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
