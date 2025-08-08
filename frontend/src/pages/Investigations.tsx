// frontend/src/pages/Investigations.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Plus, Clock } from 'lucide-react';

interface InvestigationsProps {
  onAddNotification: (notification: any) => void;
}

const Investigations: React.FC<InvestigationsProps> = ({ onAddNotification }) => {
  const mockInvestigations = [
    {
      id: '1',
      title: 'Investigation Alpha',
      target: '@suspicious_user',
      status: 'active',
      createdAt: '2025-08-08T10:00:00Z',
      resultsCount: 47
    },
    {
      id: '2', 
      title: 'Operation Beta',
      target: '@target_channel',
      status: 'completed',
      createdAt: '2025-08-07T15:30:00Z',
      resultsCount: 23
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold cyber-text">Investigations</h1>
          <p className="text-secondary mt-2">Gérez vos enquêtes et analyses OSINT</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => onAddNotification({
            type: 'info',
            message: 'Création d\'investigation en développement',
            duration: 3000
          })}
        >
          <Plus className="w-4 h-4" />
          Nouvelle Investigation
        </button>
      </motion.div>

      <div className="grid gap-4">
        {mockInvestigations.map((investigation, index) => (
          <motion.div
            key={investigation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card p-6 hover:bg-card-hover cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  investigation.status === 'active' 
                    ? 'bg-green-900/20 text-green-400' 
                    : 'bg-blue-900/20 text-blue-400'
                }`}>
                  <Eye className="w-5 h-5" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-primary">{investigation.title}</h3>
                  <p className="text-secondary text-sm">Cible: {investigation.target}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted" />
                    <span className="text-muted text-xs">
                      {new Date(investigation.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`status-badge ${
                  investigation.status === 'active' ? 'status-healthy' : 'status-warning'
                }`}>
                  {investigation.status === 'active' ? 'Actif' : 'Terminé'}
                </div>
                <p className="text-sm text-muted mt-1">
                  {investigation.resultsCount} résultats
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Investigations;