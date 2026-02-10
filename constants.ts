
// ACTION REQUIRED:
// 1. Go to Google Cloud Console > APIs & Services > Credentials
// 2. Copy your "Client ID" (from the project where you added localhost:5173 to Authorized Origins)
// 3. Paste it below replacing the placeholder.
export const GOOGLE_CLIENT_ID: string = '433466959744-5ullh83efvokuh5cd50famapgf1iep4o.apps.googleusercontent.com'; 

export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Universal Time)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Denver', label: 'Denver (MT)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

export const ROLE_COLORS: Record<string, string> = {
  'Engineering': 'bg-brand-500', // Blue
  'Design': 'bg-purple-500',     // Purple
  'Product': 'bg-orange-500',    // Orange
  'Sales': 'bg-green-500',       // Green
  'Marketing': 'bg-yellow-500',  // Yellow
  'Leadership': 'bg-red-500',    // Red
  'Support': 'bg-accent-400',    // Cyan/Teal
  'Other': 'bg-gray-500',        // Neutral
};

export const INITIAL_TEAM: any[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Engineering',
    timezone: 'Asia/Singapore',
    avatarUrl: 'https://picsum.photos/100/100?random=1',
    workStart: 10,
    workEnd: 19,
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Product',
    timezone: 'America/New_York',
    avatarUrl: 'https://picsum.photos/100/100?random=2',
    workStart: 9,
    workEnd: 17,
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    role: 'Design',
    timezone: 'Europe/Berlin',
    avatarUrl: 'https://picsum.photos/100/100?random=3',
    workStart: 10,
    workEnd: 18,
  },
];