// Mock database of holidays (Month-Day format)
// In a real app, this would come from an API or a robust library like date-holidays
const HOLIDAYS_DB: Record<string, Record<string, string>> = {
  'Global': {
    '01-01': "New Year's Day",
    '12-25': 'Christmas Day',
  },
  'US': {
    '07-04': 'Independence Day',
    '11-28': 'Thanksgiving',
    '05-27': 'Memorial Day',
    '09-02': 'Labor Day',
  },
  'GB': { // UK
    '12-26': 'Boxing Day',
    '08-26': 'Summer Bank Holiday',
    '05-06': 'Early May Bank Holiday',
  },
  'EU': { // Generic Europe (Berlin, Paris)
    '05-01': 'Labour Day',
    '10-03': 'German Unity Day', // DE
    '07-14': 'Bastille Day', // FR
  },
  'SG': { // Singapore
    '08-09': 'National Day',
    '05-22': 'Vesak Day',
  },
  'JP': { // Japan
    '04-29': 'Showa Day',
    '05-03': 'Constitution Memorial Day',
    '01-08': 'Coming of Age Day',
  },
  'AU': { // Australia
    '01-26': 'Australia Day',
    '04-25': 'Anzac Day',
  },
  'IN': { // India
    '01-26': 'Republic Day',
    '08-15': 'Independence Day',
    '10-02': 'Gandhi Jayanti',
  },
  'BR': { // Brazil
    '09-07': 'Independence Day',
    '11-15': 'Republic Day',
  }
};

const TZ_TO_REGION: Record<string, string> = {
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'Europe/London': 'GB',
  'Europe/Berlin': 'EU',
  'Europe/Paris': 'EU',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Asia/Kolkata': 'IN',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'AU', // Proxied
  'America/Sao_Paulo': 'BR',
  'Africa/Lagos': 'Global',
  'Asia/Dubai': 'Global',
  'Asia/Bangkok': 'Global',
};

export const getHolidayForDate = (date: Date, timezone: string): string | null => {
  // 1. Get region
  const region = TZ_TO_REGION[timezone] || 'Global';
  
  // 2. Format date to MM-DD in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(date);
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const key = `${month}-${day}`;

  // 3. Check specific region holidays + Global holidays
  if (HOLIDAYS_DB[region]?.[key]) return HOLIDAYS_DB[region][key];
  if (HOLIDAYS_DB['Global']?.[key]) return HOLIDAYS_DB['Global'][key];

  return null;
};

export const getRegionFlag = (timezone: string): string => {
  const region = TZ_TO_REGION[timezone];
  switch(region) {
    case 'US': return '🇺🇸';
    case 'GB': return '🇬🇧';
    case 'EU': return '🇪🇺';
    case 'SG': return '🇸🇬';
    case 'JP': return '🇯🇵';
    case 'AU': return '🇦🇺';
    case 'IN': return '🇮🇳';
    case 'BR': return '🇧🇷';
    default: return '🌍';
  }
};