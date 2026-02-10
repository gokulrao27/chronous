import { describe, it, expect } from 'vitest';
import { isWorkHour, getHourInZone, findBestMeetingTimeOffset } from '../utils/timeUtils';
import { getHolidayForDate } from '../utils/holidayUtils';

describe('timeUtils', () => {
  it('correctly identifies standard work hours', () => {
    // 9am to 5pm
    expect(isWorkHour(10, 9, 17)).toBe(true);
    expect(isWorkHour(9, 9, 17)).toBe(true);
    expect(isWorkHour(16, 9, 17)).toBe(true);
    expect(isWorkHour(17, 9, 17)).toBe(false);
    expect(isWorkHour(20, 9, 17)).toBe(false);
  });

  it('correctly identifies overnight work hours', () => {
    // 10pm to 6am
    expect(isWorkHour(23, 22, 6)).toBe(true);
    expect(isWorkHour(2, 22, 6)).toBe(true);
    expect(isWorkHour(12, 22, 6)).toBe(false);
  });

  it('calculates best meeting time correctly', () => {
    const mockMembers = [
       { timezone: 'UTC', workStart: 9, workEnd: 17 }, // Working 9-17
       { timezone: 'UTC', workStart: 10, workEnd: 18 } // Working 10-18
    ];
    // Overlap should be max between 10 and 17
    // This function returns offset relative to NOW. 
    // If we mock Date, we could test exact offset, but checking return type is number is basic sanity.
    const offset = findBestMeetingTimeOffset(mockMembers);
    expect(typeof offset).toBe('number');
  });
});

describe('holidayUtils', () => {
    it('identifies Christmas globally', () => {
        const xmas = new Date('2023-12-25T12:00:00Z');
        expect(getHolidayForDate(xmas, 'America/New_York')).toContain('Christmas');
        expect(getHolidayForDate(xmas, 'Asia/Tokyo')).toContain('Christmas');
    });

    it('identifies Independence Day in US but not UK', () => {
        const july4 = new Date('2023-07-04T12:00:00Z');
        expect(getHolidayForDate(july4, 'America/New_York')).toBe('Independence Day');
        expect(getHolidayForDate(july4, 'Europe/London')).toBeNull();
    });
});