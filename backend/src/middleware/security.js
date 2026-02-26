const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Rate limiting geral
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
        success: false,
        error: 'Muitas requisições deste IP, tente novamente em 15 minutos',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting mais restrito para autenticação
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // 5 tentativas
    message: {
        success: false,
        error: 'Muitas tentativas de login, tente novamente em 1 hora',
    },
    skipSuccessfulRequests: true,
});

// Configuração CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost',
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware de segurança
const securityMiddleware = (app) => {
    // Helmet para headers de segurança
    app.use(helmet());
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
    }));

    // CORS
    app.use(cors(corsOptions));

    // Rate limiting
    app.use('/api', limiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);

    // Sanitização de dados
    app.use(mongoSanitize());
    app.use(xss());

    // Prevenir HTTP parameter pollution
    app.use(hpp({
        whitelist: ['sort', 'fields', 'page', 'limit'],
    }));
};

module.exports = securityMiddleware;
