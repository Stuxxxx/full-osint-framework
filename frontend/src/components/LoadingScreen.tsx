// frontend/src/components/LoadingScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4"
        />
        <h2 className="text-xl font-semibold text-accent-primary mb-2">OSINT Framework</h2>
        <p className="text-secondary">Initialisation en cours...</p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;