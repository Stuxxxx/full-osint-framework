const express = require('express');
const router = express.Router();
const GoogleSearchService = require('../services/googleSearch');
const BingSearchService = require('../services/bingSearch');
const TelegramApiService = require('../services/telegramApi');
const AIAnalyzerService = require('../services/aiAnalyzer');
const RedditUltraSearchService = require('../services/reddit'); // Service ultra mis à jour
const { rateLimiter } = require('../utils/rateLimit');
const { logger } = require('../utils/logger');
const { validateSearchParams } = require('../utils/validation');

// Rate limiting: 10 requêtes par minute par IP
router.use(rateLimiter);

// POST /api/search/telegram
router.post('/telegram', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { username, options } = req.body;
        
        // Validation des paramètres
        const validation = validateSearchParams(username, options);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Paramètres invalides',
                details: validation.errors
            });
        }

        const cleanUsername = username.replace('@', '');
        const searchResults = [];
        const errors = [];
        const searchStats = { sources: {}, timings: {}, queries: {} };

        logger.info(`🎯 NOUVELLE RECHERCHE ULTRA pour: ${cleanUsername}`, {
            ip: req.ip,
            options: options
        });

        // Recherche Google si activée
        if (options.google && process.env.GOOGLE_API_KEY) {
            const googleStartTime = Date.now();
            try {
                const googleService = new GoogleSearchService();
                const googleResults = await googleService.searchUser(cleanUsername, options);
                searchResults.push(...googleResults);
                searchStats.sources.google = googleResults.length;
                searchStats.timings.google = Date.now() - googleStartTime;
                logger.info(`🔍 Google Search: ${googleResults.length} résultats`);
            } catch (error) {
                logger.error('Erreur Google Search:', error);
                errors.push({ service: 'Google', error: error.message });
            }
        }

        // Recherche Bing si activée
        if (options.bing && process.env.BING_API_KEY) {
            const bingStartTime = Date.now();
            try {
                const bingService = new BingSearchService();
                const bingResults = await bingService.searchUser(cleanUsername, options);
                searchResults.push(...bingResults);
                searchStats.sources.bing = bingResults.length;
                searchStats.timings.bing = Date.now() - bingStartTime;
                logger.info(`🔍 Bing Search: ${bingResults.length} résultats`);
            } catch (error) {
                logger.error('Erreur Bing Search:', error);
                errors.push({ service: 'Bing', error: error.message });
            }
        }

        // Recherche Telegram API si activée
        if (options.telegramApi && process.env.TELEGRAM_BOT_TOKEN) {
            const telegramStartTime = Date.now();
            try {
                const telegramService = new TelegramApiService();
                const telegramResults = await telegramService.searchUser(cleanUsername, options);
                searchResults.push(...telegramResults);
                searchStats.sources.telegram = telegramResults.length;
                searchStats.timings.telegram = Date.now() - telegramStartTime;
                logger.info(`📱 Telegram API: ${telegramResults.length} résultats`);
            } catch (error) {
                logger.error('Erreur Telegram API:', error);
                errors.push({ service: 'Telegram', error: error.message });
            }
        }

        // 🚀 RECHERCHE REDDIT ULTRA si activée
        if (options.social || options.reddit) {
            const redditStartTime = Date.now();
            try {
                const redditService = new RedditUltraSearchService();
                
                // Options avancées pour Reddit Ultra
                const redditOptions = {
                    useCache: options.useCache !== false,
                    exportFormat: 'json',
                    maxResults: parseInt(options.maxResults) || 1000,
                    minConfidence: parseInt(options.minConfidence) || 30,
                    includeStats: true,
                    subredditFilter: options.subredditFilter || null,
                    timeFilter: options.timeFilter || null
                };

                logger.info(`🔴 REDDIT ULTRA SEARCH démarrage avec options:`, redditOptions);

                // Recherche ultra-exhaustive
                const redditResponse = await redditService.searchWithAdvancedOptions(cleanUsername, redditOptions);
                const redditResults = redditResponse.results || redditResponse;
                
                searchResults.push(...redditResults);
                
                // Statistiques détaillées
                searchStats.sources.reddit = redditResults.length;
                searchStats.timings.reddit = Date.now() - redditStartTime;
                
                // Ajout des statistiques Reddit spécifiques
                if (redditResponse.statistics) {
                    searchStats.reddit = {
                        ...redditResponse.statistics,
                        searchStats: redditService.getSearchStats()
                    };
                }
                
                logger.info(`🔴 REDDIT ULTRA terminé: ${redditResults.length} groupes Telegram trouvés`);
                
            } catch (error) {
                logger.error('❌ Erreur Reddit Ultra Search:', error);
                errors.push({ 
                    service: 'Reddit Ultra', 
                    error: error.message,
                    details: error.stack
                });
            }
        }

        // Analyse IA si activée
        if (options.aiAnalysis && searchResults.length > 0) {
            const aiStartTime = Date.now();
            try {
                const aiService = new AIAnalyzerService();
                await aiService.analyzeResults(searchResults);
                searchStats.timings.aiAnalysis = Date.now() - aiStartTime;
                logger.info('✨ Analyse IA complétée');
            } catch (error) {
                logger.error('Erreur Analyse IA:', error);
                errors.push({ service: 'AI Analysis', error: error.message });
            }
        }

        // Déduplication ultra-intelligente et tri des résultats
        const uniqueResults = removeDuplicatesAdvanced(searchResults);
        const sortedResults = uniqueResults
            .sort((a, b) => {
                // Tri prioritaire : confiance puis score Reddit puis nombre de sources
                const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
                if (confidenceDiff !== 0) return confidenceDiff;
                
                const scoreA = a.metadata?.redditSource?.redditScore || a.metadata?.score || 0;
                const scoreB = b.metadata?.redditSource?.redditScore || b.metadata?.score || 0;
                const scoreDiff = scoreB - scoreA;
                if (scoreDiff !== 0) return scoreDiff;
                
                const sourcesA = (a.metadata?.mergedSources?.length || 0) + 1;
                const sourcesB = (b.metadata?.mergedSources?.length || 0) + 1;
                return sourcesB - sourcesA;
            })
            .slice(0, parseInt(options.maxResults) || 100);

        // Statistiques avancées
        const stats = generateAdvancedStats(sortedResults);

        // Réponse enrichie
        res.json({
            success: true,
            results: sortedResults,
            stats: stats,
            searchStats: searchStats,
            errors: errors,
            metadata: {
                searchUsername: cleanUsername,
                timestamp: new Date().toISOString(),
                totalFound: sortedResults.length,
                searchTime: Date.now() - startTime,
                version: '2.0.0-ultra',
                apis: {
                    google: !!process.env.GOOGLE_API_KEY && !!options.google,
                    bing: !!process.env.BING_API_KEY && !!options.bing,
                    telegram: !!process.env.TELEGRAM_BOT_TOKEN && !!options.telegramApi,
                    reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) && !!(options.social || options.reddit)
                }
            }
        });

    } catch (error) {
        logger.error('❌ Erreur critique lors de la recherche:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recherche',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/search/status
router.get('/status', async (req, res) => {
    try {
        const apiStatus = {
            google: !!process.env.GOOGLE_API_KEY,
            bing: !!process.env.BING_API_KEY,
            telegram: !!process.env.TELEGRAM_BOT_TOKEN,
            reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
        };

        // Test Reddit Ultra service
        let redditStats = null;
        if (apiStatus.reddit) {
            try {
                const redditService = new RedditUltraSearchService();
                redditStats = redditService.getSearchStats();
            } catch (error) {
                logger.warn('Erreur stats Reddit:', error.message);
            }
        }

        res.json({
            apis: apiStatus,
            reddit: redditStats,
            serverTime: new Date().toISOString(),
            version: '2.0.0-ultra',
            features: {
                redditUltraSearch: true,
                aiAnalysis: true,
                advancedCaching: true,
                intelligentDeduplication: true,
                multiSourceScoring: true
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors de la vérification du statut',
            message: error.message
        });
    }
});

// POST /api/search/validate
router.post('/validate', (req, res) => {
    const { username, options } = req.body;
    const validation = validateSearchParams(username, options);
    
    // Validation Reddit Ultra spécifique
    if (options.reddit || options.social) {
        if (options.minConfidence && (options.minConfidence < 0 || options.minConfidence > 100)) {
            validation.isValid = false;
            validation.errors.push('minConfidence doit être entre 0 et 100');
        }
        
        if (options.maxResults && (options.maxResults < 1 || options.maxResults > 10000)) {
            validation.isValid = false;
            validation.errors.push('maxResults doit être entre 1 et 10000');
        }
    }
    
    res.json(validation);
});

// 🚀 NOUVELLE ROUTE SPÉCIALISÉE REDDIT ULTRA
router.post('/reddit-ultra', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { username, options = {} } = req.body;
        
        if (!username) {
            return res.status(400).json({
                error: 'Username requis'
            });
        }

        const cleanUsername = username.replace('@', '');
        
        logger.info(`🎯 REDDIT ULTRA SEARCH SPÉCIALISÉE pour: ${cleanUsername}`);

        const redditService = new RedditUltraSearchService();
        
        // Options Reddit Ultra complètes
        const redditOptions = {
            useCache: options.useCache !== false,
            exportFormat: options.exportFormat || 'json',
            maxResults: parseInt(options.maxResults) || 1000,
            minConfidence: parseInt(options.minConfidence) || 30,
            includeStats: true,
            subredditFilter: options.subredditFilter || null,
            timeFilter: options.timeFilter || null,
            phases: options.phases || ['all']
        };

        const results = await redditService.searchWithAdvancedOptions(cleanUsername, redditOptions);
        
        // Si format d'export spécifique demandé
        if (options.exportFormat && options.exportFormat !== 'json') {
            return res.json({
                success: true,
                exportedData: results,
                format: options.exportFormat,
                searchTime: Date.now() - startTime
            });
        }

        res.json({
            success: true,
            ...results,
            searchTime: Date.now() - startTime,
            service: 'Reddit Ultra Search',
            version: '2.0.0'
        });

    } catch (error) {
        logger.error('❌ Erreur Reddit Ultra Search spécialisée:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur Reddit Ultra Search',
            message: error.message
        });
    }
});

