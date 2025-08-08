// frontend/src/components/Header.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, Settings, User } from 'lucide-react';
import type { FrameworkHealth } from '@/types';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  isConnected: boolean;
  frameworkHealth: FrameworkHealth | null;
}

const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  sidebarCollapsed,
  isConnected,
  frameworkHealth
}) => {
  return (
    <header className="bg-secondary border-b border-primary p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg bg-tertiary hover:bg-card transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h2 className="text-lg font-semibold text-primary">Command Center</h2>
            <p className="text-sm text-muted">
              {isConnected ? 'Système opérationnel' : 'Hors ligne'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-lg bg-tertiary hover:bg-card transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5 text-secondary" />
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-lg bg-tertiary hover:bg-card transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5 text-secondary" />
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-lg bg-tertiary hover:bg-card transition-colors cursor-pointer"
          >
            <User className="w-5 h-5 text-secondary" />
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;