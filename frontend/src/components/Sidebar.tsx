// frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import type { FrameworkHealth } from '@/types';

interface SidebarProps {
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    color: string;
  }>;
  collapsed: boolean;
  onToggle: () => void;
  frameworkHealth: FrameworkHealth | null;
  isConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  items, 
  collapsed, 
  onToggle, 
  frameworkHealth,
  isConnected 
}) => {
  return (
    <div className={`bg-secondary border-r border-primary h-screen transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-primary">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-lg font-bold text-accent-primary">OSINT Framework</h1>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-tertiary hover:bg-card transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 p-3 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-card border border-accent-primary text-accent-primary' 
                : 'text-secondary hover:text-primary hover:bg-tertiary'
              }
            `}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-tertiary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
            {frameworkHealth && (
              <div className="text-xs text-muted">
                v{frameworkHealth.version}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;