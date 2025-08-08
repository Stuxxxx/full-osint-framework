// frontend/src/pages/TelegramSearch.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader } from 'lucide-react';
import { osintApi } from '@/services/api';
import type { NotificationState, SearchOptions, SearchResponse } from '@/types';

interface TelegramSearchProps {
  onAddNotification: (notification: Omit<NotificationState, 'id'>) => void;
}

const TelegramSearch: React.FC<TelegramSearchProps> = ({ onAddNotification }) => {
  const [username, setUsername] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    telegramApi: true,
    google: false,
    bing: false,
    social: false,
    aiAnalysis: false,
    maxResults: 10
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) {
      onAddNotification({
        type: 'warning',
        message: 'Veuillez saisir un nom d\'utilisateur',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await osintApi.searchTelegram(username, options);
      setResults(response);
      onAddNotification({
        type: 'success',
        message: `Recherche terminée: ${response.data.totalResults} résultats trouvés`,
        duration: 5000
      });
    } catch (error: any) {
      onAddNotification({
        type: 'error',
        message: error.message || 'Erreur lors de la recherche',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold cyber-text" data-text="Telegram OSINT">
          Telegram OSINT
        </h1>
        <p className="text-secondary mt-2">
          Recherche avancée et analyse d'intelligence sur Telegram
        </p>
      </motion.div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Nouvelle Recherche</h2>
        
        <div className="space-y-4">
          <div>
            <label className="input-label">Nom d'utilisateur Telegram</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Saisir le nom d'utilisateur (sans @)"
              className="input"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.telegramApi}
                onChange={(e) => setOptions(prev => ({ ...prev, telegramApi: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>API Telegram</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.google}
                onChange={(e) => setOptions(prev => ({ ...prev, google: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>Recherche Google</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.bing}
                onChange={(e) => setOptions(prev => ({ ...prev, bing: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>Recherche Bing</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.aiAnalysis}
                onChange={(e) => setOptions(prev => ({ ...prev, aiAnalysis: e.target.checked }))}
                className="rounded border-primary"
              />
              <span>Analyse IA</span>
            </label>
          </div>

          <div>
            <label className="input-label">Nombre max de résultats</label>
            <input
              type="number"
              value={options.maxResults}
              onChange={(e) => setOptions(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 10 }))}
              min="1"
              max="100"
              className="input"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Lancer la recherche
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Résultats</h2>
          <pre className="terminal text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
};

export default TelegramSearch;