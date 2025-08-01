const axios = require('axios');
const { logger } = require('../utils/logger');

class GoogleSearchService {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
        this.requestDelay = 1000; // 1 seconde entre les requêtes
    }

    async searchUser(username, options = {}) {
        if (!this.apiKey || !this.searchEngineId) {
            throw new Error('Google API credentials non configurées');
        }

        const queries = this.generateQueries(username);
        const results = [];

        for (const query of queries) {
            try {
                logger.info(`Google Search: ${query}`);
                
                const response = await this.performSearch(query, options);
                const processedResults = this.processResults(response, username, query);
                results.push(...processedResults);

                // Délai entre les requêtes pour respecter les limites
                await this.delay(this.requestDelay);

            } catch (error) {
                logger.error(`Erreur Google Search pour "${query}":`, error.message);
                
                // Continue avec les autres requêtes même en cas d'erreur
                if (error.response?.status === 429) {
                    logger.warn('Limite de débit Google atteinte, augmentation du délai');
                    this.requestDelay += 500;
                }
            }
        }

        return this.rankResults(results);
    }

    generateQueries(username) {
        return [
            `site:t.me "${username}"`,
            `site:t.me "@${username}"`,
            `site:t.me/${username}`,
            `"${username}" telegram group OR channel`,
            `inurl:t.me "${username}"`,
            `"telegram.me/${username}"`,
            `"${username}" telegram chat`,
            `site:telegram.me "${username}"`
        ];
    }

    async performSearch(query, options) {
        const params = {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            num: 10, // Maximum 10 résultats par requête
            fields: 'items(title,link,snippet,pagemap/metatags)',
            safe: 'off',
            lr: 'lang_fr|lang_en' // Français et anglais
        };

        const response = await axios.get(this.baseUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'TelegramIntelligenceScraper/1.0'
            }
        });

        return response.data;
    }

    processResults(googleResponse, username, query) {
        if (!googleResponse.items) {
            return [];
        }

        return googleResponse.items.map(item => {
            const url = item.link;
            const confidence = this.calculateConfidence(item, username);
            const type = this.determineType(url, item);
            const members = this.extractMembers(item);

            return {
                url: url,
                title: item.title || 'Sans titre',
                description: item.snippet || '',
                type: type,
                source: 'Google Search API',
                confidence: confidence,
                members: members,
                verified: this.isVerified(item),
                timestamp: new Date().toISOString(),
                metadata: {
                    query: query,
                    searchEngine: 'google',
                    pagemap: item.pagemap
                }
            };
        }).filter(result => result.confidence >= 30); // Filtre les résultats peu fiables
    }

    calculateConfidence(item, username) {
        let confidence = 50; // Base de confiance
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        const usernameLower = username.toLowerCase();

        // Facteurs qui augmentent la confiance
        if (url.includes('t.me/') || url.includes('telegram.me/')) confidence += 20;
        if (url.includes(usernameLower)) confidence += 15;
        if (title.includes(usernameLower)) confidence += 10;
        if (snippet.includes(usernameLower)) confidence += 5;
        if (title.includes('official') || title.includes('officiel')) confidence += 10;
        if (snippet.includes('members') || snippet.includes('membres')) confidence += 5;
        if (title.includes('verified') || title.includes('vérifié')) confidence += 10;

        // Facteurs qui diminuent la confiance
        if (snippet.includes('spam') || snippet.includes('fake')) confidence -= 20;
        if (title.includes('bot') && !title.includes('official')) confidence -= 10;
        if (url.includes('archive') || url.includes('cache')) confidence -= 15;

        return Math.min(Math.max(confidence, 0), 100);
    }

    determineType(url, item) {
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();

        // Détermination du type basée sur les indices
        if (title.includes('channel') || snippet.includes('channel')) return 'channel';
        if (title.includes('group') || snippet.includes('group') || snippet.includes('groupe')) return 'group';
        if (title.includes('user') || snippet.includes('user') || snippet.includes('utilisateur')) return 'user';
        if (title.includes('private') || snippet.includes('private') || snippet.includes('privé')) return 'privategroup';
        
        // Détection par URL
        if (url.includes('/joinchat/')) return 'privategroup';
        if (url.match(/\/[A-Za-z][A-Za-z0-9_]+$/)) return 'channel'; // URL simple = probablement un canal
        
        return 'unknown';
    }

    extractMembers(item) {
        const snippet = item.snippet || '';
        const title = item.title || '';
        const text = `${title} ${snippet}`;

        // Recherche de patterns de nombre de membres
        const patterns = [
            /(\d+(?:,\d+)*)\s*(?:members?|membres?|users?|utilisateurs?)/i,
            /(\d+(?:\.\d+)?)[kK]\s*(?:members?|membres?)/i,
            /(\d+(?:\.\d+)?)[mM]\s*(?:members?|membres?)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let number = match[1].replace(/,/g, '');
                if (match[0].toLowerCase().includes('k')) {
                    number = parseFloat(number) * 1000;
                } else if (match[0].toLowerCase().includes('m')) {
                    number = parseFloat(number) * 1000000;
                }
                return Math.floor(number);
            }
        }

        return null;
    }

    isVerified(item) {
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        
        return title.includes('verified') || 
               title.includes('official') || 
               snippet.includes('verified') || 
               snippet.includes('official') ||
               title.includes('✓') ||
               snippet.includes('✓');
    }

    rankResults(results) {
        // Tri par confiance puis par nombre de membres
        return results.sort((a, b) => {
            if (b.confidence !== a.confidence) {
                return b.confidence - a.confidence;
            }
            return (b.members || 0) - (a.members || 0);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Méthode pour tester la connectivité de l'API
    async testConnection() {
        try {
            const response = await this.performSearch('test', {});
            return { 
                success: true, 
                message: 'Google Search API connectée avec succès' 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Erreur de connexion Google API: ${error.message}` 
            };
        }
    }
}

module.exports = GoogleSearchService;
