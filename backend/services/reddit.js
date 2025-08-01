const axios = require('axios');
const { logger } = require('../utils/logger');

class RedditUltraSearchService {
    constructor() {
        this.clientId = process.env.REDDIT_CLIENT_ID;
        this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
        this.userAgent = 'TelegramIntelligenceScraper/1.0';
        this.accessToken = null;
        this.tokenExpiry = null;
        
        this.baseURL = 'https://oauth.reddit.com';
        this.authURL = 'https://www.reddit.com/api/v1/access_token';
        this.requestDelay = 500; // Plus rapide pour plus de requêtes
        
        // Cache intelligent
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes pour fraîcheur maximale
        
        logger.info('🚀 Reddit ULTRA Search Service initialisé - RECHERCHE MAXIMALE');
    }

    async searchTelegramGroupsUltraExhaustive(username, options = {}) {
        const startTime = Date.now();
        logger.info(`🎯 REDDIT ULTRA SEARCH pour: ${username} - TOUTES STRATÉGIES ACTIVÉES`);
        
        await this.authenticate();
        
        const allResults = [];
        let totalQueries = 0;
        
        // PHASE 1: Recherches directes avec tous les patterns imaginables
        logger.info('🔍 PHASE 1: Patterns exhaustifs');
        const directResults = await this.executeExhaustivePatternSearch(username);
        allResults.push(...directResults);
        totalQueries += directResults.queryCount || 0;
        
        // PHASE 2: Variations massives du username (50+ variations)
        logger.info('🔄 PHASE 2: Variations massives');
        const variationResults = await this.executeMassiveVariationSearch(username);
        allResults.push(...variationResults);
        totalQueries += variationResults.queryCount || 0;
        
        // PHASE 3: Recherche temporelle sur toutes les périodes
        logger.info('📅 PHASE 3: Analyse temporelle complète');
        const temporalResults = await this.executeTemporalExhaustiveSearch(username);
        allResults.push(...temporalResults);
        totalQueries += temporalResults.queryCount || 0;
        
        // PHASE 4: Recherche inversée - tous les liens t.me puis filtrage
        logger.info('🔍 PHASE 4: Recherche inversée massive');
        const reverseResults = await this.executeReverseSearchMassive(username);
        allResults.push(...reverseResults);
        totalQueries += reverseResults.queryCount || 0;
        
        // PHASE 5: Mining de données utilisateur Reddit
        logger.info('⛏️ PHASE 5: Mining utilisateur Reddit');
        const userResults = await this.executeUserMiningExhaustive(username);
        allResults.push(...userResults);
        totalQueries += userResults.queryCount || 0;
        
        // PHASE 6: Recherche contextuelle et sémantique
        logger.info('🧠 PHASE 6: Recherche contextuelle');
        const contextResults = await this.executeContextualSearch(username);
        allResults.push(...contextResults);
        totalQueries += contextResults.queryCount || 0;
        
        // PHASE 7: Cross-référencement avec subreddits connexes
        logger.info('🔗 PHASE 7: Cross-référencement');
        const crossResults = await this.executeCrossReferenceSearch(username);
        allResults.push(...crossResults);
        totalQueries += crossResults.queryCount || 0;
        
        // PHASE 8: Analyse des commentaires (où les liens sont souvent cachés)
        logger.info('💬 PHASE 8: Analyse des commentaires');
        const commentResults = await this.executeCommentAnalysis(username);
        allResults.push(...commentResults);
        totalQueries += commentResults.queryCount || 0;
        
        // POST-TRAITEMENT ULTRA-INTELLIGENT
        logger.info('🧠 POST-TRAITEMENT ULTRA-INTELLIGENT');
        const finalResults = await this.ultraIntelligentProcessing(allResults, username);
        
        const duration = Date.now() - startTime;
        logger.info(`🎯 REDDIT ULTRA SEARCH terminée: ${finalResults.length} groupes trouvés avec ${totalQueries} requêtes en ${duration}ms`);
        
        return finalResults;
    }

