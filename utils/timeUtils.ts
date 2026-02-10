export const getCurrentTimeInZone = (timezone: string): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
};

export const formatTimeInZone = (date: Date, timezone: string, formatStr: string = 'h:mm a'): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const getHourInZone = (baseDate: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(baseDate);
  const hourPart = parts.find(p => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : 0;
};

export const getTzOffset = (timezone: string): string => {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    return offset.replace('GMT', 'UTC'); 
  } catch (error) {
    return '';
  }
};

export const isWorkHour = (hour: number, start: number, end: number): boolean => {
  if (start <= end) {
    return hour >= start && hour < end;
  } else {
    // Overnight shift (e.g., 22:00 to 06:00)
    return hour >= start || hour < end;
  }
};

export const getOverlapScore = (hourOffset: number, members: any[]): number => {
  if (members.length === 0) return 0;
  
  const now = new Date();
  const simulatedTime = new Date(now.getTime() + hourOffset * 60 * 60 * 1000);
  
  let workingCount = 0;
  
  members.forEach(member => {
    const localHour = getHourInZone(simulatedTime, member.timezone);
    if (isWorkHour(localHour, member.workStart, member.workEnd)) {
      workingCount++;
    }
  });
  
  return workingCount / members.length;
};

// Returns the hour offset (0-23) relative to now that has maximum overlap
export const findBestMeetingTimeOffset = (members: any[]): number => {
  if (members.length === 0) return 0;
  
  let bestOffset = 0;
  let maxScore = -1;

  // Check next 24 hours
  for (let i = 0; i < 24; i++) {
    const score = getOverlapScore(i, members);
    if (score > maxScore) {
      maxScore = score;
      bestOffset = i;
    }
  }
  return bestOffset;
};