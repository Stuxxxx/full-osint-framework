const Joi = require('joi');

/**
 * Validation des paramètres de recherche
 */
function validateSearchParams(username, options) {
    const errors = [];

    // Validation du username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        errors.push(...usernameValidation.errors);
    }

    // Validation des options
    const optionsValidation = validateSearchOptions(options);
    if (!optionsValidation.isValid) {
        errors.push(...optionsValidation.errors);
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation du username Telegram
 */
function validateUsername(username) {
    const errors = [];

    if (!username || typeof username !== 'string') {
        errors.push('Le nom d\'utilisateur est requis');
        return { isValid: false, errors };
    }

    const cleanUsername = username.replace('@', '').trim();

    // Règles Telegram pour les usernames
    if (cleanUsername.length < 5) {
        errors.push('Le nom d\'utilisateur doit contenir au moins 5 caractères');
    }

    if (cleanUsername.length > 32) {
        errors.push('Le nom d\'utilisateur ne peut pas dépasser 32 caractères');
    }

    if (!/^[a-zA-Z]/.test(cleanUsername)) {
        errors.push('Le nom d\'utilisateur doit commencer par une lettre');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/.test(cleanUsername)) {
        errors.push('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores');
    }

    if (/_{2,}/.test(cleanUsername)) {
        errors.push('Le nom d\'utilisateur ne peut pas contenir d\'underscores consécutifs');
    }

    if (cleanUsername.endsWith('_')) {
        errors.push('Le nom d\'utilisateur ne peut pas se terminer par un underscore');
    }

    // Mots interdits/réservés
    const forbiddenUsernames = [
        'admin', 'administrator', 'root', 'support', 'help',
        'telegram', 'bot', 'api', 'channel', 'group',
        'null', 'undefined', 'system', 'service'
    ];

    if (forbiddenUsernames.includes(cleanUsername.toLowerCase())) {
        errors.push('Ce nom d\'utilisateur est réservé');
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        cleanUsername: cleanUsername
    };
}

/**
 * Validation des options de recherche
 */
function validateSearchOptions(options) {
    const schema = Joi.object({
        google: Joi.boolean().default(true),
        yandex: Joi.boolean().default(true),
        bing: Joi.boolean().default(true),
        duckduckgo: Joi.boolean().default(true),
        telegramApi: Joi.boolean().default(true),
        directories: Joi.boolean().default(false),
        social: Joi.boolean().default(false),
        deepCrawling: Joi.boolean().default(false),
        aiAnalysis: Joi.boolean().default(false),
        sentimentAnalysis: Joi.boolean().default(false),
        languageDetection: Joi.boolean().default(false),
        geolocation: Joi.boolean().default(false),
        maxResults: Joi.number().integer().min(1).max(1000).default(100),
        timeout: Joi.number().integer().min(5000).max(60000).default(30000),
        retries: Joi.number().integer().min(0).max(5).default(3)
    });

    const { error, value } = schema.validate(options || {});

    if (error) {
        const errors = error.details.map(detail => detail.message);
        return {
            isValid: false,
            errors: errors,
            sanitizedOptions: null
        };
    }

    // Vérifications logiques
    const logicalErrors = [];

    // Au moins une source doit être sélectionnée
    const hasAnySource = value.google || value.yandex || value.bing || 
                        value.duckduckgo || value.telegramApi || 
                        value.directories || value.social;

    if (!hasAnySource) {
        logicalErrors.push('Au moins une source de recherche doit être sélectionnée');
    }

    // L'analyse IA nécessite au moins une source
    if (value.aiAnalysis && !hasAnySource) {
        logicalErrors.push('L\'analyse IA nécessite au moins une source de données');
    }

    // Le crawling profond nécessite plus de temps
    if (value.deepCrawling && value.timeout < 30000) {
        logicalErrors.push('Le crawling profond nécessite un timeout d\'au moins 30 secondes');
    }

    return {
        isValid: logicalErrors.length === 0,
        errors: logicalErrors,
        sanitizedOptions: value
    };
}

/**
 * Validation des clés API
 */
function validateApiKeys(apis) {
    const errors = [];
    const warnings = [];

    // Google API
    if (apis.google) {
        if (!apis.google.apiKey || apis.google.apiKey.length < 20) {
            errors.push('Clé API Google invalide ou manquante');
        }
        if (!apis.google.searchEngineId || !/^[a-f0-9]+$/.test(apis.google.searchEngineId)) {
            errors.push('Search Engine ID Google invalide');
        }
    }

    // Telegram Bot
    if (apis.telegram) {
        if (!apis.telegram.token || !/^\d+:[A-Za-z0-9_-]+$/.test(apis.telegram.token)) {
            errors.push('Token Telegram Bot invalide');
        }
    }

    // Bing API
    if (apis.bing) {
        if (!apis.bing.key || apis.bing.key.length !== 32) {
            errors.push('Clé API Bing invalide (doit faire 32 caractères)');
        }
    }

    // Yandex API
    if (apis.yandex) {
        if (!apis.yandex.apiKey || apis.yandex.apiKey.length < 20) {
            errors.push('Clé API Yandex invalide');
        }
        if (!apis.yandex.folderId) {
            warnings.push('Folder ID Yandex manquant (optionnel)');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Validation des résultats de recherche
 */
function validateSearchResult(result) {
    const schema = Joi.object({
        url: Joi.string().uri().required(),
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(500).allow('').default(''),
        type: Joi.string().valid('group', 'channel', 'user', 'privategroup', 'mention', 'unknown').required(),
        source: Joi.string().min(1).max(50).required(),
        confidence: Joi.number().integer().min(0).max(100).default(50),
        members: Joi.number().integer().min(0).allow(null),
        verified: Joi.boolean().default(false),
        timestamp: Joi.date().iso().default(() => new Date()),
        sentiment: Joi.string().valid('positive', 'negative', 'neutral').allow(null),
        aiScore: Joi.number().integer().min(0).max(100).allow(null),
        metadata: Joi.object().default({})
    });

    const { error, value } = schema.validate(result);

    return {
        isValid: !error,
        errors: error ? error.details.map(detail => detail.message) : [],
        sanitizedResult: value
    };
}

/**
 * Validation des filtres de recherche
 */
function validateFilters(filters) {
    const schema = Joi.object({
        type: Joi.string().valid('', 'group', 'channel', 'user', 'privategroup').allow(''),
        source: Joi.string().allow(''),
        minMembers: Joi.number().integer().min(0).allow(null),
        maxMembers: Joi.number().integer().min(0).allow(null),
        minConfidence: Joi.number().integer().min(0).max(100).allow(null),
        titleContains: Joi.string().max(100).allow(''),
        verified: Joi.boolean().allow(null),
        dateFrom: Joi.date().allow(null),
        dateTo: Joi.date().allow(null),
        sentiment: Joi.string().valid('', 'positive', 'negative', 'neutral').allow('')
    });

    const { error, value } = schema.validate(filters || {});

    if (error) {
        return {
            isValid: false,
            errors: error.details.map(detail => detail.message),
            sanitizedFilters: null
        };
    }

    // Validations logiques
    const logicalErrors = [];

    if (value.minMembers && value.maxMembers && value.minMembers > value.maxMembers) {
        logicalErrors.push('Le nombre minimum de membres ne peut pas être supérieur au maximum');
    }

    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
        logicalErrors.push('La date de début ne peut pas être postérieure à la date de fin');
    }

    return {
        isValid: logicalErrors.length === 0,
        errors: logicalErrors,
        sanitizedFilters: value
    };
}

/**
 * Validation des paramètres d'export
 */
function validateExportParams(format, options = {}) {
    const errors = [];

    // Formats supportés
    const supportedFormats = ['json', 'csv', 'pdf', 'xlsx', 'xml'];
    if (!supportedFormats.includes(format)) {
        errors.push(`Format non supporté. Formats disponibles: ${supportedFormats.join(', ')}`);
    }

    // Validation des options spécifiques au format
    if (format === 'csv') {
        if (options.delimiter && !/^[,;|\t]$/.test(options.delimiter)) {
            errors.push('Délimiteur CSV invalide (doit être , ; | ou tab)');
        }
    }

    if (format === 'pdf') {
        if (options.pageSize && !['A4', 'A3', 'Letter', 'Legal'].includes(options.pageSize)) {
            errors.push('Taille de page PDF invalide');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Sanitisation des données d'entrée
 */
function sanitizeInput(input, type = 'string') {
    if (input === null || input === undefined) {
        return '';
    }

    switch (type) {
        case 'string':
            return String(input)
                .trim()
                .replace(/[<>]/g, '') // Suppression des balises HTML basiques
                .substring(0, 1000); // Limitation de longueur

        case 'username':
            return String(input)
                .trim()
                .replace('@', '')
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '') // Garde uniquement les caractères valides
                .substring(0, 32);

        case 'url':
            try {
                const url = new URL(input);
                return url.href;
            } catch {
                return '';
            }

        case 'number':
            const num = parseInt(input);
            return isNaN(num) ? 0 : num;

        case 'boolean':
            return Boolean(input);

        default:
            return input;
    }
}

/**
 * Validation des headers HTTP pour éviter l'injection
 */
function validateHeaders(headers) {
    const errors = [];
    const dangerousHeaders = ['host', 'authorization', 'cookie'];

    Object.keys(headers).forEach(header => {
        const headerLower = header.toLowerCase();
        
        // Vérification des headers dangereux
        if (dangerousHeaders.includes(headerLower)) {
            errors.push(`Header ${header} non autorisé`);
        }

        // Vérification des caractères de contrôle
        if (/[\r\n\0]/.test(headers[header])) {
            errors.push(`Header ${header} contient des caractères interdits`);
        }

        // Longueur maximale
        if (headers[header].length > 1000) {
            errors.push(`Header ${header} trop long`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation de l'adresse IP pour les proxies
 */
function validateIPAddress(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validation des paramètres de proxy
 */
function validateProxyConfig(proxyConfig) {
    const errors = [];

    if (proxyConfig.host) {
        if (!validateIPAddress(proxyConfig.host) && !/^[a-zA-Z0-9.-]+$/.test(proxyConfig.host)) {
            errors.push('Adresse du proxy invalide');
        }
    }

    if (proxyConfig.port) {
        const port = parseInt(proxyConfig.port);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('Port du proxy invalide (1-65535)');
        }
    }

    if (proxyConfig.type && !['http', 'https', 'socks4', 'socks5'].includes(proxyConfig.type)) {
        errors.push('Type de proxy invalide (http, https, socks4, socks5)');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation des paramètres de rate limiting
 */
function validateRateLimitConfig(config) {
    const errors = [];

    if (config.windowMs) {
        const windowMs = parseInt(config.windowMs);
        if (isNaN(windowMs) || windowMs < 1000 || windowMs > 3600000) {
            errors.push('Fenêtre de rate limiting invalide (1s - 1h)');
        }
    }

    if (config.maxRequests) {
        const maxRequests = parseInt(config.maxRequests);
        if (isNaN(maxRequests) || maxRequests < 1 || maxRequests > 10000) {
            errors.push('Nombre maximum de requêtes invalide (1-10000)');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation des données de cache
 */
function validateCacheData(key, data, ttl) {
    const errors = [];

    // Validation de la clé
    if (!key || typeof key !== 'string' || key.length > 250) {
        errors.push('Clé de cache invalide (max 250 caractères)');
    }

    // Validation des données
    try {
        JSON.stringify(data);
    } catch {
        errors.push('Données de cache non sérialisables');
    }

    // Validation du TTL
    if (ttl !== undefined) {
        const ttlNum = parseInt(ttl);
        if (isNaN(ttlNum) || ttlNum < 0 || ttlNum > 604800) {
            errors.push('TTL invalide (0-604800 secondes)');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation des requêtes d'upload de fichier
 */
function validateFileUpload(file, allowedTypes = [], maxSize = 10485760) {
    const errors = [];

    if (!file) {
        errors.push('Aucun fichier fourni');
        return { isValid: false, errors };
    }

    // Validation du type MIME
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        errors.push(`Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`);
    }

    // Validation de la taille
    if (file.size > maxSize) {
        errors.push(`Fichier trop volumineux. Taille max: ${(maxSize / 1048576).toFixed(1)}MB`);
    }

    // Validation du nom de fichier
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
        errors.push('Nom de fichier invalide (caractères alphanumériques uniquement)');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validation de configuration de sécurité
 */
function validateSecurityConfig(config) {
    const errors = [];

    // JWT Secret
    if (config.jwtSecret && config.jwtSecret.length < 32) {
        errors.push('JWT Secret trop court (minimum 32 caractères)');
    }

    // Encryption Key
    if (config.encryptionKey && config.encryptionKey.length < 64) {
        errors.push('Clé de chiffrement trop courte (minimum 64 caractères)');
    }

    // CORS Origins
    if (config.allowedOrigins) {
        config.allowedOrigins.forEach(origin => {
            try {
                new URL(origin);
            } catch {
                if (origin !== '*') {
                    errors.push(`Origine CORS invalide: ${origin}`);
                }
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Utilitaire pour échapper les caractères HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Utilitaire pour valider un JSON
 */
function validateJSON(jsonString) {
    try {
        JSON.parse(jsonString);
        return { isValid: true, errors: [] };
    } catch (error) {
        return { 
            isValid: false, 
            errors: [`JSON invalide: ${error.message}`] 
        };
    }
}

/**
 * Validation des paramètres de pagination
 */
function validatePagination(page, limit) {
    const errors = [];

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Numéro de page invalide (minimum 1)');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('Limite invalide (1-100)');
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        pagination: {
            page: Math.max(1, pageNum || 1),
            limit: Math.min(100, Math.max(1, limitNum || 20)),
            offset: (Math.max(1, pageNum || 1) - 1) * Math.min(100, Math.max(1, limitNum || 20))
        }
    };
}

module.exports = {
    validateSearchParams,
    validateUsername,
    validateSearchOptions,
    validateApiKeys,
    validateSearchResult,
    validateFilters,
    validateExportParams,
    validateHeaders,
    validateProxyConfig,
    validateRateLimitConfig,
    validateCacheData,
    validateFileUpload,
    validateSecurityConfig,
    validateJSON,
    validatePagination,
    sanitizeInput,
    escapeHtml,
    validateIPAddress
};