// Route de test Reddit Ultra
router.get('/test-reddit-ultra/:username?', async (req, res) => {
    try {
        const username = req.params.username || 'telegram';
        const redditService = new RedditUltraSearchService();
        
        logger.info(`🧪 TEST REDDIT ULTRA pour: ${username}`);
        
        // Test avec options légères pour éviter timeout
        const testOptions = {
            useCache: true,
            maxResults: 50,
            minConfidence: 40,
            includeStats: true
        };
        
        const results = await redditService.searchWithAdvancedOptions(username, testOptions);
        
        res.json({
            success: true,
            username: username,
            results: results.results || results,
            metadata: results.metadata || {},
            statistics: results.statistics || {},
            serviceStats: redditService.getSearchStats(),
            message: 'Test Reddit Ultra réussi ✅'
        });
    } catch (error) {
        logger.error('❌ Erreur test Reddit Ultra:', error);
        res.json({
            success: false,
            error: error.message,
            message: 'Test Reddit Ultra échoué ❌'
        });
    }
});

// 🗂️ ROUTE DE GESTION DU CACHE REDDIT
router.post('/reddit-cache', async (req, res) => {
    try {
        const { action } = req.body;
        const redditService = new RedditUltraSearchService();
        
        switch (action) {
            case 'clear':
                redditService.clearCache();
                res.json({ success: true, message: 'Cache Reddit vidé' });
                break;
                
            case 'stats':
                const stats = redditService.getSearchStats();
                res.json({ success: true, stats });
                break;
                
            default:
                res.status(400).json({ error: 'Action invalide (clear, stats)' });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📊 ROUTE D'EXPORT AVANCÉ
router.post('/export', async (req, res) => {
    try {
        const { username, format = 'json', options = {} } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username requis' });
        }
        
        const cleanUsername = username.replace('@', '');
        const redditService = new RedditUltraSearchService();
        
        const exportOptions = {
            ...options,
            exportFormat: format,
            useCache: true
        };
        
        const exportedData = await redditService.searchWithAdvancedOptions(cleanUsername, exportOptions);
        
        // Headers pour téléchargement selon le format
        const contentTypes = {
            'json': 'application/json',
            'csv': 'text/csv',
            'summary': 'text/plain'
        };
        
        const extensions = {
            'json': 'json',
            'csv': 'csv',
            'summary': 'txt'
        };
        
        res.setHeader('Content-Type', contentTypes[format] || 'application/json');
        res.setHeader('Content-Disposition', 
            `attachment; filename="telegram_search_${cleanUsername}_${Date.now()}.${extensions[format] || 'json'}"`
        );
        
        if (format === 'json') {
            res.json(exportedData);
        } else {
            res.send(exportedData);
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fonction utilitaire avancée pour supprimer les doublons
function removeDuplicatesAdvanced(results) {
    const seen = new Map();
    const finalResults = [];
    
    results.forEach(result => {
        // Clés de déduplication multiples
        const urlKey = result.url?.toLowerCase();
        const usernameKey = result.username?.toLowerCase();
        const titleKey = result.title?.toLowerCase();
        
        // Clé composite pour déduplication intelligente
        const compositeKey = urlKey || `${usernameKey}-${titleKey}` || `${result.title}-${result.source}`.toLowerCase();
        
        if (seen.has(compositeKey)) {
            const existing = seen.get(compositeKey);
            
            // Fusion intelligente : garder le meilleur score/confiance
            if ((result.confidence || 0) > (existing.confidence || 0)) {
                // Fusionner les métadonnées
                if (existing.metadata?.mergedSources) {
                    result.metadata = result.metadata || {};
                    result.metadata.mergedSources = [...existing.metadata.mergedSources];
                    if (existing.metadata.redditSource) {
                        result.metadata.mergedSources.push(existing.metadata.redditSource);
                    }
                }
                
                // Remplacer dans les résultats finaux
                const existingIndex = finalResults.findIndex(r => r === existing);
                if (existingIndex !== -1) {
                    finalResults[existingIndex] = result;
                }
                seen.set(compositeKey, result);
            } else {
                // Ajouter cette source aux sources fusionnées de l'existant
                existing.metadata = existing.metadata || {};
                existing.metadata.mergedSources = existing.metadata.mergedSources || [];
                if (result.metadata?.redditSource) {
                    existing.metadata.mergedSources.push(result.metadata.redditSource);
                }
            }
        } else {
            seen.set(compositeKey, result);
            finalResults.push(result);
        }
    });
    
    return finalResults;
}

// Fonction pour générer les statistiques avancées
function generateAdvancedStats(results) {
    const stats = {
        total: results.length,
        groups: results.filter(r => r.type === 'group').length,
        channels: results.filter(r => r.type === 'channel').length,
        users: results.filter(r => r.type === 'user').length,
        bots: results.filter(r => r.type === 'bot').length,
        mentions: results.filter(r => r.type === 'mention').length,
        inferred: results.filter(r => r.type === 'inferred').length,
        verified: results.filter(r => r.verified).length,
        
        // Statistiques de confiance
        confidence: {
            avg: results.length > 0 ? 
                Math.round(results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length) : 0,
            high: results.filter(r => (r.confidence || 0) >= 70).length,
            medium: results.filter(r => (r.confidence || 0) >= 40 && (r.confidence || 0) < 70).length,
            low: results.filter(r => (r.confidence || 0) < 40).length
        },
        
        // Statistiques Reddit spécifiques
        reddit: {
            avgScore: results.length > 0 ? 
                Math.round(results.reduce((sum, r) => sum + (r.metadata?.redditSource?.redditScore || 0), 0) / results.length) : 0,
            topSubreddits: {},
            withMultipleSources: results.filter(r => r.metadata?.mergedSources?.length > 0).length
        },
        
        sources: {},
        
        // Métadonnées temporelles
        temporal: {
            newest: null,
            oldest: null
        }
    };

    // Comptage par source et subreddit
    results.forEach(result => {
        const source = result.source || 'unknown';
        stats.sources[source] = (stats.sources[source] || 0) + 1;
        
        // Top subreddits
        const subreddit = result.metadata?.redditSource?.foundIn;
        if (subreddit) {
            stats.reddit.topSubreddits[subreddit] = (stats.reddit.topSubreddits[subreddit] || 0) + 1;
        }
        
        // Temporal analysis
        if (result.timestamp) {
            const timestamp = new Date(result.timestamp);
            if (!stats.temporal.newest || timestamp > new Date(stats.temporal.newest)) {
                stats.temporal.newest = result.timestamp;
            }
            if (!stats.temporal.oldest || timestamp < new Date(stats.temporal.oldest)) {
                stats.temporal.oldest = result.timestamp;
            }
        }
    });

    return stats;
}

module.exports = router;