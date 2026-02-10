import React, { useState } from 'react';
import { Sparkles, Users, Clock, LogIn, LogOut, Mail, Building } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  memberCount: number;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ memberCount, user, onLogin, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="border-b border-stroke glass-panel sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500 p-2 rounded-md shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
                Chronos<span className="text-brand-300">Sync</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-text-sub bg-canvas-subtle px-3 py-1.5 rounded-md border border-stroke">
              <Users className="h-4 w-4" />
              <span className="font-medium">{memberCount} Members</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-2 text-sm text-white font-medium bg-brand-500 px-3 py-1.5 rounded-md shadow-sm">
              <Clock className="h-4 w-4" />
              <span className="tabular-nums">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Local</span>
            </div>

            <div className="h-6 w-px bg-stroke mx-2"></div>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 hover:bg-canvas-subtle p-1.5 rounded-full transition-colors border border-transparent hover:border-stroke"
                >
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-stroke" />
                </button>

                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-stroke rounded-md shadow-xl z-50 animate-fade-in overflow-hidden">
                      <div className="p-4 border-b border-stroke bg-canvas">
                         <p className="font-bold text-text-main">{user.name}</p>
                         <p className="text-xs text-text-muted truncate">{user.email}</p>
                         {user.organization && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded w-fit">
                                <Building className="w-3 h-3" /> {user.organization}
                            </div>
                         )}
                      </div>
                      <div className="p-1">
                        <button 
                          onClick={() => {
                            onLogout();
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-[3px] flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 text-sm font-semibold text-text-main hover:bg-canvas-subtle px-3 py-1.5 rounded-md border border-stroke transition-all active:translate-y-0.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};