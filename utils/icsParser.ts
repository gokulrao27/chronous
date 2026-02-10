import { CalendarEvent } from '../types';

export const parseICS = async (file: File): Promise<CalendarEvent[]> => {
  const text = await file.text();
  const events: CalendarEvent[] = [];
  
  // Basic ICS parsing logic
  // This is a simplified parser. For production, consider using a library like 'ical.js'
  const lines = text.split(/\r\n|\n|\r/);
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;

  const parseDate = (dateStr: string): Date => {
    // Format: YYYYMMDDTHHmmSSZ or YYYYMMDDTHHmmSS
    if (!dateStr) return new Date();
    
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11) || '0');
    const minute = parseInt(dateStr.substring(11, 13) || '0');
    const second = parseInt(dateStr.substring(13, 15) || '0');

    // If it ends in Z, it's UTC
    if (dateStr.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    
    // Otherwise treat as local/floating (simplification for this demo)
    return new Date(year, month, day, hour, minute, second);
  };

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = { id: Math.random().toString(36).substr(2, 9) };
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.title && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as CalendarEvent);
      }
      inEvent = false;
      currentEvent = null;
      continue;
    }

    if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) currentEvent.title = line.substring(8);
      if (line.startsWith('DTSTART:')) currentEvent.start = parseDate(line.substring(8));
      if (line.startsWith('DTSTART;')) currentEvent.start = parseDate(line.split(':')[1]); // Handle TZID params roughly
      if (line.startsWith('DTEND:')) currentEvent.end = parseDate(line.substring(6));
      if (line.startsWith('DTEND;')) currentEvent.end = parseDate(line.split(':')[1]);
      if (line.startsWith('LOCATION:')) currentEvent.location = line.substring(9);
      if (line.startsWith('DESCRIPTION:')) currentEvent.description = line.substring(12);
    }
  }

  return events;
};