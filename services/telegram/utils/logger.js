const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Créer le dossier logs s'il n'existe pas
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configuration du format des logs
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        }, null, 2);
    })
);

// Configuration du logger principal
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'telegram-intelligence-scraper'
    },
    transports: [
        // Logs d'erreur uniquement
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Tous les logs
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// En développement, ajouter les logs console avec couleurs
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
        )
    }));
}

// Fonction helper pour logger les requêtes API
const logApiRequest = (service, endpoint, params = {}) => {
    logger.info('API Request', {
        service,
        endpoint,
        params: Object.keys(params).reduce((acc, key) => {
            // Masquer les clés API dans les logs
            if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
                acc[key] = '[REDACTED]';
            } else {
                acc[key] = params[key];
            }
            return acc;
        }, {})
    });
};

// Fonction helper pour logger les réponses API
const logApiResponse = (service, success, resultsCount = 0, duration = 0, error = null) => {
    const logData = {
        service,
        success,
        resultsCount,
        duration: `${duration}ms`
    };

    if (error) {
        logData.error = error.message;
        logger.error('API Response Error', logData);
    } else {
        logger.info('API Response Success', logData);
    }
};

// Fonction helper pour logger les recherches utilisateur
const logUserSearch = (username, options, ip, userAgent) => {
    logger.info('User Search', {
        action: 'search_initiated',
        username: username.replace('@', ''), // Sanitize
        options: {
            sources: Object.keys(options).filter(key => options[key] === true),
            maxResults: options.maxResults || 100
        },
        client: {
            ip: ip || 'unknown',
            userAgent: userAgent || 'unknown'
        }
    });
};

// Fonction helper pour logger les métriques de performance
const logPerformanceMetrics = (action, duration, details = {}) => {
    logger.info('Performance Metrics', {
        action,
        duration: `${duration}ms`,
        ...details
    });
};

// Middleware Express pour logger les requêtes HTTP
const httpLoggerMiddleware = (req, res, next) => {
    const start = Date.now();
    
    // Logger la requête entrante
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });

    // Override de res.end pour logger la réponse
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - start;
        
        logger.info('HTTP Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        });

        originalEnd.apply(res, args);
    };

    next();
};

// Gestionnaire d'erreurs global pour les exceptions non capturées
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : null,
        promise: promise
    });
});

module.exports = {
    logger,
    logApiRequest,
    logApiResponse,
    logUserSearch,
    logPerformanceMetrics,
    httpLoggerMiddleware
};
