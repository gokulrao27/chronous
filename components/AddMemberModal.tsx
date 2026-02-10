import React, { useState } from 'react';
import { X, UserPlus, Briefcase, Globe, Clock, Mail } from 'lucide-react';
import { TeamMember } from '../types';
import { COMMON_TIMEZONES, ROLE_COLORS } from '../constants';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: Omit<TeamMember, 'id' | 'avatarUrl'>) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Engineering',
    timezone: 'UTC',
    workStart: 9,
    workEnd: 17,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      email: formData.email.trim() || undefined,
    });
    onClose();
    setFormData({
      name: '',
      email: '',
      role: 'Engineering',
      timezone: 'UTC',
      workStart: 9,
      workEnd: 17,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-stroke rounded-lg w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-stroke bg-canvas">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <div className="p-1.5 bg-brand-500 rounded text-white shadow-sm">
              <UserPlus className="h-4 w-4" />
            </div>
            Add Team Member
          </h2>
          <button onClick={onClose} className="text-text-sub hover:text-text-main transition-colors p-1 hover:bg-stroke rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-text-muted text-sm shadow-sm"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Alice Walker"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email (Optional)
            </label>
            <input
              type="email"
              className="w-full bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-text-muted text-sm shadow-sm"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="alice@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Role
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 cursor-pointer text-sm shadow-sm"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                {Object.keys(ROLE_COLORS).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className={`w-2.5 h-2.5 rounded-full ${ROLE_COLORS[formData.role]}`}></div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Globe className="w-3 h-3" /> Timezone
            </label>
            <select
              className="w-full bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 text-sm shadow-sm"
              value={formData.timezone}
              onChange={e => setFormData({ ...formData, timezone: e.target.value })}
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3 h-3" /> Start
              </label>
              <select
                className="w-full bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 text-sm shadow-sm"
                value={formData.workStart}
                onChange={e => setFormData({ ...formData, workStart: parseInt(e.target.value) })}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-sub mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3 h-3" /> End
              </label>
              <select
                className="w-full bg-surface border border-stroke rounded-[3px] px-3 py-2 text-text-main focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 text-sm shadow-sm"
                value={formData.workEnd}
                onChange={e => setFormData({ ...formData, workEnd: parseInt(e.target.value) })}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-4 rounded-[3px] transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
