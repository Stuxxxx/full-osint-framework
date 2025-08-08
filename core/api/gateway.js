// core/api/gateway.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { config, getServiceUrl } = require('../config');

class APIGateway {
  constructor() {
    this.app = express();
    this.services = new Map();
    this.isRunning = false;
    
    this.setupMiddleware();
    this.setupRoutes();
    
    console.log('🌐 API Gateway initialisé');
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors(config.gateway.cors));
    
    // Sécurité
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.gateway.rateLimit.windowMs,
      max: config.gateway.rateLimit.max,
      message: {
        error: 'Trop de requêtes',
        retryAfter: Math.ceil(config.gateway.rateLimit.windowMs / 1000)
      }
    });
    this.app.use('/api/', limiter);
    
    // Logging
    this.app.use(morgan('combined'));
    
    // Parsing JSON
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Headers personnalisés
    this.app.use((req, res, next) => {
      res.setHeader('X-Gateway-Version', config.app.version);
      res.setHeader('X-Powered-By', 'Full OSINT Framework');
      next();
    });
  }

  setupRoutes() {
    // Route de santé du gateway
    this.app.get('/health', async (req, res) => {
      const health = await this.checkServicesHealth();
      res.json({
        gateway: 'healthy',
        version: config.app.version,
        timestamp: new Date().toISOString(),
        services: health
      });
    });

    // Route d'information du framework
    this.app.get('/info', (req, res) => {
      res.json({
        name: config.app.name,
        version: config.app.version,
        environment: config.app.environment,
        services: Object.keys(config.services).map(serviceName => ({
          name: serviceName,
          enabled: config.services[serviceName].enabled,
          endpoints: config.services[serviceName].endpoints,
          url: config.services[serviceName].enabled ? getServiceUrl(serviceName) : null
        }))
      });
    });

    // Routes des services - Telegram
    this.app.all('/api/telegram/*', (req, res) => {
      this.proxyToService('telegram', req, res);
    });

    // Routes des services - Social Media (futur)
    this.app.all('/api/social/*', (req, res) => {
      this.proxyToService('socialMedia', req, res);
    });

    // Routes des services - Web Intelligence (futur)
    this.app.all('/api/web/*', (req, res) => {
      this.proxyToService('webIntel', req, res);
    });

    // Routes des services - Image Intelligence (futur)
    this.app.all('/api/image/*', (req, res) => {
      this.proxyToService('imageIntel', req, res);
    });

    // Route pour recherche multi-services
    this.app.post('/api/search/multi', async (req, res) => {
      try {
        const { query, services = ['telegram'], options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({
            error: 'Paramètre query requis'
          });
        }

        const results = await this.performMultiServiceSearch(query, services, options);
        
        res.json({
          success: true,
          query,
          services: services,
          results,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Erreur recherche multi-services:', error);
        res.status(500).json({
          error: 'Erreur lors de la recherche multi-services',
          message: error.message
        });
      }
    });

    // Route pour orchestration de tâches
    this.app.post('/api/orchestrate', async (req, res) => {
      try {
        const { task, parameters } = req.body;
        
        const result = await this.orchestrateTask(task, parameters);
        
        res.json({
          success: true,
          task,
          result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Erreur orchestration:', error);
        res.status(500).json({
          error: 'Erreur lors de l\'orchestration',
          message: error.message
        });
      }
    });

    // Servir les fichiers statiques du frontend
    this.app.use(express.static('frontend/dist', {
      maxAge: '1d',
      etag: true
    }));

    // Route catch-all pour le frontend SPA
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
    });

    // Gestionnaire d'erreur global
    this.app.use(this.errorHandler.bind(this));
  }

  async proxyToService(serviceName, req, res) {
    try {
      const serviceConfig = config.services[serviceName];
      
      if (!serviceConfig.enabled) {
        return res.status(503).json({
          error: 'Service non disponible',
          service: serviceName,
          message: `Le service ${serviceName} est désactivé`
        });
      }

      // Construire l'URL cible
      const serviceUrl = getServiceUrl(serviceName);
      const targetPath = req.path.replace(`/api/${serviceName.toLowerCase()}`, '');
      const targetUrl = `${serviceUrl}${targetPath}`;

      // Préparer les headers
      const headers = {
        ...req.headers,
        'X-Forwarded-For': req.ip,
        'X-Gateway-Request': 'true',
        'X-Original-URL': req.originalUrl
      };

      // Supprimer les headers qui peuvent causer des problèmes
      delete headers.host;
      delete headers['content-length'];

      // Faire la requête vers le service
      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: headers,
        timeout: 30000,
        validateStatus: () => true // Accepter toutes les réponses
      });

      // Transférer la réponse
      res.status(response.status);
      
      // Transférer les headers pertinents
      const responseHeaders = response.headers;
      Object.keys(responseHeaders).forEach(header => {
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(header.toLowerCase())) {
          res.setHeader(header, responseHeaders[header]);
        }
      });

      res.send(response.data);

    } catch (error) {
      console.error(`Erreur proxy vers ${serviceName}:`, error.message);
      
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'Service indisponible',
          service: serviceName,
          message: `Le service ${serviceName} n'est pas accessible`
        });
      } else if (error.code === 'ETIMEDOUT') {
        res.status(504).json({
          error: 'Timeout du service',
          service: serviceName,
          message: `Le service ${serviceName} n'a pas répondu dans les temps`
        });
      } else {
        res.status(500).json({
          error: 'Erreur du proxy',
          service: serviceName,
          message: error.message
        });
      }
    }
  }

  async performMultiServiceSearch(query, services, options) {
    const results = {};
    const promises = [];

    // Démarrer les recherches en parallèle
    services.forEach(serviceName => {
      if (config.services[serviceName] && config.services[serviceName].enabled) {
        const promise = this.callService(serviceName, '/search', {
          username: query,
          options: options[serviceName] || {}
        }).then(result => {
          results[serviceName] = result;
        }).catch(error => {
          console.error(`Erreur service ${serviceName}:`, error.message);
          results[serviceName] = {
            error: error.message,
            success: false
          };
        });
        
        promises.push(promise);
      }
    });

    // Attendre toutes les réponses
    await Promise.allSettled(promises);

    return results;
  }

  async orchestrateTask(task, parameters) {
    const TaskOrchestrator = require('../../orchestrator/TaskOrchestrator');
    const orchestrator = new TaskOrchestrator(this);
    
    switch (task) {
      case 'comprehensive_search':
        return await orchestrator.comprehensiveSearch(parameters);
      case 'cross_reference':
        return await orchestrator.crossReference(parameters);
      case 'timeline_analysis':
        return await orchestrator.timelineAnalysis(parameters);
      default:
        throw new Error(`Tâche non reconnue: ${task}`);
    }
  }

  async callService(serviceName, endpoint, data = {}) {
    const serviceUrl = getServiceUrl(serviceName);
    const url = `${serviceUrl}${endpoint}`;
    
    try {
      const response = await axios.post(url, data, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Request': 'true'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Erreur appel service ${serviceName}:`, error.message);
      throw error;
    }
  }

  async checkServicesHealth() {
    const health = {};
    
    for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
      if (serviceConfig.enabled) {
        try {
          const serviceUrl = getServiceUrl(serviceName);
          const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
          health[serviceName] = {
            status: 'healthy',
            response: response.data
          };
        } catch (error) {
          health[serviceName] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      } else {
        health[serviceName] = {
          status: 'disabled'
        };
      }
    }
    
    return health;
  }

  registerService(serviceName, serviceInstance) {
    this.services.set(serviceName, serviceInstance);
    console.log(`📋 Service ${serviceName} enregistré dans le gateway`);
  }

  async start() {
    try {
      return new Promise((resolve, reject) => {
        this.server = this.app.listen(config.gateway.port, config.gateway.host, (err) => {
          if (err) {
            reject(err);
          } else {
            this.isRunning = true;
            console.log(`🌐 API Gateway démarré sur http://${config.gateway.host}:${config.gateway.port}`);
            resolve(this.server);
          }
        });
      });
    } catch (error) {
      console.error('❌ Erreur démarrage API Gateway:', error);
      throw error;
    }
  }

  async stop() {
    if (this.server && this.isRunning) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isRunning = false;
          console.log('⏹️  API Gateway arrêté');
          resolve();
        });
      });
    }
  }

  errorHandler(error, req, res, next) {
    console.error('❌ Erreur Gateway:', error);
    
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Erreur interne du gateway';
    
    res.status(status).json({
      error: true,
      gateway: true,
      message: message,
      timestamp: new Date().toISOString(),
      ...(config.app.environment === 'development' && { stack: error.stack })
    });
  }
}

module.exports = APIGateway;