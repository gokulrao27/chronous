import React, { useState, useEffect, useRef } from 'react';
import { TeamMember, CalendarEvent } from '../types';
import { getHourInZone, isWorkHour, getTzOffset, formatTimeInZone } from '../utils/timeUtils';
import { getHolidayForDate, getRegionFlag } from '../utils/holidayUtils';
import { ROLE_COLORS } from '../constants';
import { Clock, Filter, CalendarPlus, Calendar, User, Palmtree, RotateCcw, Lock } from 'lucide-react';

interface TimelineProps {
  members: TeamMember[];
  selectedHourOffset: number;
  onOffsetChange: (offset: number) => void;
  filterRole: string;
  onFilterChange: (role: string) => void;
  onHourClick: (date: Date) => void;
  myEvents?: CalendarEvent[];
  userName?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  members, 
  selectedHourOffset, 
  onOffsetChange,
  filterRole,
  onFilterChange,
  onHourClick,
  myEvents = [],
  userName = 'My Schedule'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const onOffsetChangeRef = useRef(onOffsetChange);
  useEffect(() => {
    onOffsetChangeRef.current = onOffsetChange;
  }, [onOffsetChange]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Base date is current time +/- offset
  const baseDate = new Date(currentTime.getTime() + selectedHourOffset * 60 * 60 * 1000);

  // Generate valid ISO string for the date picker (YYYY-MM-DD)
  const currentDateStr = baseDate.toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD reliably

  const hours = Array.from({ length: 25 }, (_, i) => {
    const d = new Date(baseDate);
    d.setHours(d.getHours() - 12 + i);
    d.setMinutes(0, 0, 0); 
    return d;
  });

  const daySegments: { dateStr: string; startIndex: number; count: number; dateObj: Date }[] = [];
  let currentSegment = { dateStr: '', startIndex: 0, count: 0, dateObj: new Date() };

  hours.forEach((h, i) => {
    const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(h);
    
    if (i === 0) {
      currentSegment = { dateStr, startIndex: i, count: 1, dateObj: h };
    } else if (dateStr === currentSegment.dateStr) {
      currentSegment.count++;
    } else {
      daySegments.push(currentSegment);
      currentSegment = { dateStr, startIndex: i, count: 1, dateObj: h };
    }
  });
  daySegments.push(currentSegment);

  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    const diff = e.clientX - startX.current;
    const offsetChange = -diff / 60; 
    onOffsetChangeRef.current(startOffset.current + offsetChange);
  };

