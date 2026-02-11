import React, { useMemo } from 'react';
import { CalendarEvent, TeamMember } from '../types';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface TimelineProps {
  members: TeamMember[];
  filterRole: string;
  onFilterChange: (role: string) => void;
  onHourClick: (date: Date) => void;
  myEvents?: CalendarEvent[];
  userName?: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const dayTag = (date: Date) => {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(date).getTime();
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return diff > 1 ? `In ${diff} days` : `${Math.abs(diff)} days ago`;
};

export const Timeline: React.FC<TimelineProps> = ({
  members,
  filterRole,
  onFilterChange,
  onHourClick,
  myEvents = [],
  userName = 'My Schedule',
  selectedDate,
  onDateChange,
}) => {
  const roles = ['All', ...new Set(members.map((member) => member.role))];

  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  const selectedDayEvents = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    return myEvents
      .filter((event) => event.end > dayStart && event.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [myEvents, selectedDate]);

  const now = new Date();
  const isViewingToday = startOfDay(now).getTime() === startOfDay(selectedDate).getTime();

  const navigateDay = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    onDateChange(next);
  };

  return (
    <section className="rounded-2xl border border-stroke bg-surface shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 border-b border-stroke bg-canvas-subtle">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">Calendar</div>
          <h3 className="text-xl font-bold text-text-main">{formatDisplayDate(selectedDate)}</h3>
          <p className="text-sm text-text-sub">{dayTag(selectedDate)} • {userName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            className="inline-flex items-center gap-1 rounded-md border border-stroke px-3 py-2 text-sm font-medium text-text-main hover:bg-canvas"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="rounded-md border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            Today
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="inline-flex items-center gap-1 rounded-md border border-stroke px-3 py-2 text-sm font-medium text-text-main hover:bg-canvas"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigateDay(-1)}
            className="rounded-md border border-stroke px-3 py-2 text-sm text-text-sub hover:bg-canvas"
          >
            Yesterday
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="rounded-md border border-stroke px-3 py-2 text-sm text-text-sub hover:bg-canvas"
          >
            Tomorrow
          </button>

          <select
            value={filterRole}
            onChange={(event) => onFilterChange(event.target.value)}
            className="rounded-md border border-stroke bg-surface px-3 py-2 text-sm text-text-main"
            aria-label="Filter by role"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[620px] overflow-y-auto">
        {hours.map((hour) => {
          const slotStart = new Date(selectedDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(slotStart.getHours() + 1);

          const eventsInHour = selectedDayEvents.filter(
            (event) => event.start < slotEnd && event.end > slotStart,
          );

          return (
            <div
              key={hour}
              onClick={() => onHourClick(slotStart)}
              className="grid grid-cols-[92px_1fr] min-h-[64px] border-b border-stroke/80 hover:bg-canvas transition-colors cursor-pointer"
            >
              <div className="px-4 py-3 text-sm text-text-muted border-r border-stroke/60">
                {slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="px-4 py-2 space-y-2">
                {eventsInHour.length === 0 ? (
                  <div className="text-xs text-text-muted/80">Click to schedule</div>
                ) : (
                  eventsInHour.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
                    >
                      <p className="font-semibold leading-tight">{event.title}</p>
                      <p className="text-xs text-brand-700/90 mt-1">
                        {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -{' '}
                        {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-xs text-text-muted bg-canvas-subtle border-t border-stroke">
        <div className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Day view designed for quick planning and meeting placement.
        </div>
        {isViewingToday && <span className="font-semibold text-brand-600">Live day view</span>}
      </div>
    </section>
  );
};
