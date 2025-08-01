const axios = require('axios');
const { logger, logApiRequest, logApiResponse } = require('../utils/logger');

class BingSearchService {
    constructor() {
        this.apiKey = process.env.BING_API_KEY;
        this.endpoint = process.env.BING_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search';
        this.requestDelay = 800; // Bing permet 3 requêtes/seconde
        this.market = 'fr-FR'; // Marché français par défaut
    }

    async searchUser(username, options = {}) {
        if (!this.apiKey) {
            throw new Error('Clé API Bing non configurée');
        }

        const queries = this.generateQueries(username);
        const results = [];

        for (const query of queries) {
            try {
                logApiRequest('Bing', 'webSearch', { query, market: this.market });
                
                const startTime = Date.now();
                const searchResults = await this.performSearch(query, options);
                const duration = Date.now() - startTime;
                
                const processedResults = this.processResults(searchResults, username, query);
                results.push(...processedResults);

                logApiResponse('Bing', true, processedResults.length, duration);

                // Respecter les limites de débit
                await this.delay(this.requestDelay);

            } catch (error) {
                logApiResponse('Bing', false, 0, 0, error);
                
                if (error.response?.status === 429) {
                    logger.warn('Bing rate limit atteint, augmentation du délai');
                    this.requestDelay += 500;
                    await this.delay(this.requestDelay);
                } else if (error.response?.status === 403) {
                    logger.error('Bing API quota dépassé ou clé invalide');
                    break; // Arrêter les requêtes si quota dépassé
                }
            }
        }

        return this.rankResults(results);
    }

    generateQueries(username) {
        return [
            `site:t.me "${username}"`,
            `site:t.me "@${username}"`,
            `site:telegram.me "${username}"`,
            `"${username}" telegram channel`,
            `"${username}" telegram group`,
            `inurl:t.me "${username}"`,
            `"@${username}" telegram chat`,
            `"${username}" telegram official`
        ];
    }

    async performSearch(query, options) {
        const params = {
            q: query,
            count: 10, // Maximum 50 par requête
            offset: 0,
            mkt: this.market,
            safesearch: 'Off',
            textDecorations: false,
            textFormat: 'Raw',
            responseFilter: 'Webpages', // Seulement les pages web
            freshness: 'Month' // Résultats du dernier mois pour plus de pertinence
        };

        const headers = {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'User-Agent': 'TelegramIntelligenceScraper/1.0',
            'X-MSEdge-ClientID': this.generateClientId(),
            'Accept': 'application/json'
        };

        const response = await axios.get(this.endpoint, {
            params,
            headers,
            timeout: 12000
        });

        return response.data;
    }

    processResults(bingResponse, username, query) {
        if (!bingResponse.webPages || !bingResponse.webPages.value) {
            return [];
        }

        return bingResponse.webPages.value
            .filter(item => this.isRelevantResult(item, username))
            .map(item => {
                const confidence = this.calculateConfidence(item, username);
                const type = this.determineType(item.url, item);
                const members = this.extractMembers(item);

                return {
                    url: item.url,
                    title: item.name || 'Sans titre',
                    description: item.snippet || '',
                    type: type,
                    source: 'Bing Search API',
                    confidence: confidence,
                    members: members,
                    verified: this.isVerified(item),
                    timestamp: new Date().toISOString(),
                    metadata: {
                        query: query,
                        searchEngine: 'bing',
                        displayUrl: item.displayUrl,
                        dateLastCrawled: item.dateLastCrawled
                    }
                };
            })
            .filter(result => result.confidence >= 30);
    }

