// frontend/src/components/Notification.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { NotificationState } from '@/types';

interface NotificationProps {
  notification: NotificationState;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success': return 'border-green-500 bg-green-900/20 text-green-400';
      case 'error': return 'border-red-500 bg-red-900/20 text-red-400';
      case 'warning': return 'border-yellow-500 bg-yellow-900/20 text-yellow-400';
      case 'info': return 'border-blue-500 bg-blue-900/20 text-blue-400';
    }
  };

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(onClose, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      className={`p-4 rounded-lg border backdrop-blur-lg max-w-sm ${getColors()}`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default Notification;