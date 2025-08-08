// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Activity, 
  Shield, 
  Database, 
  Zap, 
  Globe,
  TrendingUp,
  Clock,
  Users,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { osintApi } from '@/services/api';
import type { FrameworkHealth, NotificationState, ServiceStats } from '@/types';

interface DashboardProps {
  frameworkHealth: FrameworkHealth | null;
  isConnected: boolean;
  onAddNotification: (notification: Omit<NotificationState, 'id'>) => void;
}

interface DashboardStats {
  totalSearches: number;
  activeInvestigations: number;
  servicesOnline: number;
  averageResponseTime: number;
  successRate: number;
  dailyActivity: Array<{ time: string; searches: number; }>;
  serviceMetrics: Array<{ name: string; status: string; uptime: number; }>;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  frameworkHealth, 
  isConnected, 
  onAddNotification 
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSearches: 0,
    activeInvestigations: 0,
    servicesOnline: 0,
    averageResponseTime: 0,
    successRate: 0,
    dailyActivity: [],
    serviceMetrics: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'searches' | 'performance' | 'errors'>('searches');

  // Données de démonstration pour les graphiques
  const generateMockData = () => {
    const now = new Date();
    const dailyActivity = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      dailyActivity.push({
        time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        searches: Math.floor(Math.random() * 50) + 10,
        performance: Math.floor(Math.random() * 100) + 500,
        errors: Math.floor(Math.random() * 5)
      });
    }
    
