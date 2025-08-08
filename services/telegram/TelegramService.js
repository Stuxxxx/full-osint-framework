// services/telegram/TelegramService.js
const ServiceBase = require('../../core/services/ServiceBase');
const Joi = require('joi');

// Import des anciens services (à adapter)
const TelegramAPI = require('./services/telegramApi');
const GoogleSearch = require('./services/googleSearch');
const BingSearch = require('./services/bingSearch');
const RedditService = require('./services/reddit');
const AIAnalyzer = require('./services/aiAnalyzer');
const { logger } = require('./utils/logger');

class TelegramService extends ServiceBase {
  constructor() {
    super('telegram', 3001);
    
    // Initialisation des services internes
    this.telegramApi = new TelegramAPI();
    this.googleSearch = new GoogleSearch();
    this.bingSearch = new BingSearch();
    this.redditService = new RedditService();
    this.aiAnalyzer = new AIAnalyzer();
    
    // Schémas de validation
    this.schemas = {
      search: Joi.object({
        username: Joi.string().required().min(1).max(50),
        options: Joi.object({
          google: Joi.boolean().default(false),
          bing: Joi.boolean().default(false),
          telegramApi: Joi.boolean().default(true),
          social: Joi.boolean().default(false),
          aiAnalysis: Joi.boolean().default(false),
          sentimentAnalysis: Joi.boolean().default(false),
          maxResults: Joi.number().integer().min(1).max(100).default(10)
        }).default({})
      }),
      
      analyze: Joi.object({
        results: Joi.array().required(),
        analysisType: Joi.string().valid('comprehensive', 'credibility', 'sentiment', 'entities').default('comprehensive')
      }),
      
      export: Joi.object({
        investigationId: Joi.string().required(),
        format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
        options: Joi.object().default({})
      })
    };
  }

  async initialize() {
    logger.info('🔧 Initialisation du service Telegram OSINT...');
    
    // Vérification des APIs
    await this.checkAPIs();
    
    await super.initialize();
  }

