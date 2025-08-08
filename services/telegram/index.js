// services/telegram/index.js
const TelegramService = require('./controllers/TelegramController');
const { ServiceBase } = require('../../core/services/ServiceBase');

class TelegramOSINTService extends ServiceBase {
  constructor() {
    super('telegram', 3001);
    this.controller = new TelegramService();
  }

  async initialize() {
    this.setupRoutes();
    await super.initialize();
  }

  setupRoutes() {
    this.app.post('/search', this.controller.search.bind(this.controller));
    this.app.post('/analyze', this.controller.analyze.bind(this.controller));
    this.app.get('/export/:id', this.controller.export.bind(this.controller));
  }
}

module.exports = TelegramOSINTService;