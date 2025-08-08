// frontend/src/pages/MultiSearch.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface MultiSearchProps {
  onAddNotification: (notification: any) => void;
}

const MultiSearch: React.FC<MultiSearchProps> = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold cyber-text">Multi-Search</h1>
        <p className="text-secondary mt-2">Recherche simultanée sur tous les services</p>
      </motion.div>
      
      <div className="card p-6">
        <p className="text-center text-muted">🚧 Multi-Search en développement</p>
      </div>
    </div>
  );
};

export default MultiSearch;