    return {
      totalSearches: 1247,
      activeInvestigations: 23,
      servicesOnline: frameworkHealth ? Object.keys(frameworkHealth.services).filter(
        service => frameworkHealth.services[service].status === 'healthy'
      ).length : 0,
      averageResponseTime: 847,
      successRate: 94.7,
      dailyActivity,
      serviceMetrics: frameworkHealth ? Object.entries(frameworkHealth.services).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        status: data.status,
        uptime: data.status === 'healthy' ? 99.8 : 0
      })) : []
    };
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Simuler le chargement des données
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockStats = generateMockData();
        setStats(mockStats);
        
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        onAddNotification({
          type: 'error',
          message: 'Erreur lors du chargement des statistiques',
          duration: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [frameworkHealth, onAddNotification]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: number;
    color: string;
    description?: string;
  }> = ({ title, value, icon: Icon, trend, color, description }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="card p-6 relative overflow-hidden group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-opacity-20`} style={{ backgroundColor: color + '33' }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-primary">{value}</h3>
        <p className="text-secondary text-sm">{title}</p>
        {description && (
          <p className="text-muted text-xs">{description}</p>
        )}
      </div>

      {/* Effet de glow au hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}
      />
    </motion.div>
  );

  const ServiceStatusCard: React.FC<{
    name: string;
    status: string;
    uptime: number;
  }> = ({ name, status, uptime }) => {
    const getStatusIcon = () => {
      switch (status) {
        case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
        case 'unhealthy': return <XCircle className="w-5 h-5 text-red-400" />;
        default: return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      }
    };

    const getStatusColor = () => {
      switch (status) {
        case 'healthy': return 'border-green-500 bg-green-900/20';
        case 'unhealthy': return 'border-red-500 bg-red-900/20';
        default: return 'border-yellow-500 bg-yellow-900/20';
      }
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-4 rounded-lg border ${getStatusColor()} transition-all duration-300`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-primary">{name}</span>
          {getStatusIcon()}
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-secondary capitalize">{status}</span>
          <span className="text-muted">{uptime}% uptime</span>
        </div>
        
        {/* Barre de progression pour l'uptime */}
        <div className="mt-2 w-full bg-tertiary rounded-full h-1">
          <div 
            className="h-1 rounded-full transition-all duration-500"
            style={{ 
              width: `${uptime}%`,
              backgroundColor: status === 'healthy' ? 'var(--accent-tertiary)' : 'var(--accent-danger)'
            }}
          />
        </div>
      </motion.div>
    );
  };

  const chartData = stats.dailyActivity.map(item => ({
    ...item,
    [selectedMetric]: item[selectedMetric as keyof typeof item]
  }));

  const getChartColor = () => {
    switch (selectedMetric) {
      case 'searches': return 'var(--accent-primary)';
      case 'performance': return 'var(--accent-secondary)';
      case 'errors': return 'var(--accent-danger)';
      default: return 'var(--accent-primary)';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
        <span className="ml-3 text-secondary">Chargement du dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold cyber-text" data-text="OSINT Command Center">
            OSINT Command Center
          </h1>
          <p className="text-secondary mt-2">
            Vue d'ensemble temps réel de votre infrastructure OSINT
          </p>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary"
            onClick={() => onAddNotification({
              type: 'info',
              message: 'Actualisation des données en cours...',
              duration: 3000
            })}
          >
            <Activity className="w-4 h-4" />
            Actualiser
          </motion.button>
        </div>
      </motion.div>

      {/* Status Alert */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-4 border-red-500 bg-red-900/20"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-400">Connexion Framework Perdue</h3>
              <p className="text-sm text-red-300">
                Impossible de se connecter aux services OSINT. Vérifiez la connectivité.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-2 lg:grid-4 gap-6"
      >
        <StatCard
          title="Recherches Totales"
          value={stats.totalSearches.toLocaleString()}
          icon={Search}
          trend={12}
          color="var(--accent-primary)"
          description="Dernières 24h"
        />
        
        <StatCard
          title="Investigations Actives"
          value={stats.activeInvestigations}
          icon={Eye}
          trend={-3}
          color="var(--accent-secondary)"
          description="En cours d'analyse"
        />
        
        <StatCard
          title="Services En Ligne"
          value={`${stats.servicesOnline}/${Object.keys(frameworkHealth?.services || {}).length}`}
          icon={Server}
          color="var(--accent-tertiary)"
          description="Statut système"
        />
        
        <StatCard
          title="Temps de Réponse"
          value={`${stats.averageResponseTime}ms`}
          icon={Zap}
          trend={-8}
          color="var(--accent-warning)"
          description="Moyenne 24h"
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid lg:grid-2 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-primary">Activité en Temps Réel</h2>
            
            <div className="flex gap-2">
              {(['searches', 'performance', 'errors'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 rounded-md text-sm transition-all ${
                    selectedMetric === metric
                      ? 'bg-accent-primary text-bg-primary'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {metric === 'searches' && 'Recherches'}
                  {metric === 'performance' && 'Performance'}
                  {metric === 'errors' && 'Erreurs'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={getChartColor()}
                  fill={getChartColor()}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h2 className="text-xl font-semibold text-primary mb-6">Status des Services</h2>
          
          <div className="space-y-4">
            {stats.serviceMetrics.length > 0 ? (
              stats.serviceMetrics.map((service, index) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <ServiceStatusCard {...service} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted">
                <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun service détecté</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-xl font-semibold text-primary mb-6">Actions Rapides</h2>
        
        <div className="grid grid-2 md:grid-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-secondary p-6 h-auto flex flex-col items-center gap-3"
            onClick={() => window.location.href = '/telegram'}
          >
            <Search className="w-8 h-8 text-accent-primary" />
            <div className="text-center">
              <div className="font-medium">Nouvelle Recherche</div>
              <div className="text-sm text-muted">Telegram OSINT</div>
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-secondary p-6 h-auto flex flex-col items-center gap-3"
            onClick={() => window.location.href = '/multi-search'}
          >
            <Globe className="w-8 h-8 text-accent-secondary" />
            <div className="text-center">
              <div className="font-medium">Multi-Search</div>
              <div className="text-sm text-muted">Tous les services</div>
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-secondary p-6 h-auto flex flex-col items-center gap-3"
            onClick={() => window.location.href = '/investigations'}
          >
            <Database className="w-8 h-8 text-accent-tertiary" />
            <div className="text-center">
              <div className="font-medium">Investigations</div>
              <div className="text-sm text-muted">Gérer les cas</div>
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-secondary p-6 h-auto flex flex-col items-center gap-3"
            onClick={() => window.location.href = '/system'}
          >
            <Shield className="w-8 h-8 text-accent-warning" />
            <div className="text-center">
              <div className="font-medium">Système</div>
              <div className="text-sm text-muted">Status & Logs</div>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;