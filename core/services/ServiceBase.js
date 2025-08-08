// core/services/ServiceBase.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('../config');

class ServiceBase {
  constructor(serviceName, port = null) {
    this.serviceName = serviceName;
    this.serviceConfig = config.services[serviceName];
    this.port = port || this.serviceConfig.port;
    this.app = express();
    this.isRunning = false;
    
    // Configuration Express de base
    this.setupMiddleware();
    
    console.log(`🔧 Service ${serviceName} initialisé sur le port ${this.port}`);
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors(config.gateway.cors));
    
    // Sécurité
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false
    }));
    
    // Logging
    this.app.use(morgan('combined'));
    
    // Parsing JSON
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Headers personnalisés
    this.app.use((req, res, next) => {
      res.setHeader('X-Service-Name', this.serviceName);
      res.setHeader('X-Service-Version', config.app.version);
      next();
    });

    // Route de santé par défaut
    this.app.get('/health', (req, res) => {
      res.json({
        service: this.serviceName,
        status: 'healthy',
        version: config.app.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Route d'information du service
    this.app.get('/info', (req, res) => {
      res.json({
        service: this.serviceName,
        name: this.serviceConfig.name,
        version: config.app.version,
        endpoints: this.serviceConfig.endpoints,
        port: this.port,
        status: this.isRunning ? 'running' : 'stopped'
      });
    });
  }

  // Méthode à implémenter par les services enfants
  setupRoutes() {
    throw new Error('La méthode setupRoutes() doit être implémentée par le service enfant');
  }

  // Méthode à surcharger pour l'initialisation spécifique
  async initialize() {
    // À surcharger si nécessaire
    console.log(`✅ Service ${this.serviceName} initialisé`);
  }

  // Démarrage du service
  async start() {
    try {
      // Initialisation spécifique du service
      await this.initialize();
      
      // Configuration des routes spécifiques
      this.setupRoutes();
      
      // Gestionnaire d'erreur global
      this.app.use(this.errorHandler.bind(this));
      
      // Démarrage du serveur
      return new Promise((resolve, reject) => {
        this.server = this.app.listen(this.port, '0.0.0.0', (err) => {
          if (err) {
            reject(err);
          } else {
            this.isRunning = true;
            console.log(`🚀 Service ${this.serviceName} démarré sur http://0.0.0.0:${this.port}`);
            resolve(this.server);
          }
        });
      });
    } catch (error) {
      console.error(`❌ Erreur démarrage service ${this.serviceName}:`, error);
      throw error;
    }
  }

  // Arrêt du service
  async stop() {
    if (this.server && this.isRunning) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isRunning = false;
          console.log(`⏹️  Service ${this.serviceName} arrêté`);
          resolve();
        });
      });
    }
  }

  // Gestionnaire d'erreur
  errorHandler(error, req, res, next) {
    console.error(`❌ Erreur dans ${this.serviceName}:`, error);
    
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Erreur interne du service';
    
    res.status(status).json({
      error: true,
      service: this.serviceName,
      message: message,
      timestamp: new Date().toISOString(),
      ...(config.app.environment === 'development' && { stack: error.stack })
    });
  }

  // Utilitaire pour valider les paramètres de requête
  validateRequest(req, schema) {
    const { error, value } = schema.validate(req.body);
    if (error) {
      const validationError = new Error(`Paramètres invalides: ${error.details[0].message}`);
      validationError.status = 400;
      throw validationError;
    }
    return value;
  }

  // Utilitaire pour les réponses standardisées
  sendResponse(res, data, message = 'Succès') {
    res.json({
      success: true,
      service: this.serviceName,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  // Utilitaire pour les erreurs standardisées
  sendError(res, message, status = 500, details = null) {
    res.status(status).json({
      success: false,
      service: this.serviceName,
      error: message,
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  // Méthode pour faire des requêtes vers d'autres services
  async callService(serviceName, endpoint, data = {}, method = 'POST') {
    const axios = require('axios');
    const { getServiceUrl } = require('../config');
    
    try {
      const serviceUrl = getServiceUrl(serviceName);
      const url = `${serviceUrl}${endpoint}`;
      
      const response = await axios({
        method: method,
        url: url,
        data: data,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Calling-Service': this.serviceName
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur appel service ${serviceName}:`, error.message);
      throw new Error(`Service ${serviceName} indisponible: ${error.message}`);
    }
  }
}

module.exports = ServiceBase;