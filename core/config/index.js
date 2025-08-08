// core/config/index.js
require('dotenv').config();

const config = {
  // Configuration générale
  app: {
    name: 'Full OSINT Framework',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Configuration des services
  services: {
    telegram: {
      enabled: true,
      port: 3001,
      host: process.env.TELEGRAM_SERVICE_HOST || 'localhost',
      endpoints: ['/search', '/analyze', '/export'],
      name: 'Telegram OSINT Service'
    },
    socialMedia: {
      enabled: true,
      port: 3002,
      host: process.env.SOCIAL_SERVICE_HOST || 'localhost',
      endpoints: ['/twitter', '/facebook', '/instagram', '/search'],
      name: 'Social Media OSINT Service'
    },
    webIntel: {
      enabled: false, // À développer
      port: 3003,
      host: process.env.WEB_SERVICE_HOST || 'localhost',
      endpoints: ['/domain', '/website', '/subdomain'],
      name: 'Web Intelligence Service'
    },
    imageIntel: {
      enabled: false, // À développer
      port: 3004,
      host: process.env.IMAGE_SERVICE_HOST || 'localhost',
      endpoints: ['/reverse', '/analyze', '/metadata'],
      name: 'Image Intelligence Service'
    }
  },

  // Configuration de l'API Gateway
  gateway: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://192.168.1.24:3000'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requêtes par fenêtre
    }
  },

  // Configuration base de données
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/osint-framework',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0
    }
  },

  // Configuration sécurité
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
  },

  // Configuration des APIs externes
  apis: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID
    },
    bing: {
      apiKey: process.env.BING_API_KEY,
      endpoint: process.env.BING_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search'
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  },

  // Configuration des workers
  workers: {
    enabled: true,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 5,
    retryAttempts: parseInt(process.env.WORKER_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.WORKER_RETRY_DELAY) || 5000
  },

  // Configuration des proxies
  proxies: {
    http: process.env.HTTP_PROXIES ? process.env.HTTP_PROXIES.split(',') : [],
    socks: process.env.SOCKS_PROXIES ? process.env.SOCKS_PROXIES.split(',') : [],
    rotation: process.env.PROXY_ROTATION || 'none'
  }
};

// Validation des configurations critiques
function validateConfig() {
  const errors = [];

  // Vérifier les services activés
  const enabledServices = Object.keys(config.services).filter(
    service => config.services[service].enabled
  );

  if (enabledServices.length === 0) {
    errors.push('Aucun service OSINT activé');
  }

  // Vérifier les ports uniques
  const ports = enabledServices.map(service => config.services[service].port);
  const uniquePorts = [...new Set(ports)];
  
  if (ports.length !== uniquePorts.length) {
    errors.push('Conflit de ports entre les services');
  }

  // Vérifier les clés API critiques
  if (config.services.telegram.enabled && !config.apis.telegram.botToken) {
    console.warn('⚠️  Token Telegram manquant - service Telegram limité');
  }

  if (errors.length > 0) {
    throw new Error(`Erreurs de configuration: ${errors.join(', ')}`);
  }

  return true;
}

// Fonction pour obtenir la configuration d'un service
function getServiceConfig(serviceName) {
  const service = config.services[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} introuvable`);
  }
  return service;
}

// Fonction pour obtenir l'URL complète d'un service
function getServiceUrl(serviceName) {
  const service = getServiceConfig(serviceName);
  return `http://${service.host}:${service.port}`;
}

module.exports = {
  config,
  validateConfig,
  getServiceConfig,
  getServiceUrl
};