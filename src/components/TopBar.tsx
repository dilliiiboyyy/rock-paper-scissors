import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export type AppScreen = 'menu' | 'arena' | 'ai_center' | 'tournament' | 'history' | 'settings';

interface TopBarProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onQuickPlay: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeScreen,
  onNavigate,
  isFullscreen,
  onToggleFullscreen,
  onQuickPlay,
}) => {
  const navItems: Array<{ id: AppScreen; label: string }> = [
    { id: 'arena', label: 'Arena' },
    { id: 'ai_center', label: 'AI Center' },
    { id: 'tournament', label: 'Tournament' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#252820] bg-[#F2EBDD]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-8 px-5 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('menu')}
          className="font-display text-xl font-extrabold tracking-tight text-[#252820] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D65D43]"
        >
          Tactile Oracle
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-semibold"
        >
          {navItems.map((item) => {
            const active = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D65D43] ${
                  active
                    ? 'text-[#D65D43] border-b-2 border-[#D65D43]'
                    : 'text-[#252820]/75 hover:text-[#252820]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {activeScreen === 'arena' ? (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="tactile-btn inline-flex items-center gap-2 rounded-lg border-2 border-[#252820] bg-[#D6AA57] px-4 py-2 text-xs font-bold text-[#252820] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onQuickPlay}
              className="tactile-btn rounded-lg border-2 border-[#252820] bg-[#D65D43] px-4 py-2 text-xs font-bold text-[#F2EBDD] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Play Arena
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center justify-around border-t border-[#252820]/15 px-2 py-2 text-xs font-semibold"
      >
        {navItems.map((item) => {
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2 py-1 whitespace-nowrap shrink-0 rounded ${
                active ? 'bg-[#252820] text-[#F2EBDD]' : 'text-[#252820]/80'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
