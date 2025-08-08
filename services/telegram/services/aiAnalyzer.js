const axios = require('axios');
const { logger } = require('../utils/logger');

class AIAnalyzerService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
        this.apiProvider = process.env.AI_PROVIDER || 'openai'; // 'openai' ou 'anthropic'
        this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
        this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
        
        this.analysisCache = new Map();
        this.cacheExpiry = 60 * 60 * 1000; // 1 heure
        
        // Prompts spécialisés pour l'analyse OSINT
        this.prompts = {
            credibilityAnalysis: `Analysez la crédibilité de ce contenu lié à Telegram. Évaluez:
1. La fiabilité de la source
2. La cohérence des informations
3. Les signes de désinformation
4. Le niveau de confiance (0-100)

Contenu à analyser:`,
            
            threatAssessment: `Évaluez les risques potentiels de sécurité dans ce contenu Telegram. Recherchez:
1. Contenus suspects ou malveillants
2. Activités illégales potentielles
3. Tentatives de phishing ou d'escroquerie
4. Niveau de risque (faible/moyen/élevé)

Contenu à analyser:`,
            
            entityExtraction: `Extrayez toutes les entités importantes de ce contenu:
1. Noms de personnes
2. Organisations
3. Lieux géographiques
4. Liens et références
5. Mots-clés techniques

Contenu à analyser:`,
            
            sentimentAnalysis: `Analysez le sentiment et le ton de ce contenu:
1. Sentiment général (positif/négatif/neutre)
2. Émotions détectées
3. Intentions probables
4. Niveau d'urgence ou d'importance

Contenu à analyser:`,
            
            linkAnalysis: `Analysez les connexions et relations dans ce contenu:
1. Relations entre entités mentionnées
2. Hiérarchies ou structures
3. Patterns de communication
4. Réseaux potentiels

Contenu à analyser:`
        };
        
        logger.info('🤖 AIAnalyzerService initialisé');
    }

    async analyzeResults(results, analysisType = 'comprehensive') {
        logger.info(`🧠 Début analyse IA: ${analysisType} sur ${results.length} résultats`);
        
        try {
            const analysisPromises = results.map(result => 
                this.analyzeIndividualResult(result, analysisType)
            );
            
            const individualAnalyses = await Promise.allSettled(analysisPromises);
            
            // Compilation des analyses individuelles
            const successfulAnalyses = individualAnalyses
                .filter(analysis => analysis.status === 'fulfilled')
                .map(analysis => analysis.value);
            
            // Analyse globale
            const globalAnalysis = await this.performGlobalAnalysis(successfulAnalyses, results);
            
            // Mise à jour des résultats avec les analyses
            this.updateResultsWithAnalysis(results, successfulAnalyses);
            
            logger.info(`✅ Analyse IA terminée: ${successfulAnalyses.length}/${results.length} résultats analysés`);
            
            return {
                individualAnalyses: successfulAnalyses,
                globalAnalysis,
                stats: {
                    totalResults: results.length,
                    analyzedResults: successfulAnalyses.length,
                    failedAnalyses: results.length - successfulAnalyses.length
                }
            };
            
        } catch (error) {
            logger.error('❌ Erreur analyse IA:', error);
            throw error;
        }
    }

    async analyzeIndividualResult(result, analysisType) {
        const content = this.prepareContentForAnalysis(result);
        const cacheKey = this.generateCacheKey(content, analysisType);
        
        // Vérifier le cache
        const cachedAnalysis = this.getFromCache(cacheKey);
        if (cachedAnalysis) {
            return { ...cachedAnalysis, resultId: result.url };
        }
        
        try {
            const analysis = {};
            
            // Analyses selon le type demandé
            if (analysisType === 'comprehensive' || analysisType === 'credibility') {
                analysis.credibility = await this.performCredibilityAnalysis(content);
            }
            
            if (analysisType === 'comprehensive' || analysisType === 'threat') {
                analysis.threat = await this.performThreatAssessment(content);
            }
            
            if (analysisType === 'comprehensive' || analysisType === 'entities') {
                analysis.entities = await this.performEntityExtraction(content);
            }
            
            if (analysisType === 'comprehensive' || analysisType === 'sentiment') {
                analysis.sentiment = await this.performSentimentAnalysis(content);
            }
            
            if (analysisType === 'comprehensive' || analysisType === 'links') {
                analysis.linkAnalysis = await this.performLinkAnalysis(content);
            }
            
            // Calcul du score global
            analysis.globalScore = this.calculateGlobalScore(analysis);
            analysis.timestamp = new Date().toISOString();
            analysis.resultId = result.url;
            
            // Mise en cache
            this.setCache(cacheKey, analysis);
            
            return analysis;
            
        } catch (error) {
            logger.warn(`Erreur analyse individuelle: ${error.message}`);
            return {
                resultId: result.url,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async performCredibilityAnalysis(content) {
        const prompt = this.prompts.credibilityAnalysis + '\n\n' + content;
        
        try {
            const response = await this.callAIAPI(prompt);
            return this.parseCredibilityResponse(response);
        } catch (error) {
            logger.warn('Erreur analyse crédibilité:', error);
            return { score: 50, reasoning: 'Analyse impossible', confidence: 'low' };
        }
    }

    async performThreatAssessment(content) {
        const prompt = this.prompts.threatAssessment + '\n\n' + content;
        
        try {
            const response = await this.callAIAPI(prompt);
            return this.parseThreatResponse(response);
        } catch (error) {
            logger.warn('Erreur évaluation menace:', error);
            return { level: 'unknown', indicators: [], confidence: 'low' };
        }
    }

    async performEntityExtraction(content) {
        const prompt = this.prompts.entityExtraction + '\n\n' + content;
        
        try {
            const response = await this.callAIAPI(prompt);
            return this.parseEntityResponse(response);
        } catch (error) {
            logger.warn('Erreur extraction entités:', error);
            return { persons: [], organizations: [], locations: [], keywords: [] };
        }
    }

    async performSentimentAnalysis(content) {
        const prompt = this.prompts.sentimentAnalysis + '\n\n' + content;
        
        try {
            const response = await this.callAIAPI(prompt);
            return this.parseSentimentResponse(response);
        } catch (error) {
            logger.warn('Erreur analyse sentiment:', error);
            return { sentiment: 'neutral', confidence: 0.5, emotions: [] };
        }
    }

    async performLinkAnalysis(content) {
        const prompt = this.prompts.linkAnalysis + '\n\n' + content;
        
        try {
            const response = await this.callAIAPI(prompt);
            return this.parseLinkResponse(response);
        } catch (error) {
            logger.warn('Erreur analyse liens:', error);
            return { connections: [], networks: [], hierarchies: [] };
        }
    }

    async performGlobalAnalysis(individualAnalyses, originalResults) {
        logger.info('🌐 Analyse globale des résultats...');
        
        try {
            // Préparer un résumé pour l'analyse globale
            const summary = this.prepareSummaryForGlobalAnalysis(individualAnalyses, originalResults);
            
            const globalPrompt = `Effectuez une analyse globale de ces résultats de recherche OSINT sur Telegram:

1. Patterns et tendances générales
2. Connexions entre les différents résultats
3. Évaluation de la cohérence globale
4. Recommandations d'investigation
5. Score de confiance global (0-100)

Résumé des données:
${summary}`;

            const response = await this.callAIAPI(globalPrompt);
            return this.parseGlobalResponse(response);
            
        } catch (error) {
            logger.warn('Erreur analyse globale:', error);
            return {
                patterns: [],
                connections: [],
                recommendations: [],
                globalConfidence: 50,
                summary: 'Analyse globale impossible'
            };
        }
    }

    async callAIAPI(prompt) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (this.apiProvider === 'openai') {
                    return await this.callOpenAIAPI(prompt);
                } else if (this.apiProvider === 'anthropic') {
                    return await this.callAnthropicAPI(prompt);
                } else {
                    throw new Error('Fournisseur IA non supporté');
                }
            } catch (error) {
                lastError = error;
                logger.warn(`Tentative ${attempt}/${maxRetries} échouée:`, error.message);
                
                if (attempt < maxRetries) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Backoff exponentiel
                }
            }
        }
        
        throw lastError;
    }

    async callOpenAIAPI(prompt) {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'Vous êtes un expert en analyse OSINT et cybersécurité. Fournissez des analyses précises et structurées.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.3 // Faible température pour plus de cohérence
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return response.data.choices[0].message.content;
    }

    async callAnthropicAPI(prompt) {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: 30000
        });

        return response.data.content[0].text;
    }

    // Parsers pour les différents types de réponses IA
    parseCredibilityResponse(response) {
        try {
            // Parser intelligent pour extraire les informations de crédibilité
            const scoreMatch = response.match(/(?:score|confiance|niveau)[\s:]*(\d+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
            
            const reliabilityMatch = response.match(/(?:fiabilité|reliability)[\s:]*([a-zA-Z]+)/i);
            const reliability = reliabilityMatch ? reliabilityMatch[1].toLowerCase() : 'medium';
            
            const indicators = this.extractIndicators(response, ['source', 'cohérence', 'vérifiable', 'récent']);
            
            return {
                score: Math.min(Math.max(score, 0), 100),
                reliability,
                indicators,
                reasoning: this.extractReasoning(response),
                confidence: this.mapScoreToConfidence(score)
            };
        } catch (error) {
            logger.warn('Erreur parsing crédibilité:', error);
            return { score: 50, reliability: 'unknown', indicators: [], reasoning: 'Parsing impossible' };
        }
    }

    parseThreatResponse(response) {
        try {
            // Extraction du niveau de menace
            const levelMatch = response.match(/(?:niveau|level|risque)[\s:]*([a-zA-Z]+)/i);
            let level = levelMatch ? levelMatch[1].toLowerCase() : 'medium';
            
            // Normaliser les niveaux
            if (level.includes('faible') || level.includes('low')) level = 'low';
            else if (level.includes('élevé') || level.includes('high') || level.includes('haut')) level = 'high';
            else level = 'medium';
            
            const indicators = this.extractIndicators(response, [
                'suspect', 'malveillant', 'phishing', 'escroquerie', 'illégal', 'dangereux'
            ]);
            
            const recommendations = this.extractRecommendations(response);
            
            return {
                level,
                indicators,
                recommendations,
                confidence: this.extractConfidence(response),
                details: this.extractThreatDetails(response)
            };
        } catch (error) {
            logger.warn('Erreur parsing menace:', error);
            return { level: 'unknown', indicators: [], recommendations: [] };
        }
    }

    parseEntityResponse(response) {
        try {
            const entities = {
                persons: this.extractEntitiesByType(response, ['nom', 'personne', 'utilisateur', 'person']),
                organizations: this.extractEntitiesByType(response, ['organisation', 'entreprise', 'groupe', 'organization']),
                locations: this.extractEntitiesByType(response, ['lieu', 'ville', 'pays', 'location', 'place']),
                keywords: this.extractEntitiesByType(response, ['mot-clé', 'terme', 'keyword', 'tag']),
                links: this.extractLinks(response),
                channels: this.extractTelegramChannels(response)
            };
            
            return entities;
        } catch (error) {
            logger.warn('Erreur parsing entités:', error);
            return { persons: [], organizations: [], locations: [], keywords: [], links: [], channels: [] };
        }
    }

    parseSentimentResponse(response) {
        try {
            // Extraction du sentiment principal
            const sentimentMatch = response.match(/sentiment[\s:]*([a-zA-Z]+)/i);
            let sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
            
            // Normaliser les sentiments
            if (sentiment.includes('positif') || sentiment.includes('positive')) sentiment = 'positive';
            else if (sentiment.includes('négatif') || sentiment.includes('negative')) sentiment = 'negative';
            else sentiment = 'neutral';
            
            const emotions = this.extractEmotions(response);
            const confidence = this.extractConfidence(response) || 0.5;
            const intensity = this.extractIntensity(response);
            
            return {
                sentiment,
                emotions,
                confidence,
                intensity,
                details: this.extractSentimentDetails(response)
            };
        } catch (error) {
            logger.warn('Erreur parsing sentiment:', error);
            return { sentiment: 'neutral', emotions: [], confidence: 0.5 };
        }
    }

    parseLinkResponse(response) {
        try {
            const connections = this.extractConnections(response);
            const networks = this.extractNetworks(response);
            const hierarchies = this.extractHierarchies(response);
            const relationships = this.extractRelationships(response);
            
            return {
                connections,
                networks,
                hierarchies,
                relationships,
                strength: this.calculateConnectionStrength(connections),
                complexity: this.calculateNetworkComplexity(networks)
            };
        } catch (error) {
            logger.warn('Erreur parsing liens:', error);
            return { connections: [], networks: [], hierarchies: [], relationships: [] };
        }
    }

    parseGlobalResponse(response) {
        try {
            const patterns = this.extractPatterns(response);
            const connections = this.extractGlobalConnections(response);
            const recommendations = this.extractRecommendations(response);
            const confidenceMatch = response.match(/confiance[\s:]*(\d+)/i);
            const globalConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
            
            return {
                patterns,
                connections,
                recommendations,
                globalConfidence: Math.min(Math.max(globalConfidence, 0), 100),
                summary: this.extractSummary(response),
                riskAssessment: this.extractRiskAssessment(response)
            };
        } catch (error) {
            logger.warn('Erreur parsing analyse globale:', error);
            return { patterns: [], connections: [], recommendations: [], globalConfidence: 50 };
        }
    }

    // Méthodes utilitaires pour l'extraction
    extractIndicators(text, keywords) {
        const indicators = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            keywords.forEach(keyword => {
                if (line.toLowerCase().includes(keyword)) {
                    indicators.push({
                        type: keyword,
                        content: line.trim(),
                        strength: this.calculateIndicatorStrength(line)
                    });
                }
            });
        });
        
        return indicators;
    }

    extractReasoning(text) {
        // Extraire les justifications et raisonnements
        const reasoningMarkers = ['parce que', 'car', 'en raison de', 'justification', 'reasoning'];
        const lines = text.split('\n');
        
        for (const line of lines) {
            for (const marker of reasoningMarkers) {
                if (line.toLowerCase().includes(marker)) {
                    return line.trim();
                }
            }
        }
        
        return text.split('\n')[0] || 'Aucune justification fournie';
    }

    extractRecommendations(text) {
        const recommendations = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            if (line.toLowerCase().includes('recommand') || 
                line.toLowerCase().includes('conseil') ||
                line.toLowerCase().includes('suggest')) {
                recommendations.push(line.trim());
            }
        });
        
        return recommendations;
    }

    extractConfidence(text) {
        const confidenceMatch = text.match(/confiance[\s:]*([0-9.]+)/i);
        if (confidenceMatch) {
            const conf = parseFloat(confidenceMatch[1]);
            return conf > 1 ? conf / 100 : conf; // Normaliser entre 0 et 1
        }
        return 0.5;
    }

    extractEntitiesByType(text, keywords) {
        const entities = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            keywords.forEach(keyword => {
                if (line.toLowerCase().includes(keyword)) {
                    // Extraire les éléments après le mot-clé
                    const match = line.match(new RegExp(keyword + '[\\s:]*(.+)', 'i'));
                    if (match) {
                        const items = match[1].split(',').map(item => item.trim());
                        entities.push(...items.filter(item => item.length > 0));
                    }
                }
            });
        });
        
        return [...new Set(entities)]; // Supprimer les doublons
    }

    extractLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const telegramRegex = /(t\.me\/[^\s]+)/g;
        
        const urls = text.match(urlRegex) || [];
        const telegramLinks = text.match(telegramRegex) || [];
        
        return [...new Set([...urls, ...telegramLinks])];
    }

    extractTelegramChannels(text) {
        const channelRegex = /@([a-zA-Z0-9_]+)/g;
        const matches = text.match(channelRegex) || [];
        return matches.map(match => match.substring(1)); // Enlever le @
    }

    extractEmotions(text) {
        const emotionKeywords = {
            joy: ['joie', 'heureux', 'content', 'joyful', 'happy'],
            anger: ['colère', 'fâché', 'irrité', 'angry', 'mad'],
            fear: ['peur', 'inquiet', 'anxieux', 'afraid', 'worried'],
            sadness: ['triste', 'déprimé', 'mélancolique', 'sad', 'depressed'],
            surprise: ['surpris', 'étonné', 'shocked', 'surprised'],
            disgust: ['dégoût', 'répugnant', 'disgusted', 'revolted']
        };
        
        const detectedEmotions = [];
        const textLower = text.toLowerCase();
        
        Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                detectedEmotions.push(emotion);
            }
        });
        
        return detectedEmotions;
    }

    extractIntensity(text) {
        const intensityKeywords = {
            high: ['très', 'extrêmement', 'fortement', 'intensément'],
            medium: ['modérément', 'moyennement', 'relativement'],
            low: ['légèrement', 'faiblement', 'peu']
        };
        
        const textLower = text.toLowerCase();
        
        for (const [level, keywords] of Object.entries(intensityKeywords)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return level;
            }
        }
        
        return 'medium';
    }

    extractConnections(text) {
        const connections = [];
        const connectionMarkers = ['lié à', 'connecté', 'relation', 'associé', 'connected to'];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            connectionMarkers.forEach(marker => {
                if (line.toLowerCase().includes(marker)) {
                    connections.push({
                        description: line.trim(),
                        strength: this.calculateConnectionStrength([line]),
                        type: 'general'
                    });
                }
            });
        });
        
        return connections;
    }

    extractNetworks(text) {
        const networks = [];
        const networkMarkers = ['réseau', 'groupe', 'cluster', 'network'];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            networkMarkers.forEach(marker => {
                if (line.toLowerCase().includes(marker)) {
                    networks.push({
                        description: line.trim(),
                        type: marker,
                        size: this.estimateNetworkSize(line)
                    });
                }
            });
        });
        
        return networks;
    }

    extractPatterns(text) {
        const patterns = [];
        const patternMarkers = ['pattern', 'tendance', 'récurrence', 'similitude'];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            patternMarkers.forEach(marker => {
                if (line.toLowerCase().includes(marker)) {
                    patterns.push({
                        description: line.trim(),
                        frequency: this.estimatePatternFrequency(line),
                        significance: this.calculatePatternSignificance(line)
                    });
                }
            });
        });
        
        return patterns;
    }

    // Méthodes de calcul et d'estimation
    calculateGlobalScore(analysis) {
        let score = 50; // Score de base
        
        if (analysis.credibility) {
            score = (score + analysis.credibility.score) / 2;
        }
        
        if (analysis.threat) {
            switch (analysis.threat.level) {
                case 'low': score += 10; break;
                case 'high': score -= 20; break;
                default: score -= 5;
            }
        }
        
        if (analysis.sentiment) {
            switch (analysis.sentiment.sentiment) {
                case 'positive': score += 5; break;
                case 'negative': score -= 10; break;
            }
        }
        
        return Math.min(Math.max(score, 0), 100);
    }

    calculateIndicatorStrength(text) {
        const strongWords = ['très', 'extrêmement', 'fortement', 'clairement'];
        const weakWords = ['peut-être', 'possiblement', 'légèrement'];
        
        const textLower = text.toLowerCase();
        
        if (strongWords.some(word => textLower.includes(word))) return 'high';
        if (weakWords.some(word => textLower.includes(word))) return 'low';
        return 'medium';
    }

    calculateConnectionStrength(connections) {
        if (connections.length === 0) return 'none';
        if (connections.length >= 5) return 'strong';
        if (connections.length >= 2) return 'medium';
        return 'weak';
    }

    calculateNetworkComplexity(networks) {
        if (networks.length === 0) return 'simple';
        if (networks.length >= 3) return 'complex';
        return 'moderate';
    }

    estimateNetworkSize(text) {
        const sizeIndicators = {
            large: ['grand', 'large', 'nombreux', 'massive'],
            medium: ['moyen', 'modéré', 'several'],
            small: ['petit', 'limité', 'few', 'little']
        };
        
        const textLower = text.toLowerCase();
        
        for (const [size, indicators] of Object.entries(sizeIndicators)) {
            if (indicators.some(indicator => textLower.includes(indicator))) {
                return size;
            }
        }
        
        return 'unknown';
    }

    estimatePatternFrequency(text) {
        const frequencyIndicators = {
            high: ['souvent', 'fréquemment', 'régulièrement', 'often'],
            medium: ['parfois', 'occasionnellement', 'sometimes'],
            low: ['rarement', 'peu', 'rarely', 'seldom']
        };
        
        const textLower = text.toLowerCase();
        
        for (const [freq, indicators] of Object.entries(frequencyIndicators)) {
            if (indicators.some(indicator => textLower.includes(indicator))) {
                return freq;
            }
        }
        
        return 'unknown';
    }

    calculatePatternSignificance(text) {
        const significanceWords = ['important', 'significatif', 'critique', 'majeur'];
        const textLower = text.toLowerCase();
        
        if (significanceWords.some(word => textLower.includes(word))) {
            return 'high';
        }
        
        return 'medium';
    }

    mapScoreToConfidence(score) {
        if (score >= 80) return 'high';
        if (score >= 60) return 'medium';
        return 'low';
    }

    // Méthodes utilitaires
    prepareContentForAnalysis(result) {
        return `Titre: ${result.title}
Description: ${result.description}
Source: ${result.source}
URL: ${result.url}
Type: ${result.type}
Confiance: ${result.confidence}%
Vérifié: ${result.verified ? 'Oui' : 'Non'}`;
    }

    prepareSummaryForGlobalAnalysis(analyses, results) {
        const summary = {
            totalResults: results.length,
            analyzedResults: analyses.length,
            platforms: [...new Set(results.map(r => r.source))],
            averageConfidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
            threatLevels: analyses.map(a => a.threat?.level).filter(Boolean),
            sentiments: analyses.map(a => a.sentiment?.sentiment).filter(Boolean),
            entities: analyses.flatMap(a => a.entities?.persons || [])
        };
        
        return JSON.stringify(summary, null, 2);
    }

    updateResultsWithAnalysis(results, analyses) {
        const analysisMap = new Map();
        analyses.forEach(analysis => {
            if (analysis.resultId) {
                analysisMap.set(analysis.resultId, analysis);
            }
        });
        
        results.forEach(result => {
            const analysis = analysisMap.get(result.url);
            if (analysis) {
                result.aiAnalysis = analysis;
                
                // Mise à jour du score de confiance basé sur l'IA
                if (analysis.credibility?.score) {
                    result.confidence = Math.round(
                        (result.confidence + analysis.credibility.score) / 2
                    );
                }
                
                // Ajout de tags basés sur l'analyse
                result.aiTags = this.generateAITags(analysis);
            }
        });
    }

    generateAITags(analysis) {
        const tags = [];
        
        if (analysis.credibility?.score >= 80) tags.push('high-credibility');
        if (analysis.threat?.level === 'high') tags.push('high-risk');
        if (analysis.sentiment?.sentiment === 'positive') tags.push('positive-sentiment');
        if (analysis.entities?.persons?.length > 0) tags.push('contains-persons');
        if (analysis.entities?.organizations?.length > 0) tags.push('contains-organizations');
        
        return tags;
    }

    generateCacheKey(content, analysisType) {
        const hash = require('crypto')
            .createHash('md5')
            .update(content + analysisType)
            .digest('hex');
        return `ai_analysis_${hash}`;
    }

    getFromCache(key) {
        const cached = this.analysisCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.analysisCache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.analysisCache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Nettoyage du cache
        if (this.analysisCache.size > 50) {
            const oldestKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(oldestKey);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Méthodes de diagnostic et maintenance
    async testConnection() {
        logger.info('🔧 Test de connectivité IA...');
        
        try {
            const testPrompt = 'Test de connectivité. Répondez simplement "OK".';
            const response = await this.callAIAPI(testPrompt);
            
            return {
                success: true,
                provider: this.apiProvider,
                model: this.model,
                message: 'API IA accessible',
                responseTime: 'OK'
            };
        } catch (error) {
            return {
                success: false,
                provider: this.apiProvider,
                message: `API IA inaccessible: ${error.message}`
            };
        }
    }

    getStats() {
        return {
            provider: this.apiProvider,
            model: this.model,
            cacheSize: this.analysisCache.size,
            cacheExpiry: this.cacheExpiry / 1000 / 60 + ' minutes',
            maxTokens: this.maxTokens
        };
    }

    clearCache() {
        this.analysisCache.clear();
        logger.info('🧹 Cache IA vidé');
    }

    // Export et rapport
    async generateAnalysisReport(results, analyses) {
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                totalResults: results.length,
                analyzedResults: analyses.individualAnalyses.length,
                aiProvider: this.apiProvider,
                aiModel: this.model
            },
            summary: {
                averageCredibility: this.calculateAverageCredibility(analyses.individualAnalyses),
                threatDistribution: this.calculateThreatDistribution(analyses.individualAnalyses),
                sentimentDistribution: this.calculateSentimentDistribution(analyses.individualAnalyses),
                entityCount: this.calculateEntityCount(analyses.individualAnalyses)
            },
            globalAnalysis: analyses.globalAnalysis,
            recommendations: this.generateAIRecommendations(analyses),
            riskAssessment: this.generateRiskAssessment(analyses),
            stats: this.getStats()
        };
        
        logger.info('📊 Rapport d\'analyse IA généré');
        return report;
    }

    calculateAverageCredibility(analyses) {
        const credibilityScores = analyses
            .map(a => a.credibility?.score)
            .filter(score => score !== undefined);
        
        return credibilityScores.length > 0
            ? credibilityScores.reduce((sum, score) => sum + score, 0) / credibilityScores.length
            : 0;
    }

    calculateThreatDistribution(analyses) {
        const threats = analyses.map(a => a.threat?.level).filter(Boolean);
        return {
            low: threats.filter(t => t === 'low').length,
            medium: threats.filter(t => t === 'medium').length,
            high: threats.filter(t => t === 'high').length
        };
    }

    calculateSentimentDistribution(analyses) {
        const sentiments = analyses.map(a => a.sentiment?.sentiment).filter(Boolean);
        return {
            positive: sentiments.filter(s => s === 'positive').length,
            neutral: sentiments.filter(s => s === 'neutral').length,
            negative: sentiments.filter(s => s === 'negative').length
        };
    }

    calculateEntityCount(analyses) {
        let persons = 0, organizations = 0, locations = 0;
        
        analyses.forEach(analysis => {
            if (analysis.entities) {
                persons += analysis.entities.persons?.length || 0;
                organizations += analysis.entities.organizations?.length || 0;
                locations += analysis.entities.locations?.length || 0;
            }
        });
        
        return { persons, organizations, locations };
    }

    generateAIRecommendations(analyses) {
        const recommendations = [];
        
        // Recommandations basées sur les menaces
        const highThreats = analyses.individualAnalyses.filter(a => a.threat?.level === 'high');
        if (highThreats.length > 0) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: `${highThreats.length} résultat(s) avec niveau de menace élevé détecté(s). Investigation approfondie recommandée.`
            });
        }
        
        // Recommandations basées sur la crédibilité
        const lowCredibility = analyses.individualAnalyses.filter(a => 
            a.credibility?.score && a.credibility.score < 40
        );
        if (lowCredibility.length > 0) {
            recommendations.push({
                type: 'verification',
                priority: 'medium',
                message: `${lowCredibility.length} résultat(s) avec faible crédibilité. Vérification des sources recommandée.`
            });
        }
        
        return recommendations;
    }

    generateRiskAssessment(analyses) {
        const riskFactors = [];
        
        // Analyse des facteurs de risque
        const threatLevels = analyses.individualAnalyses.map(a => a.threat?.level).filter(Boolean);
        const highThreats = threatLevels.filter(t => t === 'high').length;
        const totalThreats = threatLevels.length;
        
        if (totalThreats > 0) {
            const riskPercentage = (highThreats / totalThreats) * 100;
            riskFactors.push({
                factor: 'threat_level',
                value: riskPercentage,
                description: `${riskPercentage.toFixed(1)}% des résultats analysés présentent un niveau de menace élevé`
            });
        }
        
        return {
            overallRisk: this.calculateOverallRisk(riskFactors),
            factors: riskFactors,
            recommendations: this.generateRiskRecommendations(riskFactors)
        };
    }

    calculateOverallRisk(riskFactors) {
        if (riskFactors.length === 0) return 'unknown';
        
        const avgRisk = riskFactors.reduce((sum, factor) => sum + factor.value, 0) / riskFactors.length;
        
        if (avgRisk >= 70) return 'high';
        if (avgRisk >= 30) return 'medium';
        return 'low';
    }

    generateRiskRecommendations(riskFactors) {
        const recommendations = [];
        
        riskFactors.forEach(factor => {
            if (factor.value >= 50) {
                recommendations.push(`Attention particulière requise pour ${factor.factor}`);
            }
        });
        
        return recommendations;
    }
}

module.exports = AIAnalyzerService;