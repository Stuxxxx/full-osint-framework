// scripts/setup.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class FrameworkSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
  }

  async run() {
    console.log('🚀 Configuration du Full OSINT Framework');
    console.log('=======================================\n');

    try {
      // Créer les dossiers nécessaires
      await this.createDirectories();
      
      // Configuration interactive
      await this.interactiveSetup();
      
      // Génération du fichier .env
      await this.generateEnvFile();
      
      // Vérification des dépendances
      await this.checkDependencies();
      
      // Configuration finale
      await this.finalSetup();
      
      console.log('\n✅ Configuration terminée avec succès!');
      console.log('🚀 Vous pouvez maintenant démarrer avec: npm start\n');
      
    } catch (error) {
      console.error('❌ Erreur lors de la configuration:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async createDirectories() {
    console.log('📁 Création des dossiers...');
    
    const directories = [
      'logs',
      'data',
      'exports',
      'temp',
      'core/config',
      'core/utils',
      'core/middleware',
      'core/database',
      'services/telegram/logs',
      'services/social-media',
      'services/web-intel',
      'services/image-intel',
      'frontend/dist',
      'scripts',
      'tests'
    ];

    for (const dir of directories) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ Créé: ${dir}`);
      }
    }
  }

  async interactiveSetup() {
    console.log('\n🔧 Configuration interactive:');
    
    // Configuration générale
    this.config.NODE_ENV = await this.question('Environnement (development/production) [development]: ') || 'development';
    this.config.PORT = await this.question('Port du gateway [3000]: ') || '3000';
    
    // Services à activer
    console.log('\n📋 Services à activer:');
    this.config.TELEGRAM_ENABLED = await this.confirm('Activer le service Telegram? [Y/n]: ', true);
    this.config.SOCIAL_ENABLED = await this.confirm('Activer le service Social Media? [y/N]: ', false);
    this.config.WEB_ENABLED = await this.confirm('Activer le service Web Intelligence? [y/N]: ', false);
    
    // Configuration Telegram
    if (this.config.TELEGRAM_ENABLED) {
      console.log('\n🤖 Configuration Telegram:');
      this.config.TELEGRAM_BOT_TOKEN = await this.question('Token du bot Telegram (optionnel): ');
      this.config.TELEGRAM_CHAT_ID = await this.question('Chat ID pour notifications (optionnel): ');
    }

    // Configuration APIs de recherche
    console.log('\n🔍 APIs de recherche:');
    this.config.GOOGLE_API_KEY = await this.question('Clé API Google (optionnel): ');
    if (this.config.GOOGLE_API_KEY) {
      this.config.GOOGLE_SEARCH_ENGINE_ID = await this.question('ID du moteur de recherche Google: ');
    }
    
    this.config.BING_API_KEY = await this.question('Clé API Bing (optionnel): ');
    
    // Configuration Reddit
    console.log('\n📱 Configuration Reddit:');
    this.config.REDDIT_CLIENT_ID = await this.question('Client ID Reddit (optionnel): ');
    if (this.config.REDDIT_CLIENT_ID) {
      this.config.REDDIT_CLIENT_SECRET = await this.question('Client Secret Reddit: ');
    }

    // Configuration IA
    console.log('\n🧠 Configuration IA:');
    this.config.OPENAI_API_KEY = await this.question('Clé API OpenAI (optionnel): ');
    this.config.ANTHROPIC_API_KEY = await this.question('Clé API Anthropic/Claude (optionnel): ');

    // Configuration avancée
    if (await this.confirm('\nConfiguration avancée? [y/N]: ', false)) {
      await this.advancedSetup();
    }
  }

  async advancedSetup() {
    console.log('\n⚙️ Configuration avancée:');
    
    // Base de données
    this.config.MONGODB_URI = await this.question('URI MongoDB [mongodb://localhost:27017/osint-framework]: ') || 'mongodb://localhost:27017/osint-framework';
    this.config.REDIS_HOST = await this.question('Host Redis [localhost]: ') || 'localhost';
    this.config.REDIS_PORT = await this.question('Port Redis [6379]: ') || '6379';
    
    // Performance
    this.config.REQUEST_DELAY = await this.question('Délai entre requêtes en ms [1000]: ') || '1000';
    this.config.MAX_RETRIES = await this.question('Nombre max de tentatives [3]: ') || '3';
    this.config.REQUEST_TIMEOUT = await this.question('Timeout des requêtes en ms [30000]: ') || '30000';
    
    // Sécurité
    this.config.JWT_SECRET = await this.question('Secret JWT [généré automatiquement]: ') || this.generateSecret();
    
    // Logging
    this.config.LOG_LEVEL = await this.question('Niveau de log (error/warn/info/debug) [info]: ') || 'info';
  }

  async generateEnvFile() {
    console.log('\n📝 Génération du fichier .env...');
    
    const envContent = `# =================================================================
# FULL OSINT FRAMEWORK - CONFIGURATION ENVIRONNEMENT
# Généré automatiquement le ${new Date().toISOString()}
# =================================================================

# Configuration générale
NODE_ENV=${this.config.NODE_ENV}
PORT=${this.config.PORT}
FRONTEND_URL=http://localhost:${this.config.PORT}

# =================================================================
# SERVICES
# =================================================================
TELEGRAM_SERVICE_ENABLED=${this.config.TELEGRAM_ENABLED}
SOCIAL_SERVICE_ENABLED=${this.config.SOCIAL_ENABLED}
WEB_SERVICE_ENABLED=${this.config.WEB_ENABLED}

# =================================================================
# TELEGRAM
# =================================================================
${this.config.TELEGRAM_BOT_TOKEN ? `TELEGRAM_BOT_TOKEN=${this.config.TELEGRAM_BOT_TOKEN}` : '# TELEGRAM_BOT_TOKEN=your_bot_token_here'}
${this.config.TELEGRAM_CHAT_ID ? `TELEGRAM_CHAT_ID=${this.config.TELEGRAM_CHAT_ID}` : '# TELEGRAM_CHAT_ID=your_chat_id_here'}

# =================================================================
# APIS DE RECHERCHE
# =================================================================
${this.config.GOOGLE_API_KEY ? `GOOGLE_API_KEY=${this.config.GOOGLE_API_KEY}` : '# GOOGLE_API_KEY=your_google_api_key_here'}
${this.config.GOOGLE_SEARCH_ENGINE_ID ? `GOOGLE_SEARCH_ENGINE_ID=${this.config.GOOGLE_SEARCH_ENGINE_ID}` : '# GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here'}

${this.config.BING_API_KEY ? `BING_API_KEY=${this.config.BING_API_KEY}` : '# BING_API_KEY=your_bing_api_key_here'}
BING_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

${this.config.REDDIT_CLIENT_ID ? `REDDIT_CLIENT_ID=${this.config.REDDIT_CLIENT_ID}` : '# REDDIT_CLIENT_ID=your_reddit_client_id_here'}
${this.config.REDDIT_CLIENT_SECRET ? `REDDIT_CLIENT_SECRET=${this.config.REDDIT_CLIENT_SECRET}` : '# REDDIT_CLIENT_SECRET=your_reddit_client_secret_here'}

# =================================================================
# IA SERVICES
# =================================================================
${this.config.OPENAI_API_KEY ? `OPENAI_API_KEY=${this.config.OPENAI_API_KEY}` : '# OPENAI_API_KEY=your_openai_api_key_here'}
OPENAI_MODEL=gpt-3.5-turbo

${this.config.ANTHROPIC_API_KEY ? `ANTHROPIC_API_KEY=${this.config.ANTHROPIC_API_KEY}` : '# ANTHROPIC_API_KEY=your_anthropic_api_key_here'}

# =================================================================
# BASE DE DONNÉES
# =================================================================
MONGODB_URI=${this.config.MONGODB_URI || 'mongodb://localhost:27017/osint-framework'}
REDIS_HOST=${this.config.REDIS_HOST || 'localhost'}
REDIS_PORT=${this.config.REDIS_PORT || '6379'}

# =================================================================
# PERFORMANCE
# =================================================================
REQUEST_DELAY=${this.config.REQUEST_DELAY || '1000'}
MAX_RETRIES=${this.config.MAX_RETRIES || '3'}
REQUEST_TIMEOUT=${this.config.REQUEST_TIMEOUT || '30000'}

# =================================================================
# SÉCURITÉ
# =================================================================
JWT_SECRET=${this.config.JWT_SECRET || this.generateSecret()}
JWT_EXPIRATION=24h

# =================================================================
# LOGGING
# =================================================================
LOG_LEVEL=${this.config.LOG_LEVEL || 'info'}
LOG_DIR=./logs
LOG_MAX_SIZE=10
LOG_MAX_FILES=5

# =================================================================
# CACHE
# =================================================================
CACHE_MAX_SIZE=100
CACHE_TTL=3600
`;

    fs.writeFileSync('.env', envContent);
    console.log('   ✅ Fichier .env créé');
  }

  async checkDependencies() {
    console.log('\n📦 Vérification des dépendances...');
    
    const requiredPackages = [
      'express',
      'axios',
      'dotenv',
      'winston',
      'joi'
    ];

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const installed = Object.keys(packageJson.dependencies || {});
    
    const missing = requiredPackages.filter(pkg => !installed.includes(pkg));
    
    if (missing.length > 0) {
      console.log(`   ⚠️  Packages manquants: ${missing.join(', ')}`);
      console.log('   💡 Exécutez: npm install');
    } else {
      console.log('   ✅ Toutes les dépendances sont installées');
    }
  }

  async finalSetup() {
    console.log('\n🔧 Configuration finale...');
    
    // Copier les fichiers de configuration
    await this.copyConfigFiles();
    
    // Créer les fichiers de base
    await this.createBaseFiles();
    
    console.log('   ✅ Configuration finale terminée');
  }

  async copyConfigFiles() {
    // Copier les configurations par défaut si elles n'existent pas
    const configs = [
      {
        source: 'core/config/index.js',
        exists: fs.existsSync('core/config/index.js')
      }
    ];
    
    configs.forEach(config => {
      if (!config.exists) {
        console.log(`   📄 Configuration ${config.source} déjà créée`);
      }
    });
  }

  async createBaseFiles() {
    // Créer un fichier gitignore si il n'existe pas
    if (!fs.existsSync('.gitignore')) {
      const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Environment
.env
.env.local
.env.production

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
temp/
tmp/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build outputs
dist/
build/

# Data
data/
exports/
cache/
`;
      fs.writeFileSync('.gitignore', gitignoreContent);
      console.log('   ✅ Fichier .gitignore créé');
    }
  }

  // Méthodes utilitaires
  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async confirm(prompt, defaultValue = false) {
    const answer = await this.question(prompt);
    if (answer === '') return defaultValue;
    return answer.toLowerCase().startsWith('y');
  }

  generateSecret(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Exécution
if (require.main === module) {
  const setup = new FrameworkSetup();
  setup.run();
}

module.exports = FrameworkSetup;