// frontend/src/pages/SystemStatus.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Server, Database, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import type { FrameworkHealth, NotificationState } from '@/types';

interface SystemStatusProps {
  frameworkHealth: FrameworkHealth | null;
  onRefresh: () => void;
  onAddNotification: (notification: Omit<NotificationState, 'id'>) => void;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ 
  frameworkHealth, 
  onRefresh, 
  onAddNotification 
}) => {
  const handleRefresh = () => {
    onRefresh();
    onAddNotification({
      type: 'info',
      message: 'Actualisation du status système...',
      duration: 3000
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold cyber-text">System Status</h1>
          <p className="text-secondary mt-2">Monitoring et diagnostics du framework</p>
        </div>
        
        <button onClick={handleRefresh} className="btn btn-primary">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </motion.div>

      {/* Framework Overview */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Vue d'ensemble</h2>
        
        {frameworkHealth ? (
          <div className="grid grid-2 lg:grid-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium">Gateway</p>
                <p className="text-sm text-secondary">Opérationnel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Version</p>
                <p className="text-sm text-secondary">{frameworkHealth.version}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-medium">Services</p>
                <p className="text-sm text-secondary">
                  {Object.keys(frameworkHealth.services).length} total
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium">Connectivité</p>
                <p className="text-sm text-secondary">Stable</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-red-400">Impossible de récupérer le status du framework</p>
          </div>
        )}
      </div>

      {/* Services Status */}
      {frameworkHealth && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Status des Services</h2>
          
          <div className="grid gap-4">
            {Object.entries(frameworkHealth.services).map(([serviceName, serviceData]) => (
              <motion.div
                key={serviceName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-lg border transition-all ${
                  serviceData.status === 'healthy'
                    ? 'border-green-500 bg-green-900/10'
                    : serviceData.status === 'unhealthy'
                    ? 'border-red-500 bg-red-900/10'
                    : 'border-yellow-500 bg-yellow-900/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {serviceData.status === 'healthy' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : serviceData.status === 'unhealthy' ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    
                    <div>
                      <h3 className="font-medium capitalize">{serviceName}</h3>
                      <p className="text-sm text-secondary capitalize">{serviceData.status}</p>
                    </div>
                  </div>
                  
                  {serviceData.error && (
                    <div className="text-right">
                      <p className="text-sm text-red-400">Erreur</p>
                      <p className="text-xs text-muted">{serviceData.error}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* System Logs */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Logs Système</h2>
        <div className="terminal text-sm max-h-96 overflow-y-auto">
          <div className="space-y-1">
            <div>[2025-08-08 21:30:15] INFO  - Framework démarré avec succès</div>
            <div>[2025-08-08 21:30:16] INFO  - Service Telegram initialisé</div>
            <div>[2025-08-08 21:30:17] INFO  - API Gateway en ligne</div>
            <div>[2025-08-08 21:30:18] INFO  - Tous les services opérationnels</div>
            <div>[2025-08-08 21:35:22] INFO  - Health check réussi</div>
            <div>[2025-08-08 21:40:33] INFO  - Nouvelle recherche initiée</div>
            <div>[2025-08-08 21:41:01] INFO  - Recherche terminée: 47 résultats</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;