  setupRoutes() {
    // Route principale de recherche
    this.app.post('/search', async (req, res) => {
      try {
        const validatedData = this.validateRequest(req, this.schemas.search);
        const { username, options } = validatedData;
        
        logger.info('Nouvelle recherche Telegram', {
          username,
          options,
          ip: req.ip
        });
        
        const results = await this.performSearch(username, options);
        
        this.sendResponse(res, results, `Recherche terminée: ${results.totalResults} résultats trouvés`);
        
      } catch (error) {
        logger.error('Erreur recherche Telegram:', error);
        this.sendError(res, error.message, error.status || 500);
      }
    });

    // Route d'analyse IA
    this.app.post('/analyze', async (req, res) => {
      try {
        const validatedData = this.validateRequest(req, this.schemas.analyze);
        const { results, analysisType } = validatedData;
        
        logger.info('Analyse IA demandée', { analysisType, resultsCount: results.length });
        
        const analysis = await this.aiAnalyzer.analyzeResults(results, analysisType);
        
        this.sendResponse(res, analysis, 'Analyse IA terminée');
        
      } catch (error) {
        logger.error('Erreur analyse IA:', error);
        this.sendError(res, error.message, error.status || 500);
      }
    });

    // Route d'export
    this.app.post('/export', async (req, res) => {
      try {
        const validatedData = this.validateRequest(req, this.schemas.export);
        const { investigationId, format, options } = validatedData;
        
        const exportData = await this.exportResults(investigationId, format, options);
        
        res.setHeader('Content-Type', this.getContentType(format));
        res.setHeader('Content-Disposition', `attachment; filename="telegram-export.${format}"`);
        res.send(exportData);
        
      } catch (error) {
        logger.error('Erreur export:', error);
        this.sendError(res, error.message, error.status || 500);
      }
    });

    // Route de statistiques
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.getServiceStats();
        this.sendResponse(res, stats, 'Statistiques du service');
      } catch (error) {
        this.sendError(res, error.message);
      }
    });
  }

  async performSearch(username, options = {}) {
    const startTime = Date.now();
    const results = {
      username,
      searchId: this.generateSearchId(),
      timestamp: new Date().toISOString(),
      sources: {},
      totalResults: 0,
      errors: [],
      duration: 0
    };

    // Recherche Telegram API
    if (options.telegramApi !== false) {
      try {
        logger.info('🔍 Recherche Telegram API...');
        const telegramResults = await this.telegramApi.searchUser(username);
        results.sources.telegram = telegramResults;
        results.totalResults += telegramResults.length;
        logger.info(`✅ Telegram API: ${telegramResults.length} résultats`);
      } catch (error) {
        logger.error('Erreur Telegram API:', error);
        results.errors.push({ source: 'telegram', error: error.message });
      }
    }

    // Recherche Google
    if (options.google) {
      try {
        logger.info('🔍 Recherche Google...');
        const googleResults = await this.googleSearch.searchTelegram(username, options.maxResults);
        results.sources.google = googleResults;
        results.totalResults += googleResults.length;
        logger.info(`✅ Google: ${googleResults.length} résultats`);
      } catch (error) {
        logger.error('Erreur Google:', error);
        results.errors.push({ source: 'google', error: error.message });
      }
    }

    // Recherche Bing
    if (options.bing) {
      try {
        logger.info('🔍 Recherche Bing...');
        const bingResults = await this.bingSearch.searchTelegram(username, options.maxResults);
        results.sources.bing = bingResults;
        results.totalResults += bingResults.length;
        logger.info(`✅ Bing: ${bingResults.length} résultats`);
      } catch (error) {
        logger.error('Erreur Bing:', error);
        results.errors.push({ source: 'bing', error: error.message });
      }
    }

    // Recherche sociale (Reddit, etc.)
    if (options.social) {
      try {
        logger.info('🔍 Recherche sociale...');
        const socialResults = await this.redditService.searchTelegram(username);
        results.sources.social = socialResults;
        results.totalResults += socialResults.length;
        logger.info(`✅ Social: ${socialResults.length} résultats`);
      } catch (error) {
        logger.error('Erreur recherche sociale:', error);
        results.errors.push({ source: 'social', error: error.message });
      }
    }

    // Analyse IA automatique
    if (options.aiAnalysis && results.totalResults > 0) {
      try {
        logger.info('🧠 Analyse IA en cours...');
        const allResults = Object.values(results.sources).flat();
        const analysis = await this.aiAnalyzer.analyzeResults(allResults);
        results.aiAnalysis = analysis;
        logger.info('✅ Analyse IA terminée');
      } catch (error) {
        logger.error('Erreur analyse IA:', error);
        results.errors.push({ source: 'ai', error: error.message });
      }
    }

    results.duration = Date.now() - startTime;
    
    // Sauvegarde des résultats
    await this.saveInvestigation(results);
    
    logger.info(`🎯 Recherche terminée: ${results.totalResults} résultats en ${results.duration}ms`);
    
    return results;
  }

  async checkAPIs() {
    const status = {
      telegram: false,
      google: false,
      bing: false,
      reddit: false
    };

    try {
      // Test Telegram API
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await this.telegramApi.checkConnection();
        status.telegram = true;
        logger.info('✅ Telegram API connectée');
      }
    } catch (error) {
      logger.warn('⚠️ Telegram API non disponible:', error.message);
    }

    try {
      // Test Google API
      if (process.env.GOOGLE_API_KEY) {
        await this.googleSearch.testConnection();
        status.google = true;
        logger.info('✅ Google API connectée');
      }
    } catch (error) {
      logger.warn('⚠️ Google API non disponible:', error.message);
    }

    // Log du statut général
    const availableAPIs = Object.keys(status).filter(api => status[api]);
    logger.info(`📡 APIs disponibles: ${availableAPIs.join(', ')}`);

    return status;
  }

  async saveInvestigation(results) {
    try {
      // Ici on sauvegarderait dans MongoDB
      // Pour l'instant, on simule avec un log
      logger.info(`💾 Investigation sauvegardée: ${results.searchId}`);
      return results.searchId;
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      throw error;
    }
  }

  async exportResults(investigationId, format, options) {
    // Logique d'export (à implémenter selon le format)
    switch (format) {
      case 'json':
        return this.exportToJSON(investigationId, options);
      case 'csv':
        return this.exportToCSV(investigationId, options);
      case 'pdf':
        return this.exportToPDF(investigationId, options);
      default:
        throw new Error(`Format d'export non supporté: ${format}`);
    }
  }

  async getServiceStats() {
    return {
      service: 'telegram',
      version: '2.0.0',
      uptime: process.uptime(),
      apis: await this.checkAPIs(),
      memory: process.memoryUsage(),
      investigations: {
        total: 0, // À récupérer de la DB
        today: 0
      }
    };
  }

  generateSearchId() {
    return `tg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getContentType(format) {
    const types = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf'
    };
    return types[format] || 'application/octet-stream';
  }

  // Méthodes d'export (à implémenter)
  async exportToJSON(investigationId, options) {
    // Implémentation export JSON
    return JSON.stringify({ investigationId, format: 'json' }, null, 2);
  }

  async exportToCSV(investigationId, options) {
    // Implémentation export CSV
    return 'investigationId,format\n' + investigationId + ',csv';
  }

  async exportToPDF(investigationId, options) {
    // Implémentation export PDF
    return Buffer.from('PDF export placeholder');
  }
}

module.exports = TelegramService;