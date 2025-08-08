// app.js
const { config, validateConfig } = require('./core/config');
const APIGateway = require('./core/api/gateway');
const TelegramService = require('./services/telegram/TelegramService');

class OSINTFramework {
  constructor() {
    this.gateway = null;
    this.services = new Map();
    this.isRunning = false;
    
    console.log(`🚀 ${config.app.name} v${config.app.version} - Initialisation...`);
  }

  async initialize() {
    try {
      // Validation de la configuration
      validateConfig();
      console.log('✅ Configuration validée');

      // Initialisation de l'API Gateway
      this.gateway = new APIGateway();
      
      // Initialisation des services activés
      await this.initializeServices();
      
      console.log('✅ Framework initialisé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  async initializeServices() {
    console.log('🔧 Initialisation des services...');
    
    // Service Telegram
    if (config.services.telegram.enabled) {
      try {
        const telegramService = new TelegramService();
        this.services.set('telegram', telegramService);
        this.gateway.registerService('telegram', telegramService);
        console.log('✅ Service Telegram prêt');
      } catch (error) {
        console.error('❌ Erreur service Telegram:', error);
        // Continuer même si un service échoue
      }
    }

    // Service Social Media (futur)
    if (config.services.socialMedia.enabled) {
      try {
        // const SocialMediaService = require('./services/social-media/SocialMediaService');
        // const socialService = new SocialMediaService();
        // this.services.set('socialMedia', socialService);
        console.log('⚠️  Service Social Media non implémenté');
      } catch (error) {
        console.error('❌ Erreur service Social Media:', error);
      }
    }

    // Service Web Intelligence (futur)
    if (config.services.webIntel.enabled) {
      try {
        // const WebIntelService = require('./services/web-intel/WebIntelService');
        // const webService = new WebIntelService();
        // this.services.set('webIntel', webService);
        console.log('⚠️  Service Web Intelligence non implémenté');
      } catch (error) {
        console.error('❌ Erreur service Web Intelligence:', error);
      }
    }

    const enabledServices = Array.from(this.services.keys());
    console.log(`📋 Services activés: ${enabledServices.join(', ')}`);
  }

  async start() {
    try {
      await this.initialize();
      
      // Démarrer les services individuels
      const servicePromises = Array.from(this.services.values()).map(service => 
        service.start().catch(error => {
          console.error(`❌ Erreur démarrage service:`, error);
          return null;
        })
      );
      
      await Promise.allSettled(servicePromises);
      
      // Démarrer l'API Gateway en dernier
      await this.gateway.start();
      
      this.isRunning = true;
      
      this.displayStartupInfo();
      
      return this;
      
    } catch (error) {
      console.error('❌ Erreur lors du démarrage:', error);
      await this.stop();
      throw error;
    }
  }

  async stop() {
    console.log('⏹️  Arrêt du framework...');
    
    try {
      // Arrêter l'API Gateway
      if (this.gateway) {
        await this.gateway.stop();
      }
      
      // Arrêter tous les services
      const stopPromises = Array.from(this.services.values()).map(service => 
        service.stop().catch(error => {
          console.error('❌ Erreur arrêt service:', error);
        })
      );
      
      await Promise.allSettled(stopPromises);
      
      this.isRunning = false;
      console.log('✅ Framework arrêté');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt:', error);
    }
  }

  displayStartupInfo() {
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 ${config.app.name} v${config.app.version}`);
    console.log('='.repeat(60));
    console.log(`🌐 API Gateway: http://${config.gateway.host}:${config.gateway.port}`);
    console.log(`📊 Dashboard: http://${config.gateway.host}:${config.gateway.port}/dashboard`);
    console.log(`🔍 API Docs: http://${config.gateway.host}:${config.gateway.port}/info`);
    console.log('');
    
    // Afficher les services actifs
    console.log('📋 Services actifs:');
    this.services.forEach((service, name) => {
      const serviceConfig = config.services[name];
      console.log(`   📌 ${serviceConfig.name}: http://localhost:${serviceConfig.port}`);
    });
    
    console.log('');
    console.log('🚀 Framework prêt pour les investigations OSINT!');
    console.log('='.repeat(60) + '\n');
  }

  // Méthodes de monitoring
  getStatus() {
    return {
      framework: {
        name: config.app.name,
        version: config.app.version,
        environment: config.app.environment,
        running: this.isRunning,
        uptime: this.isRunning ? process.uptime() : 0
      },
      gateway: {
        running: this.gateway ? this.gateway.isRunning : false,
        port: config.gateway.port
      },
      services: Array.from(this.services.entries()).map(([name, service]) => ({
        name,
        running: service.isRunning,
        port: config.services[name].port,
        endpoints: config.services[name].endpoints
      }))
    };
  }

  async healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    try {
      // Vérifier l'API Gateway
      health.checks.gateway = {
        status: this.gateway && this.gateway.isRunning ? 'healthy' : 'unhealthy'
      };

      // Vérifier chaque service
      for (const [name, service] of this.services.entries()) {
        try {
          // Faire un appel de santé au service
          const response = await fetch(`http://localhost:${config.services[name].port}/health`);
          health.checks[name] = {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: Date.now()
          };
        } catch (error) {
          health.checks[name] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      }

      // Déterminer le statut global
      const unhealthyServices = Object.values(health.checks).filter(check => check.status === 'unhealthy');
      if (unhealthyServices.length > 0) {
        health.status = 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // Méthodes utilitaires
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  hasService(serviceName) {
    return this.services.has(serviceName);
  }

  listServices() {
    return Array.from(this.services.keys());
  }

  // Gestionnaire de signaux pour arrêt propre
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📡 Signal ${signal} reçu, arrêt en cours...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      console.error('❌ Erreur non capturée:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejetée non gérée:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Fonction principale de démarrage
async function main() {
  const framework = new OSINTFramework();
  
  try {
    // Configuration de l'arrêt propre
    framework.setupGracefulShutdown();
    
    // Démarrage du framework
    await framework.start();
    
    // Le framework tourne maintenant...
    
  } catch (error) {
    console.error('💥 Échec critique du framework:', error);
    process.exit(1);
  }
}

// Export pour utilisation en module
module.exports = OSINTFramework;

// Démarrage automatique si ce fichier est exécuté directement
if (require.main === module) {
  main();
}