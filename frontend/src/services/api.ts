// frontend/src/services/api.ts
import axios, { AxiosResponse } from 'axios';
import React from 'react';

import type { 
  SearchOptions, 
  SearchResponse, 
  FrameworkHealth, 
  FrameworkInfo,
  TaskStatus,
  ServiceStats
} from '@/types';

// Configuration de l'instance Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error);
    return Promise.reject(error);
  }
);

// Types pour les erreurs API
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

// Fonction utilitaire pour gérer les erreurs
const handleApiError = (error: any): ApiError => {
  if (error.response) {
    return {
      message: error.response.data?.message || error.response.data?.error || 'Erreur du serveur',
      status: error.response.status,
      code: error.response.data?.code,
      details: error.response.data
    };
  } else if (error.request) {
    return {
      message: 'Impossible de contacter le serveur',
      code: 'NETWORK_ERROR'
    };
  } else {
    return {
      message: error.message || 'Erreur inconnue',
      code: 'UNKNOWN_ERROR'
    };
  }
};

// Services API
export const osintApi = {
  // Framework Health & Info
  async getHealth(): Promise<FrameworkHealth> {
    try {
      const response: AxiosResponse<FrameworkHealth> = await api.get('/health');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getInfo(): Promise<FrameworkInfo> {
    try {
      const response: AxiosResponse<FrameworkInfo> = await api.get('/info');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Telegram Service
  async searchTelegram(username: string, options: SearchOptions = {}): Promise<SearchResponse> {
    try {
      const response: AxiosResponse<SearchResponse> = await api.post('/api/telegram/search', {
        username,
        options
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async analyzeTelegram(results: any[], analysisType: string = 'comprehensive'): Promise<any> {
    try {
      const response = await api.post('/api/telegram/analyze', {
        results,
        analysisType
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async exportTelegram(investigationId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    try {
      const response = await api.post('/api/telegram/export', {
        investigationId,
        format
      }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Multi-Service Search
  async multiSearch(query: string, services: string[] = ['telegram'], options: Record<string, any> = {}): Promise<any> {
    try {
      const response = await api.post('/api/search/multi', {
        query,
        services,
        options
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Task Orchestration
  async orchestrateTask(task: string, parameters: any): Promise<TaskStatus> {
    try {
      const response: AxiosResponse<TaskStatus> = await api.post('/api/orchestrate', {
        task,
        parameters
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Service Statistics
  async getServiceStats(serviceName: string): Promise<ServiceStats> {
    try {
      const response: AxiosResponse<ServiceStats> = await api.get(`/api/${serviceName}/stats`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Utilities
  async ping(): Promise<{ pong: boolean; timestamp: string }> {
    try {
      const response = await api.get('/health');
      return {
        pong: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Hook personnalisé pour les requêtes avec gestion d'état
export const useApiCall = <T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  React.useEffect(() => {
    execute();
  }, dependencies);

  return { data, loading, error, execute, refetch: execute };
};

// Export de l'instance axios pour des cas d'usage avancés
export { api };
export default osintApi;