import React, { useState, useRef, useEffect } from 'react';
import {
  ImageIcon,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  Check,
  LayoutDashboard,
  History,
  User as UserIcon,
  LogOut,
  Sliders,
  Shield,
  MessageSquare,
  UserCircle,
  PenTool
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: (event: React.MouseEvent) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isDark,
  onToggleTheme
}) => {
  const location = useLocation();

  const navItems = [
    { id: '/', label: '工作台', icon: LayoutDashboard },
    { id: '/agent', label: '创意工作台', icon: MessageSquare },
    { id: '/history', label: '历史库', icon: History },
  ];

  return (
    <div className="h-[48px] bg-[#F5F5F7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center justify-between px-4 shrink-0 z-50 shadow-sm select-none font-sans transition-colors duration-300 sticky top-0 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80 border-b border-gray-200 dark:border-[#424245]">

      {/* Left: Logo */}
      <div className="flex items-center w-[200px] shrink-0">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-black dark:bg-white p-1 rounded-md shadow-sm group-hover:scale-105 transition-transform">
            <ImageIcon className="text-white dark:text-black w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-[12px] text-black dark:text-white leading-tight">Gemini Image Tools</span>
            <span className="text-[7px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none mt-0.5">Beta v0.5.0</span>
          </div>
        </Link>
      </div>

      {/* Center: Navigation Links */}
      <div className="flex-1 min-w-0 flex items-center justify-center h-full gap-1">
          {navItems.map(item => {
              const isActive = location.pathname === item.id;
              return (
                  <Link
                      key={item.id}
                      to={item.id}
                      className={`
                          px-4 h-full text-[11px] font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-2
                          ${isActive
                            ? 'text-black dark:text-white border-black dark:border-white'
                            : 'text-gray-500 dark:text-[#a1a1a6] hover:text-black dark:hover:text-[#f5f5f7] border-transparent'}
                      `}
                  >
                      {item.label}
                  </Link>
              );
          })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-2 w-[200px] shrink-0">

        <button
          onClick={(e) => onToggleTheme(e)}
          className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#333336] rounded-md transition-all"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <Link
          to="/settings"
          className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#333336] rounded-md transition-all"
        >
          <Settings size={14} />
        </Link>

      </div>
    </div>
  );
};
