// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Activity, 
  Settings, 
  Database, 
  Shield, 
  Terminal,
  Eye,
  Zap,
  Globe,
  Server
} from 'lucide-react';

// Import des composants
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/pages/Dashboard';
import TelegramSearch from '@/pages/TelegramSearch';
import MultiSearch from '@/pages/MultiSearch';
import Investigations from '@/pages/Investigations';
import Analytics from '@/pages/Analytics';
import SystemStatus from '@/pages/SystemStatus';
import SettingsPage from '@/pages/Settings';
import LoadingScreen from '@/components/LoadingScreen';
import Notification from '@/components/Notification';

// Import des services
import { osintApi } from '@/services/api';
import type { FrameworkHealth, NotificationState } from '@/types';

// Import des styles
import '@/styles/globals.css';

interface AppState {
  isLoading: boolean;
  isConnected: boolean;
  frameworkHealth: FrameworkHealth | null;
  notifications: NotificationState[];
  sidebarCollapsed: boolean;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isConnected: false,
    frameworkHealth: null,
    notifications: [],
    sidebarCollapsed: false
  });

  // Navigation items avec leurs icônes et couleurs
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
      path: '/dashboard',
      color: 'var(--accent-primary)'
    },
    {
      id: 'telegram',
      label: 'Telegram OSINT',
      icon: Search,
      path: '/telegram',
      color: 'var(--accent-secondary)'
    },
    {
      id: 'multi-search',
      label: 'Multi-Search',
      icon: Globe,
      path: '/multi-search',
      color: 'var(--accent-tertiary)'
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: Eye,
      path: '/investigations',
      color: 'var(--accent-warning)'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: Zap,
      path: '/analytics',
      color: 'var(--accent-primary)'
    },
    {
      id: 'system',
      label: 'System Status',
      icon: Server,
      path: '/system',
      color: 'var(--accent-danger)'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      color: 'var(--text-secondary)'
    }
  ];

  // Initialisation de l'application
  useEffect(() => {
    initializeApp();
    
    // Vérification périodique de la santé du framework
    const healthCheckInterval = setInterval(checkFrameworkHealth, 30000);
    
    return () => clearInterval(healthCheckInterval);
  }, []);

  const initializeApp = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Vérifier la connectivité
      await checkFrameworkHealth();
      
      // Simulation d'initialisation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isConnected: true 
      }));
      
      addNotification({
        type: 'success',
        message: 'Framework OSINT initialisé avec succès',
        duration: 5000
      });
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isConnected: false 
      }));
      
      addNotification({
        type: 'error',
        message: 'Impossible de se connecter au framework',
        duration: 10000
      });
    }
  };

  const checkFrameworkHealth = async () => {
    try {
      const health = await osintApi.getHealth();
      setState(prev => ({ 
        ...prev, 
        frameworkHealth: health, 
        isConnected: true 
      }));
    } catch (error) {
      console.error('Health check failed:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false 
      }));
    }
  };

  const addNotification = (notification: Omit<NotificationState, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: NotificationState = { ...notification, id };
    
    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification]
    }));
    
    // Auto-remove notification
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  };

  const toggleSidebar = () => {
    setState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  };

  // Animation variants
  const pageVariants = {
    initial: { 
      opacity: 0, 
      x: -20,
      scale: 0.98
    },
    in: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    out: { 
      opacity: 0, 
      x: 20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="app-container min-h-screen bg-primary flex">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="cyber-grid opacity-5"></div>
          <div className="floating-particles"></div>
        </div>

        {/* Sidebar */}
        <motion.div
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative z-10 ${state.sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}
        >
          <Sidebar
            items={navigationItems}
            collapsed={state.sidebarCollapsed}
            onToggle={toggleSidebar}
            frameworkHealth={state.frameworkHealth}
            isConnected={state.isConnected}
          />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative z-10">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Header
              onToggleSidebar={toggleSidebar}
              sidebarCollapsed={state.sidebarCollapsed}
              isConnected={state.isConnected}
              frameworkHealth={state.frameworkHealth}
            />
          </motion.div>

          {/* Page Content */}
          <motion.main
            className="flex-1 p-6 overflow-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route 
                  path="/dashboard" 
                  element={
                    <motion.div
                      key="dashboard"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <Dashboard 
                        frameworkHealth={state.frameworkHealth}
                        isConnected={state.isConnected}
                        onAddNotification={addNotification}
                      />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/telegram" 
                  element={
                    <motion.div
                      key="telegram"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <TelegramSearch onAddNotification={addNotification} />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/multi-search" 
                  element={
                    <motion.div
                      key="multi-search"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <MultiSearch onAddNotification={addNotification} />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/investigations" 
                  element={
                    <motion.div
                      key="investigations"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <Investigations onAddNotification={addNotification} />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/analytics" 
                  element={
                    <motion.div
                      key="analytics"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <Analytics onAddNotification={addNotification} />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/system" 
                  element={
                    <motion.div
                      key="system"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <SystemStatus 
                        frameworkHealth={state.frameworkHealth}
                        onRefresh={checkFrameworkHealth}
                        onAddNotification={addNotification}
                      />
                    </motion.div>
                  } 
                />
                
                <Route 
                  path="/settings" 
                  element={
                    <motion.div
                      key="settings"
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                    >
                      <SettingsPage onAddNotification={addNotification} />
                    </motion.div>
                  } 
                />
              </Routes>
            </AnimatePresence>
          </motion.main>
        </div>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {state.notifications.map((notification) => (
              <Notification
                key={notification.id}
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Connection Status Indicator */}
        <motion.div
          className="fixed bottom-4 right-4 z-40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
        >
          <div className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm
            ${state.isConnected 
              ? 'bg-green-900/50 text-green-400 border border-green-500' 
              : 'bg-red-900/50 text-red-400 border border-red-500'
            }
          `}>
            <div className={`
              w-2 h-2 rounded-full
              ${state.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}
            `} />
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </motion.div>
      </div>
    </Router>
  );
};

export default App;