import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showNightHours, setShowNightHours] = useState(false);
  const roles = ['All', ...new Set(members.map((member) => member.role))];

  const hours = useMemo(
    () => Array.from({ length: showNightHours ? 24 : 17 }, (_, index) => (showNightHours ? index : index + 7)),
    [showNightHours],
  );

  const selectedDayEvents = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    return myEvents
      .filter((event) => event.end > dayStart && event.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [myEvents, selectedDate]);

  const now = new Date();
  const isViewingToday = startOfDay(now).getTime() === startOfDay(selectedDate).getTime();

  useEffect(() => {
    if (!scrollRef.current || showNightHours) return;
    scrollRef.current.scrollTop = 0;
  }, [selectedDate, showNightHours]);

  const currentTimeTop = useMemo(() => {
    if (!isViewingToday) return null;
    const currentHourValue = now.getHours() + now.getMinutes() / 60;
    const baseHour = showNightHours ? 0 : 7;
    if (currentHourValue < baseHour) return null;
    const offsetHours = currentHourValue - baseHour;
    return offsetHours * 64;
  }, [isViewingToday, now, showNightHours]);

  const navigateDay = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    onDateChange(next);
  };

  return (
    <section className="rounded-sm border border-[#DFE1E6] bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 border-b border-[#DFE1E6] bg-white">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#6B778C] font-semibold">Calendar</div>
          <h3 className="text-xl font-bold text-[#172B4D]">{formatDisplayDate(selectedDate)}</h3>
          <p className="text-sm text-[#6B778C]">{dayTag(selectedDate)} • {userName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            className="inline-flex items-center gap-1 rounded-[3px] border border-[#DFE1E6] px-3 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F4F5F7]"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="rounded-[3px] border border-[#4C9AFF] bg-[#DEEBFF] px-3 py-2 text-sm font-semibold text-[#0052CC] hover:bg-[#B3D4FF]"
          >
            Today
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="inline-flex items-center gap-1 rounded-[3px] border border-[#DFE1E6] px-3 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F4F5F7]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigateDay(-1)}
            className="rounded-[3px] border border-[#DFE1E6] px-3 py-2 text-sm text-[#6B778C] hover:bg-[#F4F5F7]"
          >
            Yesterday
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="rounded-[3px] border border-[#DFE1E6] px-3 py-2 text-sm text-[#6B778C] hover:bg-[#F4F5F7]"
          >
            Tomorrow
          </button>

          <select
            value={filterRole}
            onChange={(event) => onFilterChange(event.target.value)}
            className="rounded-[3px] border border-[#DFE1E6] bg-white px-3 py-2 text-sm text-[#172B4D]"
            aria-label="Filter by role"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNightHours((current) => !current)}
            className="rounded-[3px] border border-[#DFE1E6] px-3 py-2 text-sm text-[#6B778C] hover:bg-[#F4F5F7]"
          >
            {showNightHours ? 'Hide Night Hours' : 'View Night Hours'}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative max-h-[620px] overflow-y-auto">
        {currentTimeTop !== null && (
          <div className="pointer-events-none absolute left-[92px] right-0 z-20" style={{ top: `${currentTimeTop}px` }}>
            <div className="relative border-t-2 border-rose-500">
              <span className="absolute -left-[82px] -top-2 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {hours.map((hour) => {
          const slotStart = new Date(selectedDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(slotStart.getHours() + 1);

          const eventsInHour = selectedDayEvents.filter(
            (event) => event.start < slotEnd && event.end > slotStart,
          );

          const isBestTimeSlot = hour >= 14 && hour < 16;

          return (
            <div
              key={hour}
              onClick={() => onHourClick(slotStart)}
              data-testid={`time-slot-${hour}`}
              className={`group grid grid-cols-[92px_1fr] min-h-[64px] border-b border-[#DFE1E6] transition-colors cursor-pointer ${isBestTimeSlot ? 'bg-[#E3FCEF] hover:bg-[#ABF5D1]' : 'hover:bg-[#F4F5F7]'}`}
            >
              <div className="px-4 py-3 text-sm text-[#6B778C] border-r border-[#DFE1E6]">
                {slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="relative px-4 py-2 space-y-2">
                {isBestTimeSlot && (
                  <div className="inline-flex items-center rounded-[3px] border border-[#36B37E] bg-[#E3FCEF] px-2 py-1 text-[11px] font-semibold text-[#006644]">
                    Best time for Team Meeting
                  </div>
                )}
                {eventsInHour.length === 0 ? (
                  <div className="invisible h-9 rounded-[3px] border border-dashed border-[#4C9AFF] bg-[#DEEBFF] px-3 py-2 text-xs text-[#0052CC] group-hover:visible">
                    Drop a task here or click to schedule
                  </div>
                ) : (
                  eventsInHour.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-[3px] px-3 py-2 text-sm ${event.type === 'block' ? 'border border-sky-200 bg-sky-50 text-sky-900' : 'border border-violet-200 bg-violet-50 text-violet-900'}`}
                    >
                      <p className="font-semibold leading-tight">{event.title}</p>
                      <p className={`text-xs mt-1 ${event.type === 'block' ? 'text-sky-700/90' : 'text-violet-700/90'}`}>
                        {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -{' '}
                        {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
                <div className="pointer-events-none mt-2 border-t border-dashed border-brand-300/70" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-xs text-[#6B778C] bg-white border-t border-[#DFE1E6]">
        <div className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Day view designed for quick planning and meeting placement.
        </div>
        {isViewingToday && <span className="font-semibold text-[#0052CC]">Live day view</span>}
      </div>
    </section>
  );
};
