const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Proteger rotas - verificar JWT
const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Não autorizado. Faça login para acessar este recurso.',
            });
        }

        // Verificar se o token está na blacklist (Redis)
        const redis = req.app.get('redis');
        const isBlacklisted = await redis.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido. Faça login novamente.',
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar se o usuário ainda existe
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não encontrado.',
            });
        }

        // Verificar se o usuário está ativo
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Conta desativada. Entre em contato com o administrador.',
            });
        }

        // Verificar se a senha foi alterada após o token ser emitido
        if (user.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                success: false,
                error: 'Senha alterada recentemente. Faça login novamente.',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido.',
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado. Faça login novamente.',
            });
        }
        logger.error('Erro na autenticação:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno na autenticação.',
        });
    }
};

// Autorização por roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para acessar este recurso.',
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