    isRelevantResult(item, username) {
        const url = (item.url || '').toLowerCase();
        const title = (item.name || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const usernameLower = username.toLowerCase();

        // Doit contenir le username ET être lié à Telegram
        const hasUsername = title.includes(usernameLower) || 
                          snippet.includes(usernameLower) || 
                          url.includes(usernameLower);

        const isTelegramRelated = url.includes('t.me') || 
                                url.includes('telegram') || 
                                title.includes('telegram') || 
                                snippet.includes('telegram');

        return hasUsername && isTelegramRelated;
    }

    calculateConfidence(item, username) {
        let confidence = 55; // Base Bing (généralement bonne qualité)
        const title = (item.name || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        const usernameLower = username.toLowerCase();

        // Facteurs de boost de confiance
        if (url.includes('t.me/') || url.includes('telegram.me/')) confidence += 20;
        if (url.includes(usernameLower)) confidence += 18;
        if (title.includes(usernameLower)) confidence += 12;
        if (snippet.includes(usernameLower)) confidence += 6;
        
        // Indicateurs de qualité
        if (title.includes('official') || title.includes('verified')) confidence += 15;
        if (snippet.includes('members') || snippet.includes('subscribers')) confidence += 8;
        if (title.includes('channel') || title.includes('group')) confidence += 10;
        
        // Indicateurs de fraîcheur
        if (item.dateLastCrawled) {
            const crawlDate = new Date(item.dateLastCrawled);
            const daysSinceCrawl = (Date.now() - crawlDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCrawl < 7) confidence += 5; // Crawlé récemment
        }

        // Facteurs de réduction
        if (snippet.includes('spam') || snippet.includes('fake')) confidence -= 20;
        if (title.includes('bot') && !title.includes('official')) confidence -= 12;
        if (url.includes('archive') || url.includes('cache')) confidence -= 15;
        if (url.includes('reddit.com') || url.includes('forum')) confidence -= 10; // Discussions, pas sources officielles

        return Math.min(Math.max(confidence, 0), 100);
    }

    determineType(url, item) {
        const title = (item.name || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const displayUrl = (item.displayUrl || '').toLowerCase();

        // Analyse par titre et description
        if (title.includes('channel') || snippet.includes('channel')) return 'channel';
        if (title.includes('group') || snippet.includes('group')) return 'group';
        if (title.includes('user') || snippet.includes('user profile')) return 'user';
        if (title.includes('private') || snippet.includes('private')) return 'privategroup';
        
        // Analyse par URL
        if (url.includes('/joinchat/')) return 'privategroup';
        if (url.includes('/addlist/')) return 'group';
        
        // URL structure analysis
        const urlPath = url.split('/').pop();
        if (urlPath && urlPath.match(/^[A-Za-z][A-Za-z0-9_]+$/)) {
            // URL simple = probablement un canal
            return 'channel';
        }
        
        return 'unknown';
    }

    extractMembers(item) {
        const text = `${item.name || ''} ${item.snippet || ''}`;

        // Patterns de membres en français et anglais
        const patterns = [
            /(\d+(?:,\d+)*)\s*(?:members?|membres?|subscribers?|abonnés?)/i,
            /(\d+(?:\.\d+)?)[kK]\s*(?:members?|membres?|subs?)/i,
            /(\d+(?:\.\d+)?)[mM]\s*(?:members?|membres?|subs?)/i,
            /(\d+(?:\s*\d+)*)\s*(?:users?|utilisateurs?|personnes?)/i,
            /(\d+)\s*(?:participant|follower|following)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let number = match[1].replace(/[,\s]/g, '');
                const multiplier = match[0].toLowerCase();
                
                if (multiplier.includes('k')) {
                    number = parseFloat(number) * 1000;
                } else if (multiplier.includes('m')) {
                    number = parseFloat(number) * 1000000;
                }
                
                const result = Math.floor(number);
                if (result > 0 && result < 10000000) { // Validation: entre 1 et 10M
                    return result;
                }
            }
        }

        return null;
    }

    isVerified(item) {
        const title = (item.name || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        
        return title.includes('verified') || 
               title.includes('official') || 
               snippet.includes('verified') || 
               snippet.includes('official') ||
               title.includes('✓') ||
               snippet.includes('✓') ||
               url.includes('official');
    }

    rankResults(results) {
        return results.sort((a, b) => {
            // 1. Résultats vérifiés en premier
            if (a.verified && !b.verified) return -1;
            if (!a.verified && b.verified) return 1;
            
            // 2. Par confiance
            if (Math.abs(b.confidence - a.confidence) > 5) {
                return b.confidence - a.confidence;
            }
            
            // 3. Par type (canaux et groupes officiels prioritaires)
            const typeWeight = { channel: 3, group: 2, user: 1, privategroup: 0, unknown: 0 };
            const aWeight = typeWeight[a.type] || 0;
            const bWeight = typeWeight[b.type] || 0;
            if (bWeight !== aWeight) {
                return bWeight - aWeight;
            }
            
            // 4. Par nombre de membres
            return (b.members || 0) - (a.members || 0);
        });
    }

    generateClientId() {
        // Générer un ID client unique pour Bing (optionnel mais recommandé)
        return 'telegram-scraper-' + Math.random().toString(36).substr(2, 16);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Test de connectivité de l'API
    async testConnection() {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    message: 'Clé API Bing manquante'
                };
            }

            // Test avec une requête simple
            const testResponse = await this.performSearch('telegram test', {});
            
            return {
                success: true,
                message: 'Bing Search API connectée avec succès',
                resultsCount: testResponse.webPages?.value?.length || 0,
                rateLimits: this.getRateLimits()
            };
        } catch (error) {
            let errorMessage = `Erreur Bing API: ${error.message}`;
            
            if (error.response?.status === 401) {
                errorMessage = 'Clé API Bing invalide ou expirée';
            } else if (error.response?.status === 403) {
                errorMessage = 'Quota Bing API dépassé ou accès refusé';
            } else if (error.response?.status === 429) {
                errorMessage = 'Rate limit Bing atteint, réessayez plus tard';
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    // Obtenir les informations de rate limiting
    getRateLimits() {
        return {
            requestsPerSecond: Math.floor(1000 / this.requestDelay),
            currentDelay: this.requestDelay,
            dailyLimit: 1000, // Limite gratuite Bing
            monthlyLimit: 1000,
            endpoint: this.endpoint,
            market: this.market
        };
    }

    // Obtenir les statistiques d'utilisation (si disponible)
    async getUsageStats() {
        try {
            // Bing ne fournit pas d'endpoint pour les stats d'usage
            // Mais on peut tracker localement
            return {
                requestsToday: 0, // À implémenter avec un système de cache/DB
                remainingQuota: 1000, // À calculer
                resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Minuit prochain
            };
        } catch (error) {
            logger.error('Erreur récupération stats Bing:', error);
            return null;
        }
    }

    // Optimiser les requêtes en fonction du type de recherche
    optimizeQueryForType(query, targetType = 'all') {
        const baseQuery = query;
        
        switch (targetType) {
            case 'channel':
                return `${baseQuery} telegram channel OR канал`;
            case 'group':
                return `${baseQuery} telegram group OR группа`;
            case 'user':
                return `${baseQuery} telegram user profile`;
            case 'official':
                return `${baseQuery} telegram official verified`;
            default:
                return baseQuery;
        }
    }
}

module.exports = BingSearchService;