import React, { useState, useEffect } from 'react';
import { X, Clock, Coffee, Lock, Calendar, Palmtree, ArrowRight } from 'lucide-react';
import { CalendarEvent } from '../types';

interface ManualBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: CalendarEvent) => void;
}

export const ManualBlockModal: React.FC<ManualBlockModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [fromDateStr, setFromDateStr] = useState(''); // YYYY-MM-DD
  const [toDateStr, setToDateStr] = useState('');     // YYYY-MM-DD
  const [eventType, setEventType] = useState<'block' | 'holiday'>('block');
  const [startHour, setStartHour] = useState(9); 
  const [duration, setDuration] = useState(1);
  const [isFullDay, setIsFullDay] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setFromDateStr(todayStr);
      setToDateStr(todayStr);
      setTitle('Deep Work');
      setEventType('block');
      setStartHour(13);
      setDuration(2);
      setIsFullDay(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse the selected dates
    const [fYear, fMonth, fDay] = fromDateStr.split('-').map(Number);
    const [tYear, tMonth, tDay] = toDateStr.split('-').map(Number);
    
    const startDate = new Date(fYear, fMonth - 1, fDay);
    const endDate = new Date(tYear, tMonth - 1, tDay);

    // Validation
    if (endDate < startDate) {
        alert("End date cannot be before start date");
        return;
    }

    if (eventType === 'holiday' || isFullDay) {
        // Full day event (Start of first day to End of last day)
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    } else {
        // Specific time block
        // If it's a single day, just add duration
        // If it's multi-day block with specific time, we treat it as one long continuous block 
        // starting at StartTime on Day 1 and ending at StartTime+Duration on Day N (or just pure duration)
        // For simplicity in this UI: Start time applies to the START DATE. Duration adds hours to that.
        startDate.setHours(startHour, 0, 0, 0);
        
        // If From == To, endDate is calculated by duration
        // If From != To, we assume they want to block until the End Date. 
        // Logic: Set end date time to (StartHour + Duration) 
        // This allows "Overnight" blocks or multi-day workshops.
        endDate.setHours(startHour + duration, 0, 0, 0);
    }

    onAdd({
      id: Date.now().toString(),
      title: title || (eventType === 'holiday' ? 'Holiday' : 'Busy'),
      start: startDate,
      end: endDate,
      type: eventType,
      description: eventType === 'holiday' ? 'Personal Holiday' : 'Manually blocked time'
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-stroke rounded-lg w-full max-w-sm shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center p-4 border-b border-stroke bg-canvas">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            {eventType === 'holiday' ? <Palmtree className="h-4 w-4 text-amber-600" /> : <Lock className="h-4 w-4 text-text-sub" />}
            {eventType === 'holiday' ? 'Add Holiday' : 'Block Time'}
          </h2>
          <button onClick={onClose} className="text-text-sub hover:text-text-main">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Event Type Toggle */}
          <div className="flex bg-canvas-subtle p-1 rounded-[3px] border border-stroke">
            <button
                type="button"
                onClick={() => setEventType('block')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-[2px] transition-all flex items-center justify-center gap-2 ${
                    eventType === 'block' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
            >
                <Lock className="w-3 h-3" /> Block Work
            </button>
            <button
                type="button"
                onClick={() => {
                    setEventType('holiday');
                    setTitle('Out of Office');
                }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-[2px] transition-all flex items-center justify-center gap-2 ${
                    eventType === 'holiday' ? 'bg-white text-amber-600 shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
            >
                <Palmtree className="w-3 h-3" /> Holiday
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase">Title</label>
            <input
              type="text"
              className="w-full bg-surface border border-stroke rounded p-2 text-sm text-text-main focus:ring-2 focus:ring-brand-100 outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={eventType === 'holiday' ? "e.g. Vacation, National Day" : "e.g. Deep Work"}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase">From</label>
                <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input 
                        type="date" 
                        required
                        className="w-full bg-surface border border-stroke rounded p-2 pl-8 text-xs text-text-main focus:ring-2 focus:ring-brand-100 outline-none"
                        value={fromDateStr}
                        onChange={e => {
                            setFromDateStr(e.target.value);
                            // Auto-update 'To' if it's before 'From'
                            if (toDateStr < e.target.value) setToDateStr(e.target.value);
                        }}
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase">To</label>
                <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input 
                        type="date" 
                        required
                        min={fromDateStr}
                        className="w-full bg-surface border border-stroke rounded p-2 pl-8 text-xs text-text-main focus:ring-2 focus:ring-brand-100 outline-none"
                        value={toDateStr}
                        onChange={e => setToDateStr(e.target.value)}
                    />
                </div>
            </div>
          </div>

          {eventType === 'block' && (
              <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="fullDay" 
                    checked={isFullDay} 
                    onChange={e => setIsFullDay(e.target.checked)}
                    className="rounded border-stroke text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="fullDay" className="text-sm text-text-main">All Day</label>
              </div>
          )}

          {eventType === 'block' && !isFullDay && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div>
                <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase">Start Time</label>
                <select 
                    className="w-full bg-surface border border-stroke rounded p-2 text-sm"
                    value={startHour}
                    onChange={e => setStartHour(Number(e.target.value))}
                >
                    {Array.from({length: 24}).map((_, i) => (
                    <option key={i} value={i}>{i}:00</option>
                    ))}
                </select>
                </div>
                <div>
                <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase">Duration (Hrs)</label>
                <input 
                    type="number" 
                    min="1" 
                    max="24" 
                    className="w-full bg-surface border border-stroke rounded p-2 text-sm"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                />
                </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full font-medium py-2 rounded shadow-md transition-colors mt-2 text-white ${
                eventType === 'holiday' 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-text-main hover:bg-text-sub'
            }`}
          >
            {eventType === 'holiday' ? 'Add Holiday' : 'Block Time'}
          </button>
        </form>
      </div>
    </div>
  );
};