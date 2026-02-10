import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { AddMemberModal } from './components/AddMemberModal';
import { ScheduleMeetingModal } from './components/ScheduleMeetingModal';
import { CalendarImportModal } from './components/CalendarImportModal';
import { ManualBlockModal } from './components/ManualBlockModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { INITIAL_TEAM, GOOGLE_CLIENT_ID } from './constants';
import { TeamMember, UserProfile, CalendarEvent, MeetingConfig, SyncedTask } from './types';
import { Trash2, MapPin, Sparkles, Download, Wand2, Calendar as CalendarIcon, UserPlus, LogIn, Lock, LockKeyhole, FlaskConical, AlertTriangle, Info, CheckSquare, RefreshCcw, Plus } from 'lucide-react';
import { getHourInZone, findBestMeetingTimeOffset } from './utils/timeUtils';
import { initializeGoogleApi, requestLogin, fetchUserProfile, fetchCalendarEvents, fetchGoogleTasks, createGoogleTask, fetchPrimaryTaskListId, revokeGoogleToken, ensureGoogleScopes, GOOGLE_CALENDAR_SCOPE, GOOGLE_TASKS_SCOPE } from './utils/googleApi';

function App() {
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('chronos_team');
      return saved ? JSON.parse(saved) : INITIAL_TEAM;
    } catch (e) {
      return INITIAL_TEAM;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHourOffset, setSelectedHourOffset] = useState(0);
  const [filterRole, setFilterRole] = useState('All');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  
  // Auth & Calendar State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCalendarImportOpen, setIsCalendarImportOpen] = useState(false);
  const [isManualBlockOpen, setIsManualBlockOpen] = useState(false);
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>([]);
  const [apiReady, setApiReady] = useState(false);
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Checks if user is in demo mode (mock token)
  const isDemoMode = user?.accessToken === 'mock_token';
  const detectedOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';

  useEffect(() => {
    localStorage.setItem('chronos_team', JSON.stringify(members));
  }, [members]);

  // Init Google API
  useEffect(() => {
    const init = async () => {
        try {
            if (GOOGLE_CLIENT_ID.includes('INSERT_YOUR_GOOGLE_CLIENT_ID_HERE')) {
                // Warning handled in render or login click
                return;
            }
            await initializeGoogleApi();
            setApiReady(true);
        } catch (e) {
            console.error("Failed to init Google API", e);
        }
    };
    init();
  }, []);

  const handleLogin = async () => {
    if (GOOGLE_CLIENT_ID.includes('INSERT_YOUR_GOOGLE_CLIENT_ID_HERE')) {
        addToast('Please replace the placeholder in constants.ts with your actual Google Client ID.', 'error');
        return;
    }

    if (!apiReady) {
        addToast('Google Services initializing...', 'info');
        // Try to init again if it failed or was skipped
        try {
            await initializeGoogleApi();
            setApiReady(true);
        } catch(e) {
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
            accessToken: accessToken
        });
        
        addToast(`Welcome, ${profile.name}!`, 'success');

        await syncCalendar('');
        await syncTasks('');

    } catch (err) {
        console.error("Login Failed", err);
        addToast('Login failed. Use a Web application OAuth client ID and add this exact origin to Authorized JavaScript origins in Google Cloud Console.', 'error');
    }
  };

  const handleDemoLogin = () => {
      setUser({
        name: 'Demo User',
        email: 'demo@example.com',
        avatarUrl: 'https://picsum.photos/100/100?random=user',
        organization: 'Demo Mode',
        accessToken: 'mock_token'
      });
      addToast('Entered Demo Mode. Features will be simulated.', 'info');
      // Add some fake events
      const today = new Date();
      setMyEvents([
          {
              id: 'demo1',
              title: 'Standup (Demo)',
              start: new Date(today.setHours(10,0,0,0)),
              end: new Date(today.setHours(10,30,0,0)),
              type: 'meeting',
              description: 'This is a fake meeting for demo purposes'
          }
      ]);
  };

  const handleLogout = () => {
    revokeGoogleToken(user?.accessToken);
    setUser(null);
    setMyEvents([]);
    setTasks([]);
    addToast('Signed out', 'info');
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addMember = (data: Omit<TeamMember, 'id' | 'avatarUrl'>) => {
    const newMember: TeamMember = {
      ...data,
      id: Date.now().toString(),
      avatarUrl: `https://picsum.photos/100/100?random=${Date.now()}`,
    };
    setMembers([...members, newMember]);
    addToast(`${data.name} added to the team`, 'success');
  };

  const removeMember = (id: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      setMembers(members.filter(m => m.id !== id));
      addToast('Member removed', 'info');
    }
  };

  const handleExport = () => {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(members, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "chronos_team_config.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addToast('Team configuration exported successfully', 'success');
    } catch (e) {
        addToast('Failed to export configuration', 'error');
    }
  };

  const handleFindBestTime = () => {
    const activeMembers = filterRole === 'All' 
        ? members 
        : members.filter(m => m.role === filterRole);
        
    const bestOffset = findBestMeetingTimeOffset(activeMembers);
    setSelectedHourOffset(bestOffset);
    
    const targetTime = new Date(new Date().getTime() + bestOffset * 60 * 60 * 1000);
    const timeStr = targetTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    addToast(`Jumped to best time slot: ${timeStr} (Your Time)`, 'success');
  };
  
  const handleTimelineHourClick = (date: Date) => {
    setScheduleDate(date);
    setIsScheduleOpen(true);
  };

  const handleCalendarImport = (events: CalendarEvent[]) => {
    // Tag imported events
    const taggedEvents = events.map(e => ({ ...e, type: 'imported' as const }));
    setMyEvents(prev => [...prev, ...taggedEvents]);
    addToast(`Imported ${events.length} events`, 'success');
  };

  const handleMeetingScheduled = (config: MeetingConfig, date: Date, participants: string[]) => {
    // Add to local state so it appears on timeline immediately
    const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: config.title,
        start: date,
        end: new Date(date.getTime() + config.duration * 60000),
        location: config.location,
        description: config.description,
        type: 'meeting'
    };
    setMyEvents(prev => [...prev, newEvent]);
  };

  const handleManualBlock = (event: CalendarEvent) => {
    setMyEvents(prev => [...prev, event]);
    addToast('Time blocked on your calendar', 'success');
  };

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

  const createTask = async () => {
    if (!newTaskTitle.trim()) {
      addToast('Enter a task title first.', 'info');
      return;
    }

    if (isDemoMode) {
      setTasks(prev => [
        {
          id: Math.random().toString(36).slice(2),
          title: newTaskTitle,
          status: 'needsAction',
          listId: 'demo',
          listTitle: 'Demo Tasks',
        },
        ...prev,
      ]);
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

  const now = new Date(new Date().getTime() + selectedHourOffset * 60 * 60 * 1000);
  const filteredMembers = filterRole === 'All' ? members : members.filter(m => m.role === filterRole);
  const activeNowCount = filteredMembers.filter(m => {
    const h = getHourInZone(now, m.timezone);
    if (m.workStart <= m.workEnd) return h >= m.workStart && h < m.workEnd;
    return h >= m.workStart || h < m.workEnd;
  }).length;

  return (
    <div className="min-h-screen bg-canvas text-text-main font-sans selection:bg-brand-100 selection:text-brand-900 pb-12">
      <Header 
        memberCount={members.length} 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Login Wall */}
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
                  <button 
                    onClick={handleLogin}
                    className="w-full py-3 px-6 bg-white border border-stroke hover:bg-gray-50 text-text-main font-bold rounded shadow-md transition-transform active:scale-95 flex items-center justify-center gap-3"
                  >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Sign In with Google
                  </button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stroke"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-canvas px-2 text-text-muted">Or</span></div>
                  </div>

                  <button 
                    onClick={handleDemoLogin}
                    className="w-full py-2.5 px-6 bg-canvas-subtle hover:bg-gray-200 border border-transparent text-text-sub font-semibold rounded transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                      <FlaskConical className="w-4 h-4" />
                      Try Demo Mode (No Account)
                  </button>

                  {/* Origin Debugger */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-xs text-left">
                     <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                         <Info className="w-4 h-4" />
                         Troubleshooting Login
                     </div>
                     <p className="text-blue-900 mb-2">
                         If you see <code>Error 400: invalid_request</code>, check that your Google Cloud Console <strong>Authorized JavaScript Origins</strong> matches this URL exactly:
                     </p>
                     <div className="bg-white p-2 border border-blue-200 rounded font-mono break-all text-gray-700 select-all">
                         {detectedOrigin}
                     </div>
                     <p className="mt-2 text-blue-800 italic">
                         Note: Changes in Google Cloud Console take ~5 minutes to apply.
                     </p>
                  </div>
              </div>
          </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            
            {isDemoMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-sm text-amber-800 animate-slide-up">
                    <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" />
                        <strong>Demo Mode Active:</strong> Calendar sync and email features are simulated.
                    </div>
                    <button onClick={handleLogout} className="underline hover:text-amber-900">Exit</button>
                </div>
            )}

            {/* Actions Bar & Title */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-text-main tracking-tight">Dashboard</h2>
                <p className="text-text-sub text-sm">Coordinate across {new Set(members.map(m => m.timezone)).size} timezones</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-fade-in">
                <button onClick={() => setIsCalendarImportOpen(true)} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-brand-50 rounded-full text-brand-600 mb-3 group-hover:bg-brand-500 group-hover:text-white transition-colors shadow-sm">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Import ICS</span>
                </button>

                <button onClick={syncCalendar} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                        <RefreshCcw className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Sync Calendar</span>
                </button>

                <button onClick={() => setIsManualBlockOpen(true)} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-gray-100 rounded-full text-gray-600 mb-3 group-hover:bg-gray-600 group-hover:text-white transition-colors shadow-sm">
                        <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Block Time</span>
                </button>

                <button onClick={handleFindBestTime} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600 mb-3 group-hover:bg-purple-500 group-hover:text-white transition-colors shadow-sm">
                        <Wand2 className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Find Best Time</span>
                </button>
                
                <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-green-50 rounded-full text-green-600 mb-3 group-hover:bg-green-500 group-hover:text-white transition-colors shadow-sm">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Add Member</span>
                </button>

                <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-surface border border-stroke rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition-all group active:scale-95">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600 mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                        <Download className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-text-main">Export Config</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-stroke rounded-lg p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <MapPin className="w-24 h-24 text-text-main" />
                </div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Distribution</p>
                <h3 className="text-3xl font-bold text-text-main mt-2">
                {new Set(members.map(m => m.timezone)).size}
                <span className="text-lg text-text-muted font-normal ml-2">Timezones</span>
                </h3>
            </div>

            <div className="bg-surface border border-stroke rounded-lg p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className="w-24 h-24 rounded-full border-8 border-brand-500"></div>
                </div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Active Capacity</p>
                <h3 className="text-3xl font-bold text-text-main mt-2 flex items-baseline gap-2">
                <span className="text-brand-500">{activeNowCount}</span>
                <span className="text-lg text-text-muted font-normal">/ {filteredMembers.length}</span>
                </h3>
                <p className="text-[11px] text-text-muted mt-1">Based on timeline selection</p>
            </div>
            </div>

            <div className="bg-surface border border-stroke rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                  SyncTasks Workspace
                </h3>
                <button
                  onClick={syncTasks}
                  className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 border border-stroke rounded hover:bg-canvas-subtle"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${isSyncingTasks ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Create task in Google Tasks..."
                  className="flex-1 bg-surface border border-stroke rounded-[3px] px-3 py-2 text-sm"
                />
                <button
                  onClick={createTask}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded bg-brand-500 text-white hover:bg-brand-600"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-stroke border border-stroke rounded-[3px]">
                {tasks.length === 0 ? (
                  <div className="p-4 text-sm text-text-muted">No tasks synced yet. Click Sync to pull your Google Tasks.</div>
                ) : (
                  tasks.map(task => (
                    <div key={`${task.listId}-${task.id}`} className="p-3 flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-text-muted' : 'text-text-main'}`}>{task.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{task.listTitle}{task.due ? ` • due ${new Date(task.due).toLocaleDateString()}` : ''}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {task.status === 'completed' ? 'DONE' : 'OPEN'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Main Timeline */}
            <div className="space-y-4">
            <Timeline 
                members={members} 
                selectedHourOffset={selectedHourOffset}
                onOffsetChange={setSelectedHourOffset}
                filterRole={filterRole}
                onFilterChange={setFilterRole}
                onHourClick={handleTimelineHourClick}
                myEvents={myEvents}
                userName={user.name}
            />
            </div>

            {/* List View Details */}
            <div className="bg-surface border border-stroke rounded-lg overflow-hidden shadow-sm">
            <div className="p-5 border-b border-stroke flex justify-between items-center bg-canvas-subtle">
                <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    Directory
                </h3>
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold bg-stroke/50 px-2 py-1 rounded-[3px]">
                    {members.length} Total
                </span>
            </div>
            <div className="divide-y divide-stroke">
                {members.length === 0 ? (
                <div className="p-12 text-center text-text-sub">
                    No members yet. Add one to get started!
                </div>
                ) : (
                members.map(member => (
                    <div key={member.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-canvas transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                        <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-full border border-stroke object-cover shadow-sm" />
                        <div>
                        <div className="font-semibold text-text-main text-sm">{member.name}</div>
                        {member.email && <div className="text-[11px] text-text-muted">{member.email}</div>}
                        <div className="text-xs text-text-sub flex items-center gap-2 mt-0.5">
                            <span className="bg-canvas-subtle px-1.5 py-0.5 rounded-[3px] text-text-muted font-medium border border-stroke">{member.role}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {member.timezone.replace('_', ' ')}</span>
                        </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Hours</div>
                        <div className="text-xs text-text-main font-mono bg-canvas px-2 py-1 rounded-[3px] border border-stroke mt-1 font-medium">
                            {member.workStart}:00 - {member.workEnd}:00
                        </div>
                        </div>
                        <button 
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-[3px] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Remove Member"
                        >
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    </div>
                ))
                )}
            </div>
            </div>
        </main>
      )}

      <AddMemberModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={addMember} 
      />
      
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        selectedDate={scheduleDate}
        members={filterRole === 'All' ? members : members.filter(m => m.role === filterRole)}
        onToast={(msg, type) => addToast(msg, type)}
        onSchedule={handleMeetingScheduled}
        isDemo={isDemoMode}
      />

      <CalendarImportModal
        isOpen={isCalendarImportOpen}
        onClose={() => setIsCalendarImportOpen(false)}
        onImport={handleCalendarImport}
      />

      <ManualBlockModal
        isOpen={isManualBlockOpen}
        onClose={() => setIsManualBlockOpen(false)}
        onAdd={handleManualBlock}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
