const rateLimit = require('express-rate-limit');
const { logger } = require('./logger');

// Rate limiter principal pour l'API
const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes par défaut
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes par fenêtre
    
    message: {
        error: 'Trop de requêtes depuis cette adresse IP',
        details: 'Vous avez dépassé la limite de requêtes autorisées. Veuillez réessayer plus tard.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    
    standardHeaders: true, // Inclure les headers de rate limit standard
    legacyHeaders: false, // Désactiver les anciens headers X-RateLimit-*
    
    // Fonction personnalisée pour identifier les clients
    keyGenerator: (req) => {
        // Utiliser l'IP comme clé principale
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    // Ignorer certaines requêtes pour le rate limiting
    skip: (req) => {
        // Skip pour les health checks
        if (req.path === '/health' || req.path === '/ping') {
            return true;
        }
        
        // Skip pour les fichiers statiques
        if (req.path.startsWith('/static/') || req.path.startsWith('/assets/')) {
            return true;
        }
        
        return false;
    }
});

// Rate limiter plus strict pour les endpoints de recherche
const searchRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // 20 recherches max par 10 minutes
    
    message: {
        error: 'Limite de recherches atteinte',
        details: 'Vous avez effectué trop de recherches. Veuillez attendre avant de relancer une recherche.',
        retryAfter: 600 // 10 minutes
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    onLimitReached: (req, res, options) => {
        const clientId = req.ip || req.connection.remoteAddress || 'unknown';
        
        logger.warn('Search rate limit exceeded', {
            clientId,
            username: req.body?.username,
            userAgent: req.get('User-Agent')
        });
    }
});

// Rate limiter pour les exports (plus permissif)
const exportRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 exports max par 5 minutes
    
    message: {
        error: 'Limite d\'exports atteinte',
        details: 'Vous avez exporté trop de fichiers. Veuillez attendre avant de relancer un export.',
        retryAfter: 300 // 5 minutes
    },
    
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter très strict pour prévenir les abus
const strictRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // 5 requêtes max par minute
    
    message: {
        error: 'Accès temporairement restreint',
        details: 'Votre adresse IP a été temporairement limitée en raison d\'un usage excessif.',
        retryAfter: 60
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    onLimitReached: (req, res, options) => {
        const clientId = req.ip || req.connection.remoteAddress || 'unknown';
        
        logger.error('Strict rate limit exceeded - potential abuse', {
            clientId,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }
});

// Middleware pour créer un rate limiter dynamique basé sur l'API utilisée
const createApiRateLimiter = (apiName, requestsPerMinute = 10) => {
    return rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: requestsPerMinute,
        
        message: {
            error: `Limite API ${apiName} atteinte`,
            details: `Vous avez atteint la limite de requêtes pour l'API ${apiName}. Veuillez patienter.`,
            retryAfter: 60
        },
        
        keyGenerator: (req) => {
            // Créer une clé unique combinant IP et API
            const clientId = req.ip || req.connection.remoteAddress || 'unknown';
            return `${clientId}:${apiName}`;
        },
        
        onLimitReached: (req, res, options) => {
            logger.warn(`${apiName} API rate limit exceeded`, {
                clientId: req.ip || req.connection.remoteAddress || 'unknown',
                api: apiName,
                limit: requestsPerMinute
            });
        }
    });
};

// Rate limiters spécifiques par API
const googleApiLimiter = createApiRateLimiter('Google', 8); // Google a des limites strictes
const telegramApiLimiter = createApiRateLimiter('Telegram', 30); // Telegram est plus permissif
const yandexApiLimiter = createApiRateLimiter('Yandex', 10);
const bingApiLimiter = createApiRateLimiter('Bing', 15);

// Middleware pour appliquer le rate limiting conditionnel
const conditionalRateLimit = (condition, limiter) => {
    return (req, res, next) => {
        if (condition(req)) {
            return limiter(req, res, next);
        }
        next();
    };
};

// Helper pour vérifier si une IP est dans une whitelist
const isWhitelisted = (ip) => {
    const whitelist = (process.env.IP_WHITELIST || '').split(',').map(ip => ip.trim());
    return whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1';
};

// Rate limiter avec whitelist
const whitelistAwareRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    
    skip: (req) => {
        const clientIp = req.ip || req.connection.remoteAddress;
        return isWhitelisted(clientIp);
    },
    
    message: {
        error: 'Rate limit exceeded',
        details: 'Too many requests from this IP address.'
    }
});

// Fonction utilitaire pour obtenir les statistiques de rate limiting
const getRateLimitStats = () => {
    return {
        general: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
        },
        search: {
            windowMs: 10 * 60 * 1000,
            maxRequests: 20
        },
        export: {
            windowMs: 5 * 60 * 1000,
            maxRequests: 10
        },
        apis: {
            google: { windowMs: 60 * 1000, maxRequests: 8 },
            telegram: { windowMs: 60 * 1000, maxRequests: 30 },
            yandex: { windowMs: 60 * 1000, maxRequests: 10 },
            bing: { windowMs: 60 * 1000, maxRequests: 15 }
        }
    };
};

module.exports = {
    rateLimiter,
    searchRateLimiter,
    exportRateLimiter,
    strictRateLimiter,
    whitelistAwareRateLimiter,
    googleApiLimiter,
    telegramApiLimiter,
    yandexApiLimiter,
    bingApiLimiter,
    createApiRateLimiter,
    conditionalRateLimit,
    getRateLimitStats,
    isWhitelisted
};