    // MÉTHODES DE MINING UTILISATEUR
    async mineUserPostsExhaustive(username) {
        const results = [];
        let queryCount = 0;
        
        try {
            // Posts récents
            const recentPosts = await this.getUserPosts(username, 'new', 100);
            results.push(...this.filterTelegramPosts(recentPosts, username, 'user_posts_recent'));
            queryCount++;
            
            // Posts populaires
            const topPosts = await this.getUserPosts(username, 'top', 100);
            results.push(...this.filterTelegramPosts(topPosts, username, 'user_posts_top'));
            queryCount++;
            
            // Posts controversés (parfois révélateurs)
            const controversialPosts = await this.getUserPosts(username, 'controversial', 100);
            results.push(...this.filterTelegramPosts(controversialPosts, username, 'user_posts_controversial'));
            queryCount++;
            
        } catch (error) {
            logger.debug(`User posts mining failed for ${username}`);
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async mineUserCommentsExhaustive(username) {
        const results = [];
        let queryCount = 0;
        
        try {
            // Commentaires récents
            const recentComments = await this.getUserComments(username, 'new', 100);
            results.push(...this.filterTelegramComments(recentComments, username, 'user_comments_recent'));
            queryCount++;
            
            // Commentaires populaires
            const topComments = await this.getUserComments(username, 'top', 100);
            results.push(...this.filterTelegramComments(topComments, username, 'user_comments_top'));
            queryCount++;
            
        } catch (error) {
            logger.debug(`User comments mining failed for ${username}`);
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async getUserPosts(username, sort = 'new', limit = 100) {
        const response = await axios.get(`${this.baseURL}/user/${username}/submitted`, {
            params: { sort, limit, raw_json: 1 },
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': this.userAgent
            }
        });
        return response.data;
    }

    async getUserComments(username, sort = 'new', limit = 100) {
        const response = await axios.get(`${this.baseURL}/user/${username}/comments`, {
            params: { sort, limit, raw_json: 1 },
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': this.userAgent
            }
        });
        return response.data;
    }

    filterTelegramPosts(postsData, username, method) {
        const results = [];
        
        if (!postsData?.data?.children) return results;
        
        postsData.data.children.forEach(post => {
            const data = post.data;
            
            if (this.containsTelegramLinks(data.title + ' ' + data.selftext + ' ' + data.url)) {
                const result = this.createResultFromPost(data, username, method);
                results.push(result);
            }
        });
        
        return results;
    }

    filterTelegramComments(commentsData, username, method) {
        const results = [];
        
        if (!commentsData?.data?.children) return results;
        
        commentsData.data.children.forEach(comment => {
            const data = comment.data;
            
            if (this.containsTelegramLinks(data.body)) {
                const result = this.createResultFromComment(data, username, null, method);
                results.push(result);
            }
        });
        
        return results;
    }

    async searchUserMentionsExhaustive(username) {
        const results = [];
        let queryCount = 0;
        
        // Patterns de mentions exhaustifs
        const mentionPatterns = [
            `u/${username}`,
            `/u/${username}`,
            `user ${username}`,
            `@${username}`,
            `${username} said`,
            `${username} posted`,
            `${username} shared`,
            `${username} mentioned`,
            `${username} wrote`,
            `${username} created`,
            `by ${username}`,
            `from ${username}`,
            `thanks ${username}`,
            `kudos ${username}`,
            `credit ${username}`,
            `source ${username}`,
            `via ${username}`,
            `see ${username}`,
            `check ${username}`,
            `ask ${username}`,
            `contact ${username}`
        ];
        
        for (const pattern of mentionPatterns) {
            try {
                const response = await this.performSearchWithRetry(pattern, null);
                const processed = this.processResults(response, username, pattern);
                processed.forEach(r => {
                    r.metadata.searchType = 'user_mention';
                    r.metadata.mentionPattern = pattern;
                });
                results.push(...processed);
                queryCount++;
                await this.delay(this.requestDelay);
            } catch (error) {
                // Continue
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async analyzePostComments(postData, username) {
        const results = [];
        
        try {
            // Récupérer les commentaires du post
            const commentsUrl = `${this.baseURL}/r/${postData.subreddit}/comments/${postData.id}`;
            const response = await axios.get(commentsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': this.userAgent
                }
            });
            
            if (response.data && Array.isArray(response.data) && response.data[1]?.data?.children) {
                const comments = response.data[1].data.children;
                
                comments.forEach(comment => {
                    if (comment.data?.body) {
                        const commentText = comment.data.body.toLowerCase();
                        
                        // Vérifier si le commentaire mentionne le username ET contient des liens Telegram
                        if (this.flexibleUsernameMatch(commentText, username) && 
                            this.containsTelegramLinks(commentText)) {
                            
                            const result = this.createResultFromComment(comment.data, username, postData);
                            results.push(result);
                        }
                    }
                });
            }
            
        } catch (error) {
            logger.debug(`Failed to analyze comments for post ${postData.id}`);
        }
        
        return results;
    }

    // MÉTHODES DE POST-TRAITEMENT ULTRA-INTELLIGENT
    async ultraIntelligentProcessing(allResults, username) {
        logger.info(`🧠 ULTRA-PROCESSING de ${allResults.length} résultats bruts`);
        
        // 1. Extraction exhaustive de TOUS les liens Telegram
        const telegramLinks = this.extractAllTelegramLinksUltra(allResults, username);
        logger.info(`📱 ${telegramLinks.length} liens Telegram bruts extraits`);
        
        // 2. Déduplication ultra-intelligente
        const deduplicatedLinks = this.ultraIntelligentDeduplication(telegramLinks);
        logger.info(`🔄 ${deduplicatedLinks.length} liens après déduplication`);
        
        // 3. Scoring multi-facteurs avancé
        const scoredLinks = this.ultraAdvancedScoring(deduplicatedLinks, username);
        logger.info(`📊 Scoring avancé appliqué`);
        
        // 4. Filtrage qualité maximale
        const highQualityLinks = this.ultraQualityFilter(scoredLinks, username);
        logger.info(`✨ ${highQualityLinks.length} liens haute qualité retenus`);
        
        // 5. Enrichissement des métadonnées
        const enrichedLinks = this.enrichMetadata(highQualityLinks, username);
        
        // 6. Classement final ultra-intelligent
        const finalRankedLinks = this.ultraIntelligentRanking(enrichedLinks, username);
        
        return finalRankedLinks;
    }

    extractAllTelegramLinksUltra(results, username) {
        const links = [];
        
        results.forEach(result => {
            // Méthode 1: Liens déjà dans metadata
            if (result.metadata?.telegramLinks) {
                result.metadata.telegramLinks.forEach(link => {
                    links.push(this.createUltraTelegramResult(link, result, username));
                });
            }
            
            // Méthode 2: Extraction ultra-avancée
            const extractedLinks = this.ultraAdvancedLinkExtraction(
                `${result.title} ${result.description} ${result.url || ''}`,
                result,
                username
            );
            links.push(...extractedLinks);
            
            // Méthode 3: Inférence de liens possibles
            const inferredLinks = this.inferPossibleTelegramLinks(result, username);
            links.push(...inferredLinks);
        });
        
        return links;
    }

    ultraAdvancedLinkExtraction(text, sourceResult, searchUsername) {
        const links = [];
        
        // Patterns ULTRA-exhaustifs pour tous les formats possibles
        const ultraPatterns = [
            // URLs complètes standard
            /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]{5,32})/g,
            /(?:https?:\/\/)?(?:www\.)?telegram\.me\/([a-zA-Z0-9_]{5,32})/g,
            
            // Invitations privées (tous formats)
            /(?:https?:\/\/)?(?:www\.)?t\.me\/joinchat\/([a-zA-Z0-9_-]{22})/g,
            /(?:https?:\/\/)?(?:www\.)?t\.me\/\+([a-zA-Z0-9_-]+)/g,
            
            // Formats courts et mentions
            /@([a-zA-Z][a-zA-Z0-9_]{4,31})(?=\s|$|[^a-zA-Z0-9_])/g,
            /telegram\.me\/([a-zA-Z0-9_]{5,32})/g,
            /t\.me\/([a-zA-Z0-9_]{5,32})/g,
            
            // Formats déguisés ou partiels
            /(?:telegram|tg|channel|group)\s*[:=]\s*@?([a-zA-Z0-9_]{5,32})/gi,
            /(?:join|follow|check)\s+@?([a-zA-Z0-9_]{5,32})/gi,
            /(?:^|\s)([a-zA-Z0-9_]{5,32})(?=\s+(?:telegram|channel|group|chat))/gi,
            
            // Formats avec masquage
            /t\s*\.\s*me\s*\/\s*([a-zA-Z0-9_]+)/gi,
            /telegram\s*\.\s*me\s*\/\s*([a-zA-Z0-9_]+)/gi,
            
            // Formats avec substitution de caractères
            /t\[?\.\]?me\/([a-zA-Z0-9_]+)/gi,
            /telegram\[?\.\]?me\/([a-zA-Z0-9_]+)/gi,
            
            // Formats avec espaces ou séparateurs
            /(?:t|telegram)\s*[-_.]\s*me\s*[-\/_]\s*([a-zA-Z0-9_]+)/gi,
            
            // Contextes spécifiques
            /(?:channel|group|chat|community)\s*[:\-=]\s*@?([a-zA-Z0-9_]{5,32})/gi,
            /(?:contact|reach|find)\s+(?:me|us|them)\s+(?:at|on)?\s*@?([a-zA-Z0-9_]{5,32})/gi
        ];
        
        ultraPatterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const extractedUsername = match[1];
                
                if (this.isValidTelegramUsername(extractedUsername)) {
                    const linkData = this.createUltraAdvancedTelegramLink(
                        extractedUsername,
                        match[0],
                        sourceResult,
                        searchUsername,
                        index
                    );
                    links.push(linkData);
                }
            }
        });
        
        return links;
    }

    // MÉTHODES UTILITAIRES COMPLÈTES
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    capitalizeWords(str) {
        return str.split(/[\s_-]/).map(word => this.capitalizeFirst(word)).join('');
    }

    flexibleUsernameMatch(text, username) {
        const usernameLower = username.toLowerCase();
        const textLower = text.toLowerCase();
        
        // Correspondances directes
        if (textLower.includes(usernameLower)) return true;
        if (textLower.includes(`@${usernameLower}`)) return true;
        if (textLower.includes(`/${usernameLower}`)) return true;
        if (textLower.includes(`t.me/${usernameLower}`)) return true;
        
        // Correspondances avec bordures de mots
        const wordBoundaryPatterns = [
            new RegExp(`\\b${this.escapeRegex(usernameLower)}\\b`, 'i'),
            new RegExp(`[^a-z]${this.escapeRegex(usernameLower)}[^a-z]`, 'i'),
            new RegExp(`^${this.escapeRegex(usernameLower)}[^a-z]`, 'i'),
            new RegExp(`[^a-z]${this.escapeRegex(usernameLower)}$`, 'i')
        ];
        
        if (wordBoundaryPatterns.some(pattern => pattern.test(textLower))) return true;
        
        // Correspondances avec variations mineures
        const minorVariations = [
            usernameLower + 's',
            usernameLower + 'er',
            usernameLower.slice(0, -1), // sans dernière lettre
            usernameLower.slice(1) // sans première lettre
        ];
        
        return minorVariations.some(variation => textLower.includes(variation));
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    containsTelegramLinks(text) {
        return /(?:t\.me|telegram\.me|joinchat)/i.test(text);
    }

    isTelegramRelated(text) {
        const telegramKeywords = [
            'telegram', 'tg', 't.me', 'telegram.me', 'channel', 'group', 'chat',
            'broadcast', 'bot', 'messaging', 'invite', 'link', 'joinchat',
            'community', 'discussion', 'signal', 'whatsapp'
        ];
        
        const textLower = text.toLowerCase();
        return telegramKeywords.some(keyword => textLower.includes(keyword));
    }

    isValidTelegramUsername(username) {
        return username && 
               username.length >= 5 && 
               username.length <= 32 &&
               /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/.test(username) &&
               !this.isCommonWord(username);
    }

    isCommonWord(word) {
        const commonWords = [
            'telegram', 'channel', 'group', 'admin', 'support', 'help',
            'about', 'contact', 'join', 'invite', 'link', 'chat',
            'the', 'and', 'for', 'are', 'with', 'this', 'that',
            'news', 'info', 'update', 'post', 'share', 'here', 'there',
            'official', 'main', 'real', 'true', 'new', 'old'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    couldBeRedditUsername(username) {
        return username.length >= 3 && 
               username.length <= 20 && 
               /^[a-zA-Z0-9_-]+$/.test(username) &&
               !username.includes('@') &&
               !username.includes('.');
    }

    extractTelegramLinks(postData) {
        const links = [];
        const text = `${postData.title || ''} ${postData.selftext || ''} ${postData.url || ''}`;
        
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]{5,32})/g,
            /(?:https?:\/\/)?(?:www\.)?telegram\.me\/([a-zA-Z0-9_]{5,32})/g,
            /(?:https?:\/\/)?(?:www\.)?t\.me\/joinchat\/([a-zA-Z0-9_-]{22})/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                links.push({
                    url: match[0],
                    username: match[1],
                    type: match[0].includes('joinchat') ? 'invite' : 'direct'
                });
            }
        });
        
        return links;
    }

    // MÉTHODES D'AUTHENTIFICATION ET DE REQUÊTES
    async authenticate() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            
            const response = await axios.post(this.authURL, 
                'grant_type=client_credentials', 
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'User-Agent': this.userAgent,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
            
            logger.info('✅ Reddit API authentification réussie');
            return this.accessToken;
            
        } catch (error) {
            throw new Error(`Impossible de s'authentifier avec Reddit API: ${error.response?.status || error.message}`);
        }
    }

    async performSearchWithRetry(query, subreddit = null, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this.performSearch(query, subreddit);
            } catch (error) {
                if (attempt === retries) throw error;
                await this.delay(this.requestDelay * 2);
            }
        }
    }

    async performSearch(query, subreddit = null) {
        const params = {
            q: query,
            sort: 'relevance',
            limit: 100, // Maximum pour plus de résultats
            type: 'link',
            include_over_18: 'false',
            raw_json: 1
        };

        if (subreddit) {
            params.restrict_sr = 'true';
        }

        const url = subreddit 
            ? `${this.baseURL}/r/${subreddit}/search`
            : `${this.baseURL}/search`;

        const response = await axios.get(url, {
            params,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': this.userAgent
            },
            timeout: 15000
        });

        return response.data;
    }

    // MÉTHODES DE CRÉATION D'OBJETS DE RÉSULTATS
    createResultFromPost(data, username, method) {
        return {
            url: `https://reddit.com${data.permalink}`,
            title: data.title || 'Sans titre',
            description: data.selftext || this.generateDescription(data, username),
            type: this.determineType(data),
            source: 'Reddit API',
            confidence: this.calculateBasicConfidence(data, username),
            verified: data.score > 10 && data.num_comments > 5,
            timestamp: new Date(data.created_utc * 1000).toISOString(),
            metadata: {
                subreddit: data.subreddit,
                score: data.score,
                comments: data.num_comments,
                author: data.author,
                searchMethod: method,
                telegramLinks: this.extractTelegramLinks(data),
                platform: 'reddit'
            }
        };
    }

    createResultFromComment(data, username, postData = null, method = 'comment_analysis') {
        return {
            url: `https://reddit.com${data.permalink}`,
            title: `Commentaire par ${data.author}`,
            description: data.body || 'Commentaire sans contenu',
            type: 'comment',
            source: 'Reddit Comment',
            confidence: this.calculateBasicConfidence(data, username),
            verified: data.score > 5,
            timestamp: new Date(data.created_utc * 1000).toISOString(),
            metadata: {
                subreddit: data.subreddit,
                score: data.score,
                author: data.author,
                searchMethod: method,
                isComment: true,
                parentPost: postData ? {
                    title: postData.title,
                    url: `https://reddit.com${postData.permalink}`
                } : null,
                telegramLinks: this.extractTelegramLinks({ title: '', selftext: data.body, url: '' }),
                platform: 'reddit'
            }
        };
    }

    generateDescription(data, username) {
        const parts = [];
        if (data.subreddit) parts.push(`r/${data.subreddit}`);
        if (data.score) parts.push(`${data.score} points`);
        if (data.num_comments) parts.push(`${data.num_comments} commentaires`);
        
        return parts.length > 0 ? parts.join(' • ') : `Post mentionnant ${username}`;
    }

    determineType(data) {
        const text = `${data.title} ${data.selftext}`.toLowerCase();
        
        if (text.includes('group') || text.includes('chat')) return 'group';
        if (text.includes('channel') || text.includes('broadcast')) return 'channel';
        if (text.includes('bot')) return 'bot';
        if (text.includes('invite') || text.includes('join')) return 'invite';
        
        return 'general';
    }

    calculateBasicConfidence(data, username) {
        let confidence = 50;
        
        // Bonus pour score Reddit élevé
        if (data.score > 10) confidence += 10;
        if (data.score > 50) confidence += 15;
        if (data.score > 100) confidence += 20;
        
        // Bonus pour nombre de commentaires
        if (data.num_comments > 5) confidence += 5;
        if (data.num_comments > 20) confidence += 10;
        
        // Bonus pour subreddit spécialisé
        const subreddit = (data.subreddit || '').toLowerCase();
        if (subreddit.includes('telegram')) confidence += 25;
        if (subreddit.includes('crypto')) confidence += 15;
        
        // Malus pour score négatif
        if (data.score < 0) confidence -= 20;
        
        return Math.min(Math.max(confidence, 0), 100);
    }

    // MÉTHODES MANQUANTES POUR LES PHASES DE RECHERCHE
    async executeExhaustivePatternSearch(username) {
        const results = [];
        let queryCount = 0;
        
        // Patterns exhaustifs (déjà définis dans votre code)
        const exhaustivePatterns = [
            `"${username}"`,
            `"@${username}"`,
            `"${username}" telegram`,
            `"${username}" channel`,
            `"${username}" group`,
            `"t.me/${username}"`,
            `${username} telegram`,
            `${username} t.me`,
            `${username} channel`,
            `${username} group`,
            `telegram ${username}`,
            `channel ${username}`,
            `join ${username}`,
            `invite ${username}`,
            `${username} bot`,
            `${username} community`,
            `${username} discussion`
        ];
        
        const prioritySubreddits = [
            'telegram', 'crypto', 'cryptocurrency', 'bitcoin', 'ethereum',
            'telegramchannels', 'TelegramBots', 'CryptoCurrency'
        ];
        
        for (const pattern of exhaustivePatterns) {
            try {
                // Recherche globale
                const globalResults = await this.performSearchWithRetry(pattern, null);
                results.push(...this.processResults(globalResults, username, pattern));
                queryCount++;
                await this.delay(this.requestDelay);
                
                // Recherche dans subreddits prioritaires
                for (const subreddit of prioritySubreddits) {
                    try {
                        const subredditResults = await this.performSearchWithRetry(pattern, subreddit);
                        const processed = this.processResults(subredditResults, username, pattern);
                        processed.forEach(r => {
                            r.metadata.searchPattern = pattern;
                            r.metadata.targetSubreddit = subreddit;
                        });
                        results.push(...processed);
                        queryCount++;
                        await this.delay(this.requestDelay);
                    } catch (error) {
                        // Continue
                    }
                }
            } catch (error) {
                // Continue
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeMassiveVariationSearch(username) {
        const results = [];
        let queryCount = 0;
        
        const allVariations = this.generateMassiveVariations(username);
        logger.info(`🔄 Testing ${allVariations.length} variations massives`);
        
        for (const variation of allVariations.slice(0, 50)) { // Limite pour performance
            const essentialQueries = [
                { text: `"${variation}" telegram`, subreddit: null },
                { text: `"t.me/${variation}"`, subreddit: null },
                { text: `${variation}`, subreddit: 'telegram' },
                { text: `${variation}`, subreddit: 'crypto' }
            ];
            
            for (const query of essentialQueries) {
                try {
                    const response = await this.performSearchWithRetry(query.text, query.subreddit);
                    const processed = this.processResults(response, variation, query.text);
                    
                    processed.forEach(r => {
                        r.metadata.isVariation = true;
                        r.metadata.originalUsername = username;
                        r.metadata.variationTested = variation;
                        r.metadata.variationMethod = 'massive_search';
                    });
                    
                    results.push(...processed);
                    queryCount++;
                    await this.delay(this.requestDelay / 2);
                    
                } catch (error) {
                    // Continue
                }
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeTemporalExhaustiveSearch(username) {
        const results = [];
        let queryCount = 0;
        
        const timeRanges = ['day', 'week', 'month', 'year', 'all'];
        const sorts = ['new', 'hot', 'top', 'relevance'];
        
        const temporalQueries = [
            `"${username}" telegram`,
            `t.me/${username}`,
            `${username} group`,
            `${username} channel`
        ];
        
        for (const timeRange of timeRanges) {
            for (const sort of sorts) {
                for (const query of temporalQueries) {
                    try {
                        const params = {
                            q: query,
                            sort: sort,
                            t: timeRange,
                            limit: 100,
                            type: 'link',
                            raw_json: 1
                        };
                        
                        const response = await axios.get(`${this.baseURL}/search`, {
                            params,
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'User-Agent': this.userAgent
                            }
                        });
                        
                        if (response.data?.data?.children) {
                            const processed = this.processResults(response.data, username, query);
                            processed.forEach(r => {
                                r.metadata.searchType = 'temporal';
                                r.metadata.timeRange = timeRange;
                                r.metadata.sortMethod = sort;
                            });
                            results.push(...processed);
                        }
                        
                        queryCount++;
                        await this.delay(this.requestDelay);
                        
                    } catch (error) {
                        // Continue
                    }
                }
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeReverseSearchMassive(username) {
        const results = [];
        let queryCount = 0;
        
        const reverseQueries = [
            'url:"t.me"',
            'url:"telegram.me"',
            'site:t.me',
            '"t.me/"',
            '"telegram.me/"',
            '"joinchat"',
            '"telegram invite"',
            '"telegram link"',
            '"telegram group"',
            '"telegram channel"',
            'join telegram',
            'telegram join',
            'invite telegram',
            'telegram community'
        ];
        
        for (const query of reverseQueries) {
            try {
                const globalResponse = await this.performSearchWithRetry(query, null);
                const globalFiltered = this.filterByUsernameFlexible(globalResponse, username);
                results.push(...globalFiltered);
                queryCount++;
                
                const cryptoSubreddits = ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum'];
                for (const subreddit of cryptoSubreddits) {
                    try {
                        const subredditResponse = await this.performSearchWithRetry(query, subreddit);
                        const subredditFiltered = this.filterByUsernameFlexible(subredditResponse, username);
                        subredditFiltered.forEach(r => {
                            r.metadata.searchType = 'reverse_crypto';
                            r.metadata.cryptoSubreddit = subreddit;
                        });
                        results.push(...subredditFiltered);
                        queryCount++;
                        await this.delay(this.requestDelay);
                    } catch (error) {
                        // Continue
                    }
                }
                
                await this.delay(this.requestDelay);
                
            } catch (error) {
                // Continue
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeUserMiningExhaustive(username) {
        const results = [];
        let queryCount = 0;
        
        if (this.couldBeRedditUsername(username)) {
            try {
                const userPosts = await this.mineUserPostsExhaustive(username);
                results.push(...userPosts);
                queryCount += userPosts.queryCount || 0;
                
                const userComments = await this.mineUserCommentsExhaustive(username);
                results.push(...userComments);
                queryCount += userComments.queryCount || 0;
                
            } catch (error) {
                logger.debug('User mining failed - user might not exist');
            }
        }
        
        const mentionResults = await this.searchUserMentionsExhaustive(username);
        results.push(...mentionResults);
        queryCount += mentionResults.queryCount || 0;
        
        results.queryCount = queryCount;
        return results;
    }

    async executeContextualSearch(username) {
        const results = [];
        let queryCount = 0;
        
        const contextualQueries = [
            `${username} community`,
            `${username} fans`,
            `${username} followers`,
            `${username} members`,
            `join ${username}`,
            `follow ${username}`,
            `subscribe to ${username}`,
            `check out ${username}`,
            `recommend ${username}`,
            `suggest ${username}`,
            `${username} scam`,
            `${username} fake`,
            `${username} real`,
            `${username} legit`,
            `${username} official`,
            `${username} verified`,
            `${username} bot`,
            `${username} content`,
            `${username} updates`,
            `similar to ${username}`,
            `like ${username}`,
            `vs ${username}`
        ];
        
        for (const query of contextualQueries) {
            try {
                const response = await this.performSearchWithRetry(query, null);
                const processed = this.processResults(response, username, query);
                processed.forEach(r => {
                    r.metadata.searchType = 'contextual';
                    r.metadata.contextQuery = query;
                });
                results.push(...processed);
                queryCount++;
                await this.delay(this.requestDelay);
            } catch (error) {
                // Continue
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeCrossReferenceSearch(username) {
        const results = [];
        let queryCount = 0;
        
        const crossPlatforms = [
            'discord', 'whatsapp', 'signal', 'twitter', 'instagram',
            'facebook', 'youtube', 'twitch', 'tiktok'
        ];
        
        for (const platform of crossPlatforms) {
            const crossQueries = [
                `${username} ${platform}`,
                `${username} and ${platform}`,
                `${username} from ${platform}`,
                `${platform} ${username}`
            ];
            
            for (const query of crossQueries) {
                try {
                    const response = await this.performSearchWithRetry(query, null);
                    const processed = this.processResults(response, username, query);
                    processed.forEach(r => {
                        r.metadata.searchType = 'cross_platform';
                        r.metadata.crossPlatform = platform;
                    });
                    results.push(...processed);
                    queryCount++;
                    await this.delay(this.requestDelay);
                } catch (error) {
                    // Continue
                }
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    async executeCommentAnalysis(username) {
        const results = [];
        let queryCount = 0;
        
        const commentQueries = [
            `${username} in comments`,
            `comments ${username}`,
            `mentioned ${username}`,
            `said ${username}`,
            `posted ${username}`
        ];
        
        for (const query of commentQueries) {
            try {
                const params = {
                    q: query,
                    sort: 'comments',
                    limit: 50,
                    type: 'link',
                    raw_json: 1
                };
                
                const response = await axios.get(`${this.baseURL}/search`, {
                    params,
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'User-Agent': this.userAgent
                    }
                });
                
                if (response.data?.data?.children) {
                    for (const post of response.data.data.children.slice(0, 10)) {
                        try {
                            const commentsResults = await this.analyzePostComments(post.data, username);
                            results.push(...commentsResults);
                            queryCount++;
                            await this.delay(this.requestDelay);
                        } catch (error) {
                            // Continue
                        }
                    }
                }
                
                queryCount++;
                await this.delay(this.requestDelay);
                
            } catch (error) {
                // Continue
            }
        }
        
        results.queryCount = queryCount;
        return results;
    }

    generateMassiveVariations(username) {
        const variations = new Set();
        const original = username.toLowerCase();
        
        // Variations de base
        variations.add(original);
        variations.add(username.toUpperCase());
        variations.add(this.capitalizeFirst(username));
        
        // Variations avec underscores/tirets
        if (original.includes('_')) {
            variations.add(original.replace(/_/g, ''));
            variations.add(original.replace(/_/g, '-'));
            variations.add(original.replace(/_/g, '.'));
        } else {
            variations.add(original + '_');
            variations.add(original + '-');
            for (let i = 1; i < original.length; i++) {
                variations.add(original.slice(0, i) + '_' + original.slice(i));
                variations.add(original.slice(0, i) + '-' + original.slice(i));
            }
        }
        
        // Variations numériques
        if (/\d+$/.test(original)) {
            const base = original.replace(/\d+$/, '');
            for (let i = 0; i <= 20; i++) {
                variations.add(base + i);
            }
        } else {
            for (let i = 0; i <= 20; i++) {
                variations.add(original + i);
            }
        }
        
        // Préfixes et suffixes
        const prefixes = ['the', 'real', 'official', 'main', 'new', 'crypto', 'btc'];
        const suffixes = ['official', 'real', 'main', 'channel', 'group', 'bot'];
        
        prefixes.forEach(prefix => {
            variations.add(prefix + original);
            variations.add(prefix + '_' + original);
        });
        
        suffixes.forEach(suffix => {
            variations.add(original + suffix);
            variations.add(original + '_' + suffix);
        });
        
        // Variations par raccourcissement/allongement
        for (let len = Math.max(3, original.length - 3); len < original.length; len++) {
            variations.add(original.slice(0, len));
        }
        
        return Array.from(variations)
            .filter(v => v.length >= 3 && v.length <= 35)
            .slice(0, 100);
    }

    processResults(redditResponse, username, query) {
        if (!redditResponse.data?.children) {
            return [];
        }

        return redditResponse.data.children
            .map(post => post.data)
            .filter(data => this.isRelevantPost(data, username))
            .map(data => this.createResultFromPost(data, username, 'standard_search'));
    }

    isRelevantPost(data, username) {
        const title = (data.title || '').toLowerCase();
        const text = (data.selftext || '').toLowerCase();
        const url = (data.url || '').toLowerCase();
        const subreddit = (data.subreddit || '').toLowerCase();

        const hasUsername = this.flexibleUsernameMatch(title + ' ' + text + ' ' + url, username);
        const hasTelegramKeywords = this.isTelegramRelated(title + ' ' + text + ' ' + url + ' ' + subreddit);
        const hasMinQuality = (data.score || 0) > -10;

        return hasUsername && hasTelegramKeywords && hasMinQuality;
    }

    filterByUsernameFlexible(searchResponse, username) {
        const results = [];
        
        if (!searchResponse.data?.children) return results;
        
        searchResponse.data.children.forEach(post => {
            const data = post.data;
            const text = `${data.title} ${data.selftext} ${data.url}`.toLowerCase();
            
            if (this.flexibleUsernameMatch(text, username)) {
                const result = this.createResultFromPost(data, username, 'reverse_filtered');
                results.push(result);
            }
        });
        
        return results;
    }

    // MÉTHODES DE POST-TRAITEMENT AVANCÉES
    inferPossibleTelegramLinks(result, searchUsername) {
        const links = [];
        const text = `${result.title} ${result.description}`.toLowerCase();
        
        const hasTelegramContext = /telegram|t\.me|channel|group|chat|invite/i.test(text);
        const hasUsernameContext = this.flexibleUsernameMatch(text, searchUsername);
        
        if (hasTelegramContext && hasUsernameContext) {
            const possibleUsernames = text.match(/\b[a-zA-Z][a-zA-Z0-9_]{4,31}\b/g) || [];
            
            possibleUsernames.forEach(possibleUsername => {
                if (this.isValidTelegramUsername(possibleUsername) && 
                    this.isSimilarToSearchUsername(possibleUsername, searchUsername)) {
                    
                    const inferredLink = {
                        url: `https://t.me/${possibleUsername}`,
                        username: possibleUsername,
                        title: `🔮 ${possibleUsername} (inféré)`,
                        description: `Lien Telegram inféré depuis: ${result.title}`,
                        type: 'inferred',
                        source: 'Reddit (Inféré)',
                        confidence: 45,
                        verified: false,
                        timestamp: result.timestamp,
                        metadata: {
                            platform: 'telegram',
                            telegramUrl: `https://t.me/${possibleUsername}`,
                            telegramUsername: possibleUsername,
                            groupType: 'inferred',
                            searchMethod: 'inference',
                            inferenceReason: 'telegram_context_with_username',
                            redditSource: {
                                postUrl: result.url,
                                postTitle: result.title,
                                subreddit: result.metadata?.subreddit,
                                redditScore: result.metadata?.score,
                                foundIn: `r/${result.metadata?.subreddit || 'unknown'}`
                            }
                        }
                    };
                    
                    links.push(inferredLink);
                }
            });
        }
        
        return links;
    }

    ultraIntelligentDeduplication(links) {
        const uniqueLinks = new Map();
        
        links.forEach(link => {
            const normalizedUrl = this.normalizeTelegramUrl(link.url);
            const key = normalizedUrl.toLowerCase();
            
            if (uniqueLinks.has(key)) {
                const existing = uniqueLinks.get(key);
                
                if ((link.confidence || 0) > (existing.confidence || 0)) {
                    link.metadata.mergedSources = existing.metadata.mergedSources || [];
                    link.metadata.mergedSources.push(existing.metadata.redditSource);
                    uniqueLinks.set(key, link);
                } else {
                    existing.metadata.mergedSources = existing.metadata.mergedSources || [];
                    existing.metadata.mergedSources.push(link.metadata.redditSource);
                }
            } else {
                uniqueLinks.set(key, link);
            }
        });
        
        return Array.from(uniqueLinks.values());
    }

    ultraAdvancedScoring(links, searchUsername) {
        return links.map(link => {
            let confidence = link.confidence || 50;
            
            const similarity = this.calculateUsernameSimilarity(link.username, searchUsername);
            confidence += similarity * 30;
            
            const redditScore = link.metadata?.redditSource?.redditScore || 0;
            if (redditScore > 10) confidence += 10;
            if (redditScore > 50) confidence += 15;
            if (redditScore > 200) confidence += 20;
            
            const subreddit = link.metadata?.redditSource?.foundIn?.toLowerCase();
            if (subreddit?.includes('telegram')) confidence += 25;
            if (subreddit?.includes('crypto')) confidence += 15;
            
            switch (link.metadata?.searchMethod) {
                case 'direct_extraction': confidence += 20; break;
                case 'pattern_match': confidence += 15; break;
                case 'reverse_search': confidence += 10; break;
                case 'inference': confidence += 5; break;
            }
            
            if (!link.metadata?.isInviteLink) confidence += 10;
            
            const mergedSources = link.metadata?.mergedSources?.length || 0;
            confidence += mergedSources * 5;
            
            const context = link.metadata?.redditSource?.postTitle?.toLowerCase() || '';
            if (context.includes('official')) confidence += 15;
            if (context.includes('verified')) confidence += 15;
            if (context.includes('scam') || context.includes('fake')) confidence -= 25;
            
            link.confidence = Math.min(Math.max(confidence, 0), 100);
            return link;
        });
    }

    ultraQualityFilter(links, searchUsername) {
        return links.filter(link => {
            if (link.confidence < 30) return false;
            if (!link.username || link.username.length < 5) return false;
            if (this.isCommonWord(link.username)) return false;
            if (this.isSuspiciousUsername(link.username)) return false;
            
            return true;
        });
    }

    ultraIntelligentRanking(links, searchUsername) {
        return links.sort((a, b) => {
            const aExact = a.username.toLowerCase() === searchUsername.toLowerCase();
            const bExact = b.username.toLowerCase() === searchUsername.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            if (b.confidence !== a.confidence) {
                return (b.confidence || 0) - (a.confidence || 0);
            }
            
            const aScore = a.metadata?.redditSource?.redditScore || 0;
            const bScore = b.metadata?.redditSource?.redditScore || 0;
            if (bScore !== aScore) return bScore - aScore;
            
            const aSources = (a.metadata?.mergedSources?.length || 0) + 1;
            const bSources = (b.metadata?.mergedSources?.length || 0) + 1;
            return bSources - aSources;
        });
    }

    enrichMetadata(links, username) {
        return links.map(link => {
            link.metadata.enrichment = {
                searchTimestamp: new Date().toISOString(),
                originalSearchUsername: username,
                confidenceLevel: this.getConfidenceLevel(link.confidence),
                qualityScore: this.calculateQualityScore(link),
                recommendationReason: this.generateRecommendationReason(link, username)
            };
            return link;
        });
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 80) return 'very_high';
        if (confidence >= 60) return 'high';
        if (confidence >= 40) return 'medium';
        if (confidence >= 20) return 'low';
        return 'very_low';
    }

    calculateQualityScore(link) {
        let score = 0;
        
        score += Math.min(link.confidence || 0, 40);
        score += Math.min((link.metadata?.redditSource?.redditScore || 0) / 10, 20);
        score += (link.metadata?.mergedSources?.length || 0) * 5;
        
        if (link.metadata?.redditSource?.foundIn?.includes('telegram')) score += 15;
        if (!link.metadata?.isInviteLink) score += 10;
        if (link.verified) score += 10;
        
        return Math.min(score, 100);
    }

    generateRecommendationReason(link, username) {
        const reasons = [];
        
        if (link.username.toLowerCase() === username.toLowerCase()) {
            reasons.push('Correspondance exacte du nom d\'utilisateur');
        }
        
        if (link.confidence >= 80) {
            reasons.push('Très haute confiance');
        }
        
        if ((link.metadata?.redditSource?.redditScore || 0) > 50) {
            reasons.push('Post Reddit très populaire');
        }
        
        if (link.metadata?.redditSource?.foundIn?.includes('telegram')) {
            reasons.push('Trouvé dans un subreddit Telegram spécialisé');
        }
        
        if ((link.metadata?.mergedSources?.length || 0) > 0) {
            reasons.push('Confirmé par plusieurs sources');
        }
        
        return reasons.length > 0 ? reasons.join(', ') : 'Résultat de recherche standard';
    }

    // MÉTHODES UTILITAIRES AVANCÉES
    calculateUsernameSimilarity(username1, username2) {
        const u1 = username1.toLowerCase();
        const u2 = username2.toLowerCase();
        
        if (u1 === u2) return 1.0;
        if (u1.includes(u2) || u2.includes(u1)) return 0.8;
        
        const maxLen = Math.max(u1.length, u2.length);
        const distance = this.levenshteinDistance(u1, u2);
        return Math.max(0, (maxLen - distance) / maxLen);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    isSimilarToSearchUsername(username, searchUsername) {
        return this.calculateUsernameSimilarity(username, searchUsername) > 0.6;
    }

    isSuspiciousUsername(username) {
        const suspicious = [
            'admin', 'support', 'help', 'bot', 'official',
            'scam', 'fake', 'test', 'example', 'sample'
        ];
        return suspicious.includes(username.toLowerCase());
    }

    normalizeTelegramUrl(url) {
        return url.toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');
    }

    createUltraTelegramResult(link, sourceResult, searchUsername) {
        const confidence = this.calculateAdvancedConfidence(link.username, sourceResult, searchUsername, 0);
        const groupType = this.determineGroupType(link.username, sourceResult, link.url);
        
        return {
            url: this.constructTelegramUrl(link.username, false, link.url),
            username: link.username,
            title: `${groupType.emoji} ${link.username}`,
            description: this.generateAdvancedDescription(link.username, sourceResult, groupType),
            type: groupType.type,
            source: 'Telegram (ULTRA Reddit)',
            confidence: confidence,
            verified: false,
            timestamp: sourceResult.timestamp,
            metadata: {
                platform: 'telegram',
                telegramUrl: this.constructTelegramUrl(link.username, false, link.url),
                telegramUsername: link.username,
                groupType: groupType.type,
                searchMethod: 'ultra_extraction',
                redditSource: {
                    postUrl: sourceResult.url,
                    postTitle: sourceResult.title,
                    subreddit: sourceResult.metadata?.subreddit,
                    redditScore: sourceResult.metadata?.score,
                    foundIn: `r/${sourceResult.metadata?.subreddit || 'unknown'}`
                }
            }
        };
    }

    createUltraAdvancedTelegramLink(extractedUsername, originalMatch, sourceResult, searchUsername, patternIndex) {
        const isInviteLink = originalMatch.includes('joinchat') || originalMatch.includes('+');
        const url = this.constructTelegramUrl(extractedUsername, isInviteLink, originalMatch);
        const confidence = this.calculateAdvancedConfidence(extractedUsername, sourceResult, searchUsername, patternIndex);
        const groupType = this.determineGroupType(extractedUsername, sourceResult, originalMatch);
        
        return {
            url: url,
            username: extractedUsername,
            title: `${groupType.emoji} ${extractedUsername}`,
            description: this.generateAdvancedDescription(extractedUsername, sourceResult, groupType),
            type: groupType.type,
            source: 'Telegram (ULTRA Search)',
            confidence: confidence,
            verified: false,
            timestamp: sourceResult.timestamp,
            metadata: {
                platform: 'telegram',
                telegramUrl: url,
                telegramUsername: extractedUsername,
                groupType: groupType.type,
                isInviteLink: isInviteLink,
                patternMatched: patternIndex,
                searchMethod: 'ultra_extraction',
                redditSource: {
                    postUrl: sourceResult.url,
                    postTitle: sourceResult.title,
                    subreddit: sourceResult.metadata?.subreddit,
                    redditScore: sourceResult.metadata?.score,
                    foundIn: `r/${sourceResult.metadata?.subreddit || 'unknown'}`
                }
            }
        };
    }

    calculateAdvancedConfidence(extractedUsername, sourceResult, searchUsername, patternIndex) {
        let confidence = 50;
        
        const patternBonuses = [25, 25, 30, 30, 15, 20, 20, 10, 15, 10];
        confidence += patternBonuses[patternIndex] || 10;
        
        const similarity = this.calculateUsernameSimilarity(extractedUsername, searchUsername);
        confidence += similarity * 30;
        
        const redditScore = sourceResult.metadata?.score || 0;
        if (redditScore > 10) confidence += 10;
        if (redditScore > 50) confidence += 15;
        
        return Math.min(Math.max(confidence, 0), 100);
    }

    determineGroupType(username, sourceResult, originalMatch) {
        const text = `${sourceResult.title} ${sourceResult.description}`.toLowerCase();
        
        if (text.includes('group') || text.includes('chat') || originalMatch.includes('joinchat')) {
            return { type: 'group', emoji: '👥' };
        }
        if (text.includes('channel') || text.includes('broadcast')) {
            return { type: 'channel', emoji: '📢' };
        }
        if (text.includes('bot') || username.toLowerCase().includes('bot')) {
            return { type: 'bot', emoji: '🤖' };
        }
        if (text.includes('news') || text.includes('update')) {
            return { type: 'news', emoji: '📰' };
        }
        return { type: 'general', emoji: '💬' };
    }

    constructTelegramUrl(username, isInviteLink, originalUrl) {
        if (isInviteLink && originalUrl) {
            return originalUrl.startsWith('http') ? originalUrl : `https://${originalUrl}`;
        }
        return `https://t.me/${username}`;
    }

    generateAdvancedDescription(username, sourceResult, groupType) {
        const parts = [];
        
        parts.push(`Groupe Telegram ${groupType.type}`);
        
        if (sourceResult.metadata?.subreddit) {
            parts.push(`trouvé sur r/${sourceResult.metadata.subreddit}`);
        }
        
        if (sourceResult.metadata?.score && sourceResult.metadata.score > 10) {
            parts.push(`${sourceResult.metadata.score} points Reddit`);
        }
        
        return parts.join(' • ');
    }

    // MÉTHODES D'EXPORT ET FORMATAGE
    async exportResults(results, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(results, null, 2);
            case 'csv':
                return this.convertToCSV(results);
            case 'summary':
                return this.generateSummaryReport(results);
            default:
                return results;
        }
    }

    convertToCSV(results) {
        if (!results.length) return 'No results found';
        
        const headers = [
            'Username', 'URL', 'Type', 'Confidence', 'Source', 'Subreddit', 
            'Reddit Score', 'Description', 'Timestamp'
        ];
        
        const csvRows = [headers.join(',')];
        
        results.forEach(result => {
            const row = [
                this.escapeCsv(result.username || ''),
                this.escapeCsv(result.url || ''),
                this.escapeCsv(result.type || ''),
                result.confidence || 0,
                this.escapeCsv(result.source || ''),
                this.escapeCsv(result.metadata?.redditSource?.foundIn || ''),
                result.metadata?.redditSource?.redditScore || 0,
                this.escapeCsv(result.description || ''),
                this.escapeCsv(result.timestamp || '')
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    escapeCsv(value) {
        if (typeof value !== 'string') return value;
        return `"${value.replace(/"/g, '""')}"`;
    }

    generateSummaryReport(results) {
        const summary = {
            totalResults: results.length,
            highConfidenceResults: results.filter(r => r.confidence >= 70).length,
            mediumConfidenceResults: results.filter(r => r.confidence >= 40 && r.confidence < 70).length,
            lowConfidenceResults: results.filter(r => r.confidence < 40).length,
            groupTypes: {},
            topSubreddits: {},
            averageConfidence: 0,
            topResults: results.slice(0, 10)
        };
        
        // Calcul moyenne confiance
        if (results.length > 0) {
            summary.averageConfidence = Math.round(
                results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
            );
        }
        
        // Comptage par type
        results.forEach(result => {
            const type = result.type || 'unknown';
            summary.groupTypes[type] = (summary.groupTypes[type] || 0) + 1;
            
            const subreddit = result.metadata?.redditSource?.foundIn || 'unknown';
            summary.topSubreddits[subreddit] = (summary.topSubreddits[subreddit] || 0) + 1;
        });
        
        return `
🎯 RAPPORT DE RECHERCHE REDDIT ULTRA
=====================================

📊 STATISTIQUES GÉNÉRALES:
- Total de résultats trouvés: ${summary.totalResults}
- Confiance élevée (≥70%): ${summary.highConfidenceResults}
- Confiance moyenne (40-69%): ${summary.mediumConfidenceResults}
- Confiance faible (<40%): ${summary.lowConfidenceResults}
- Confiance moyenne: ${summary.averageConfidence}%

📱 TYPES DE GROUPES TROUVÉS:
${Object.entries(summary.groupTypes)
    .sort(([,a], [,b]) => b - a)
    .map(([type, count]) => `- ${type}: ${count}`)
    .join('\n')}

🏆 TOP SUBREDDITS SOURCES:
${Object.entries(summary.topSubreddits)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([subreddit, count]) => `- ${subreddit}: ${count} résultats`)
    .join('\n')}

⭐ TOP 10 RÉSULTATS:
${summary.topResults.map((result, index) => 
    `${index + 1}. ${result.username} (${result.confidence}%) - ${result.url}`
).join('\n')}
        `;
    }

    // MÉTHODES DE CACHE ET OPTIMISATION
    getCacheKey(username, options) {
        return `reddit_ultra_${username}_${JSON.stringify(options)}`;
    }

    async getCachedResults(username, options) {
        const key = this.getCacheKey(username, options);
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            logger.info(`📋 Résultats en cache trouvés pour ${username}`);
            return cached.data;
        }
        
        return null;
    }

    setCachedResults(username, options, results) {
        const key = this.getCacheKey(username, options);
        this.cache.set(key, {
            data: results,
            timestamp: Date.now()
        });
        
        // Nettoyage du cache si trop volumineux
        if (this.cache.size > 100) {
            const oldest = Array.from(this.cache.entries())
                .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
            this.cache.delete(oldest[0]);
        }
    }

    // MÉTHODES DE VALIDATION ET VÉRIFICATION
    async validateTelegramLink(url) {
        try {
            // Validation basique du format
            if (!this.isValidTelegramUrl(url)) {
                return { valid: false, reason: 'Format URL invalide' };
            }
            
            // Ici on pourrait ajouter une vérification HTTP
            // mais attention aux limites de taux de Telegram
            
            return { valid: true, reason: 'Format URL valide' };
        } catch (error) {
            return { valid: false, reason: `Erreur de validation: ${error.message}` };
        }
    }

    isValidTelegramUrl(url) {
        const telegramUrlPatterns = [
            /^https?:\/\/t\.me\/[a-zA-Z][a-zA-Z0-9_]{4,31}$/,
            /^https?:\/\/telegram\.me\/[a-zA-Z][a-zA-Z0-9_]{4,31}$/,
            /^https?:\/\/t\.me\/joinchat\/[a-zA-Z0-9_-]{22}$/,
            /^https?:\/\/t\.me\/\+[a-zA-Z0-9_-]+$/
        ];
        
        return telegramUrlPatterns.some(pattern => pattern.test(url));
    }

    // MÉTHODES DE STATISTIQUES ET MONITORING
    getSearchStats() {
        return {
            cacheSize: this.cache.size,
            tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
            isAuthenticated: !!this.accessToken,
            requestDelay: this.requestDelay,
            userAgent: this.userAgent,
            baseURL: this.baseURL
        };
    }

    clearCache() {
        this.cache.clear();
        logger.info('🗑️ Cache Reddit vidé');
    }

    // MÉTHODE PRINCIPALE AVEC OPTIONS AVANCÉES
    async searchWithAdvancedOptions(username, options = {}) {
        const {
            useCache = true,
            exportFormat = 'json',
            maxResults = 1000,
            minConfidence = 0,
            includeStats = false,
            phases = ['all'], // ou array spécifique: ['patterns', 'variations', etc.]
            subredditFilter = null,
            timeFilter = null
        } = options;

        // Vérification du cache
        if (useCache) {
            const cached = await this.getCachedResults(username, options);
            if (cached) return cached;
        }

        // Recherche principale
        const results = await this.searchTelegramGroupsUltraExhaustive(username, options);

        // Filtrage des résultats
        let filteredResults = results.filter(r => r.confidence >= minConfidence);
        
        if (subredditFilter) {
            filteredResults = filteredResults.filter(r => 
                r.metadata?.redditSource?.foundIn?.includes(subredditFilter)
            );
        }

        // Limitation du nombre de résultats
        filteredResults = filteredResults.slice(0, maxResults);

        // Mise en cache
        if (useCache) {
            this.setCachedResults(username, options, filteredResults);
        }

        // Préparation de la réponse
        const response = {
            results: filteredResults,
            metadata: {
                searchUsername: username,
                totalFound: filteredResults.length,
                searchTimestamp: new Date().toISOString(),
                options: options
            }
        };

        // Ajout des statistiques si demandé
        if (includeStats) {
            response.statistics = {
                confidenceDistribution: this.calculateConfidenceDistribution(filteredResults),
                typeDistribution: this.calculateTypeDistribution(filteredResults),
                sourceDistribution: this.calculateSourceDistribution(filteredResults),
                averageConfidence: this.calculateAverageConfidence(filteredResults)
            };
        }

        // Export dans le format demandé
        if (exportFormat !== 'json') {
            return await this.exportResults(filteredResults, exportFormat);
        }

        return response;
    }

    calculateConfidenceDistribution(results) {
        const distribution = { high: 0, medium: 0, low: 0 };
        results.forEach(r => {
            if (r.confidence >= 70) distribution.high++;
            else if (r.confidence >= 40) distribution.medium++;
            else distribution.low++;
        });
        return distribution;
    }

    calculateTypeDistribution(results) {
        const distribution = {};
        results.forEach(r => {
            const type = r.type || 'unknown';
            distribution[type] = (distribution[type] || 0) + 1;
        });
        return distribution;
    }

    calculateSourceDistribution(results) {
        const distribution = {};
        results.forEach(r => {
            const source = r.metadata?.redditSource?.foundIn || 'unknown';
            distribution[source] = (distribution[source] || 0) + 1;
        });
        return distribution;
    }

    calculateAverageConfidence(results) {
        if (results.length === 0) return 0;
        return Math.round(
            results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
        );
    }

    // MÉTHODE DE NETTOYAGE ET SHUTDOWN
    async cleanup() {
        this.clearCache();
        this.accessToken = null;
        this.tokenExpiry = null;
        logger.info('🧹 Reddit Ultra Search Service nettoyé');
    }
}

module.exports = RedditUltraSearchService;