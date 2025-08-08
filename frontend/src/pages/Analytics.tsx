// frontend/src/pages/Analytics.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Shield, Zap } from 'lucide-react';

interface AnalyticsProps {
  onAddNotification: (notification: any) => void;
}

const Analytics: React.FC<AnalyticsProps> = () => {
  const mockData = [
    { name: 'Telegram', value: 45, color: '#00ffff' },
    { name: 'Google', value: 30, color: '#ff00ff' },
    { name: 'Social', value: 15, color: '#00ff00' },
    { name: 'Bing', value: 10, color: '#ffaa00' }
  ];

  const weeklyData = [
    { day: 'Lun', searches: 24 },
    { day: 'Mar', searches: 35 },
    { day: 'Mer', searches: 18 },
    { day: 'Jeu', searches: 42 },
    { day: 'Ven', searches: 28 },
    { day: 'Sam', searches: 15 },
    { day: 'Dim', searches: 12 }
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold cyber-text">Analytics</h1>
        <p className="text-secondary mt-2">Analyse des performances et tendances</p>
      </motion.div>

      <div className="grid grid-2 lg:grid-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-900/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Précision</h3>
              <p className="text-2xl font-bold text-blue-400">94.7%</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Croissance</h3>
              <p className="text-2xl font-bold text-green-400">+12%</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-900/20 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold">Vitesse</h3>
              <p className="text-2xl font-bold text-yellow-400">847ms</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Fiabilité</h3>
              <p className="text-2xl font-bold text-purple-400">99.1%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Répartition par Source</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {mockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Activité Hebdomadaire</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="searches" fill="var(--accent-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;