  const handleMouseUp = () => {
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-header')) return;
    startX.current = e.clientX;
    startOffset.current = selectedHourOffset;
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleReset = () => {
    onOffsetChange(0);
    setCurrentTime(new Date()); 
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    
    // Create target date at current time's hour/minute to preserve relative alignment, 
    // or just set to Noon to center the view on that day.
    const targetDate = new Date(e.target.value);
    // Set target to Noon to ensure we land nicely in the middle of the day
    targetDate.setHours(12, 0, 0, 0);
    
    const now = new Date();
    // Calculate difference in HOURS
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    onOffsetChange(diffHours);
  };

  const filteredMembers = filterRole === 'All' 
    ? members 
    : members.filter(m => m.role === filterRole);

  const getOverlapStats = (checkDate: Date) => {
    if (filteredMembers.length === 0) return { count: 0, intensity: 0 };
    let workingCount = 0;
    filteredMembers.forEach(m => {
      const h = getHourInZone(checkDate, m.timezone);
      if (isWorkHour(h, m.workStart, m.workEnd)) workingCount++;
    });
    return { 
      count: workingCount, 
      intensity: workingCount / filteredMembers.length 
    };
  };

  const getHolidaysForSegment = (dateObj: Date) => {
    const holidaysFound: { region: string, name: string, members: string[] }[] = [];
    const processedRegions = new Set<string>();

    filteredMembers.forEach(m => {
      const holidayName = getHolidayForDate(dateObj, m.timezone);
      if (holidayName) {
        const key = `${m.timezone}-${holidayName}`;
        if (!processedRegions.has(key)) {
          holidaysFound.push({
            region: getRegionFlag(m.timezone),
            name: holidayName,
            members: [m.name]
          });
          processedRegions.add(key);
        } else {
           const existing = holidaysFound.find(h => h.name === holidayName && h.region === getRegionFlag(m.timezone));
           existing?.members.push(m.name);
        }
      }
    });
    return holidaysFound;
  };

  const checkMyEvent = (date: Date) => {
    const slotStart = new Date(date);
    const slotEnd = new Date(date);
    slotEnd.setHours(slotEnd.getHours() + 1);

    return myEvents.find(e => {
        return (e.start < slotEnd && e.end > slotStart);
    });
  };

  const roles = ['All', ...new Set(members.map(m => m.role))];

  return (
    <div className="w-full select-none animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-2 gap-4">
        <h3 className="text-text-sub font-semibold flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-brand-500" />
          Timeline
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Date Jump */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Calendar className="h-3 w-3 text-text-muted" />
            </div>
            <input 
                type="date" 
                value={currentDateStr} 
                onChange={handleDateJump}
                className="bg-surface border border-stroke text-text-main text-xs rounded-[3px] block pl-7 p-1.5 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none cursor-pointer shadow-sm w-32"
            />
          </div>

          <div className="relative group flex-1 sm:flex-none">
             <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
               <Filter className="h-3 w-3 text-text-muted" />
             </div>
             <select 
               value={filterRole}
               onChange={(e) => onFilterChange(e.target.value)}
               className="bg-surface border border-stroke text-text-main text-xs rounded-[3px] block w-full pl-7 p-2 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none cursor-pointer shadow-sm"
               aria-label="Filter by role"
             >
               {roles.map(r => <option key={r} value={r}>{r}</option>)}
             </select>
          </div>

          <button 
            onClick={handleReset}
            disabled={Math.abs(selectedHourOffset) < 0.1}
            className={`flex items-center gap-1.5 text-xs whitespace-nowrap px-3 py-2 rounded-[3px] transition-all border border-stroke font-medium shadow-sm active:translate-y-0.5 ${
              Math.abs(selectedHourOffset) < 0.1 
              ? 'bg-canvas-subtle text-text-muted opacity-50 cursor-not-allowed' 
              : 'bg-surface hover:bg-canvas-subtle text-text-main'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Now
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative overflow-hidden bg-surface border border-stroke rounded-md shadow-sm cursor-grab active:cursor-grabbing group"
        onMouseDown={handleMouseDown}
      >
        {/* Center Line Indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_8px_rgba(255,0,0,0.2)] pointer-events-none opacity-60">
          <div className="absolute -top-1 -translate-x-1/2 bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-b-[3px] uppercase tracking-wide">
            Focus
          </div>
        </div>

        {/* Date Header Row */}
        <div className="flex border-b border-stroke bg-canvas-subtle relative z-20 h-8">
           {daySegments.map((segment, i) => {
             const segmentHolidays = getHolidaysForSegment(segment.dateObj);
             return (
              <div 
                key={i} 
                className="flex items-center px-3 border-r border-stroke/50 text-xs text-text-muted font-medium bg-canvas-subtle whitespace-nowrap overflow-hidden relative"
                style={{ width: `${segment.count * 4}rem` }} // 4rem = w-16
              >
                <div className="flex items-center gap-2">
                  <span className={segmentHolidays.length > 0 ? "text-brand-600 font-bold" : "text-text-main"}>{segment.dateStr}</span>
                  
                  {segmentHolidays.map((h, idx) => (
                    <div key={idx} className="group/holiday relative cursor-help">
                       <span className="flex items-center gap-1 bg-surface border border-stroke px-1.5 py-0.5 rounded-[3px] text-[10px] text-text-main hover:bg-white hover:border-brand-300 transition-colors shadow-sm">
                          {h.region} {h.name}
                       </span>
                       <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-stroke p-3 rounded shadow-xl z-50 hidden group-hover/holiday:block animate-fade-in text-left">
                          <div className="text-xs font-bold text-brand-600 mb-1">{h.name}</div>
                          <div className="text-[11px] text-text-sub">
                            Observed by: <br/> {h.members.join(', ')}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
             );
           })}
        </div>

        {/* Hour Header */}
        <div className="flex border-b border-stroke bg-surface z-20 relative">
          {hours.map((date, i) => {
            const { intensity, count } = getOverlapStats(date);
            const isCenter = i === 12; 
            
            const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            const [timeNum, timePeriod] = timeString.split(' ');

            let bgColor = 'transparent';
            if (intensity > 0) {
                if (intensity === 1) {
                    bgColor = `rgba(0, 184, 217, 0.2)`; 
                } else if (intensity > 0.5) {
                    bgColor = `rgba(0, 82, 204, 0.12)`; 
                } else {
                    bgColor = `rgba(0, 82, 204, 0.04)`; 
                }
            }

            return (
              <div 
                key={i} 
                onClick={(e) => {
                    e.stopPropagation();
                    onHourClick(date);
                }}
                onMouseEnter={() => setHoveredHour(i)}
                onMouseLeave={() => setHoveredHour(null)}
                className={`interactive-header flex-shrink-0 w-16 h-10 flex flex-col items-center justify-center border-r border-stroke/50 transition-all relative group/header cursor-pointer hover:bg-brand-50
                  ${isCenter ? 'bg-brand-50' : ''}
                `}
                style={{ backgroundColor: hoveredHour === i ? '' : bgColor }}
                role="button"
                aria-label={`Schedule meeting for ${timeString}`}
              >
                <div className="flex flex-col items-center transition-transform group-hover/header:-translate-y-1">
                    <span className={`text-xs font-bold ${isCenter ? 'text-brand-600' : 'text-text-sub'} group-hover/header:text-brand-600 flex items-baseline gap-0.5`}>
                        {timeNum} <span className="text-[9px] font-medium opacity-80">{timePeriod}</span>
                    </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity">
                    <CalendarPlus className="w-4 h-4 text-brand-500 mt-3" />
                </div>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-text-main text-white text-[10px] py-1 px-2 rounded shadow-lg opacity-0 group-hover/header:opacity-100 transition-opacity whitespace-nowrap z-40 pointer-events-none font-medium">
                    <div>Click to Schedule</div>
                    <div className="text-white/70">{count}/{filteredMembers.length} Available</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Member Rows */}
        <div className="divide-y divide-stroke max-h-[450px] overflow-y-auto custom-scrollbar relative z-10 bg-surface">
          
          {/* User's Own Schedule (Top Row) */}
          <div className="flex relative bg-brand-50/30 group/row border-b border-stroke border-dashed">
            <div className="sticky left-0 w-48 bg-brand-50/90 backdrop-blur z-20 border-r border-stroke flex items-center p-2.5 gap-3 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                <div className="relative">
                    <div className="w-8 h-8 rounded-full border border-brand-200 bg-white flex items-center justify-center">
                        <User className="w-4 h-4 text-brand-500" />
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-brand-800 truncate">{userName}</div>
                    <div className="text-[10px] text-brand-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Your Calendar
                    </div>
                </div>
            </div>
            <div className="flex">
                {hours.map((date, i) => {
                    const event = checkMyEvent(date);
                    // Determine styling based on event type
                    let eventClasses = "bg-brand-200 border-brand-300 text-brand-900";
                    let Icon = null;

                    if (event?.type === 'block') {
                        eventClasses = "bg-gray-200 border-gray-300 text-gray-700";
                        Icon = Lock;
                    } else if (event?.type === 'holiday') {
                        eventClasses = "bg-amber-100 border-amber-300 text-amber-800";
                        Icon = Palmtree;
                    }

                    return (
                        <div key={i} className="flex-shrink-0 w-16 h-12 border-r border-brand-200/30 flex items-center justify-center relative">
                            {event && (
                                <div 
                                    className={`absolute inset-x-0.5 inset-y-1 rounded text-[9px] p-1 leading-tight overflow-hidden text-center flex items-center justify-center font-medium cursor-help shadow-sm border ${eventClasses}`}
                                    title={`${event.title} (${event.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`}
                                >
                                    <span className="truncate flex items-center gap-1">
                                        {Icon && <Icon className="w-2 h-2 shrink-0" />}
                                        {event.title}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>

          {filteredMembers.length === 0 && (
             <div className="p-8 text-center text-text-muted text-sm italic">
                No members found matching filter "{filterRole}"
             </div>
          )}
          
          {filteredMembers.map(member => (
            <div key={member.id} className="flex relative hover:bg-canvas transition-colors group/row">
              {/* Sticky Name Column */}
              <div className="sticky left-0 w-48 bg-surface z-20 border-r border-stroke flex items-center p-2.5 gap-3 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                <div className="relative">
                    <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full border border-stroke bg-canvas object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-surface rounded-full p-0.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${ROLE_COLORS[member.role] || 'bg-gray-500'}`}></div>
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-main truncate group-hover/row:text-brand-600 transition-colors">{member.name}</div>
                  <div className="relative group/tz max-w-full">
                      <div className="text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wide truncate font-semibold cursor-help">
                        {getRegionFlag(member.timezone)} 
                        <span className="truncate">{member.timezone.split('/')[1].replace('_', ' ')}</span>
                        <span className="bg-stroke/50 px-1 rounded text-[9px] text-text-sub lowercase tracking-normal whitespace-nowrap ml-1">
                            {getTzOffset(member.timezone)}
                        </span>
                      </div>
                      <div className="absolute top-full left-0 mt-1 z-50 hidden group-hover/tz:block animate-fade-in pointer-events-none">
                          <div className="bg-text-main text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
                              <div className="font-bold mb-0.5 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-brand-300" />
                                {formatTimeInZone(currentTime, member.timezone)}
                              </div>
                              <div className="text-[10px] opacity-80 font-normal">
                                 {member.timezone} • {getTzOffset(member.timezone)}
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>

              {/* Time Blocks */}
              <div className="flex">
                {hours.map((date, i) => {
                  const localHour = getHourInZone(date, member.timezone);
                  const isWorking = isWorkHour(localHour, member.workStart, member.workEnd);
                  const isSleeping = localHour >= 23 || localHour < 7;
                  const holiday = getHolidayForDate(date, member.timezone);
                  
                  const tooltipTime = new Date(date);
                  tooltipTime.setHours(localHour);
                  const displayLocalTime = tooltipTime.toLocaleTimeString('en-US', {hour: 'numeric', hour12: true});

                  return (
                    <div 
                      key={i} 
                      className={`flex-shrink-0 w-16 h-12 border-r border-stroke/30 flex items-center justify-center relative group/cell transition-colors cursor-help`}
                      title={holiday ? `🎉 ${holiday} (Holiday)` : `${displayLocalTime}`}
                    >
                      {holiday && (
                        <div className="absolute inset-0 bg-amber-50 z-0">
                            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#d97706 1.5px, transparent 1.5px)', backgroundSize: '6px 6px' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <Palmtree className="w-8 h-8 text-amber-600" />
                            </div>
                        </div>
                      )}
                      
                      {isWorking && !holiday && (
                        <div className="absolute inset-x-[1px] inset-y-3 rounded-sm bg-brand-500/15 border-l-2 border-brand-500 z-10"></div>
                      )}
                      
                      {isWorking && holiday && (
                        <div className="absolute inset-x-[1px] inset-y-3 rounded-sm border-2 border-dashed border-amber-500/50 bg-amber-500/10 z-10"></div>
                      )}

                      {isSleeping && !holiday && (
                        <div className="absolute inset-0 bg-canvas-subtle/80 striped-bg z-0 pointer-events-none"></div>
                      )}
                      
                      <span className={`relative z-20 text-[10px] font-bold transition-all duration-200
                        ${holiday 
                            ? 'text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-full border border-amber-200 shadow-sm opacity-100 scale-90' 
                            : 'opacity-0 group-hover/row:opacity-100 group-hover/cell:opacity-100'
                        }
                        ${!holiday && isWorking ? 'text-brand-600' : ''}
                        ${!holiday && !isWorking ? 'text-text-muted' : ''}
                      `}>
                         {holiday ? <Palmtree className="w-3 h-3" /> : localHour}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center mt-6 gap-8 text-[11px] font-medium text-text-sub">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-500/15 border-l-2 border-brand-500 rounded-sm"></div>
          <span>Working Hours</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-brand-200 border border-brand-300 rounded-sm"></div>
           <span>Scheduled Meeting</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded-sm"></div>
           <span>Blocked Time</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm"></div>
           <span>Holiday</span>
        </div>
      </div>
    </div>
  );
};