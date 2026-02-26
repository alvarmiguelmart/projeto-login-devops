const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Gerar Access Token
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h',
    });
};

// Gerar Refresh Token
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    });
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Este email já está cadastrado.',
            });
        }

        // Criar usuário
        const user = await User.create({ name, email, password });

        // Gerar tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Salvar refresh token
        user.refreshTokens.push({ token: refreshToken });
        await user.save({ validateBeforeSave: false });

        logger.info(`Novo usuário registrado: ${email}`);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        logger.error('Erro no registro:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({
                success: false,
                error: messages.join('. '),
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Por favor, forneça email e senha.',
            });
        }

        // Buscar usuário com a senha
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas.',
            });
        }

        // Verificar se a conta está bloqueada
        if (user.isLocked()) {
            return res.status(423).json({
                success: false,
                error: 'Conta bloqueada temporariamente por muitas tentativas de login.',
            });
        }

        // Verificar se a conta está ativa
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Conta desativada. Entre em contato com o administrador.',
            });
        }

        // Verificar senha
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            await user.incrementLoginAttempts();
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas.',
            });
        }

        // Reset tentativas de login
        await user.resetLoginAttempts();

        // Gerar tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Salvar refresh token
        user.refreshTokens.push({ token: refreshToken });
        await user.save({ validateBeforeSave: false });

        // Cache da sessão no Redis
        const redis = req.app.get('redis');
        await redis.setex(`session:${user._id}`, 86400, JSON.stringify({
            userId: user._id,
            email: user.email,
            role: user.role,
        }));

        logger.info(`Login bem-sucedido: ${email}`);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const { refreshToken } = req.body;

        if (token) {
            // Adicionar token na blacklist do Redis
            const redis = req.app.get('redis');
            const decoded = jwt.decode(token);
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redis.setex(`blacklist:${token}`, ttl, 'true');
            }

            // Remover sessão do Redis
            await redis.del(`session:${req.user._id}`);
        }

        // Remover refresh token
        if (refreshToken) {
            await User.findByIdAndUpdate(req.user._id, {
                $pull: { refreshTokens: { token: refreshToken } },
            });
        }

        logger.info(`Logout: ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'Logout realizado com sucesso.',
        });
    } catch (error) {
        logger.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token é obrigatório.',
            });
        }

        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Buscar usuário e verificar se o refresh token existe
        const user = await User.findOne({
            _id: decoded.id,
            'refreshTokens.token': refreshToken,
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token inválido.',
            });
        }

        // Remover refresh token antigo
        user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);

        // Gerar novos tokens
        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        // Salvar novo refresh token
        user.refreshTokens.push({ token: newRefreshToken });
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        logger.error('Erro no refresh token:', error);
        res.status(401).json({
            success: false,
            error: 'Refresh token inválido ou expirado.',
        });
    }
};

// @desc    Obter perfil do usuário logado
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        logger.error('Erro ao obter perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Alterar senha
// @route   PUT /api/auth/password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Senha atual e nova senha são obrigatórias.',
            });
        }

        const user = await User.findById(req.user._id).select('+password');

        // Verificar senha atual
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Senha atual incorreta.',
            });
        }

        // Atualizar senha
        user.password = newPassword;
        user.refreshTokens = []; // Invalidar todos os refresh tokens
        await user.save();

        // Invalidar sessão no Redis
        const redis = req.app.get('redis');
        await redis.del(`session:${user._id}`);

        // Gerar novos tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshTokens.push({ token: refreshToken });
        await user.save({ validateBeforeSave: false });

        logger.info(`Senha alterada: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'Senha alterada com sucesso.',
            data: { accessToken, refreshToken },
        });
    } catch (error) {
        logger.error('Erro ao alterar senha:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};
