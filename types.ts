export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  timezone: string;
  avatarUrl: string;
  workStart: number; // Hour 0-23
  workEnd: number; // Hour 0-23
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  organization?: string;
  accessToken?: string; // Google OAuth Token
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  type: 'imported' | 'meeting' | 'block' | 'holiday' | 'task' | 'external';
}

export interface SyncedTask {
  id: string;
  title: string;
  duration?: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  listId: string;
  listTitle: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
  offset: number;
}

export type ViewMode = 'list' | 'timeline';

export interface TimelineSlot {
  hour: number;
  label: string;
  isWorkHour: boolean;
  score: number; // 0-1 availability score for the team
}

export interface MeetingConfig {
  title: string;
  duration: number; // minutes
  description: string;
  location: string;
}
