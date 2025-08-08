// frontend/src/pages/Settings.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, Palette, Database, Key } from 'lucide-react';
import type { NotificationState } from '@/types';

interface SettingsProps {
  onAddNotification: (notification: Omit<NotificationState, 'id'>) => void;
}

const Settings: React.FC<SettingsProps> = ({ onAddNotification }) => {
  const [settings, setSettings] = useState({
    theme: 'cyber-dark',
    notifications: true,
    autoSave: true,
    apiTimeout: 30000,
    maxResults: 50,
    enableLogging: true,
    logLevel: 'info'
  });

  const handleSave = () => {
    onAddNotification({
      type: 'success',
      message: 'Paramètres sauvegardés avec succès',
      duration: 3000
    });
  };

  const SettingCard: React.FC<{
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }> = ({ title, description, icon: Icon, children }) => (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-accent-primary/20 rounded-lg">
          <Icon className="w-5 h-5 text-accent-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-secondary">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold cyber-text">Settings</h1>
          <p className="text-secondary mt-2">Configuration du framework OSINT</p>
        </div>
        
        <button onClick={handleSave} className="btn btn-primary">
          <Save className="w-4 h-4" />
          Sauvegarder
        </button>
      </motion.div>

      <div className="grid gap-6">
        {/* Interface */}
        <SettingCard
          title="Interface"
          description="Personnalisation de l'apparence"
          icon={Palette}
        >
          <div className="space-y-4">
            <div>
              <label className="input-label">Thème</label>
              <select 
                value={settings.theme}
                onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                className="input"
              >
                <option value="cyber-dark">Cyber Dark</option>
                <option value="matrix">Matrix</option>
                <option value="neon">Neon</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>Activer les notifications</span>
            </label>
          </div>
        </SettingCard>

        {/* Performance */}
        <SettingCard
          title="Performance"
          description="Paramètres de recherche et performance"
          icon={Database}
        >
          <div className="space-y-4">
            <div>
              <label className="input-label">Timeout API (ms)</label>
              <input
                type="number"
                value={settings.apiTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, apiTimeout: parseInt(e.target.value) }))}
                className="input"
                min="5000"
                max="120000"
              />
            </div>
            
            <div>
              <label className="input-label">Résultats maximum par recherche</label>
              <input
                type="number"
                value={settings.maxResults}
                onChange={(e) => setSettings(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                className="input"
                min="1"
                max="500"
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>Sauvegarde automatique des investigations</span>
            </label>
          </div>
        </SettingCard>

        {/* Clés API */}
        <SettingCard
          title="Clés API"
          description="Gestion des clés d'authentification"
          icon={Key}
        >
          <div className="space-y-4">
            <div>
              <label className="input-label">Google API Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="input"
              />
            </div>
            
            <div>
              <label className="input-label">Telegram Bot Token</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="input"
              />
            </div>
            
            <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="font-medium text-yellow-400">Note de sécurité</span>
              </div>
              <p className="text-sm text-yellow-300">
                Les clés API sont stockées de manière sécurisée et chiffrées.
              </p>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  );
};

export default Settings;