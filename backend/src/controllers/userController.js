const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Obter todos os usuários (Admin)
// @route   GET /api/users
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-refreshTokens')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Obter um usuário por ID (Admin)
// @route   GET /api/users/:id
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-refreshTokens');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado.',
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Atualizar usuário (Admin)
// @route   PUT /api/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role, isActive },
            { new: true, runValidators: true }
        ).select('-refreshTokens');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado.',
            });
        }

        logger.info(`Usuário atualizado: ${user.email}`);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Deletar usuário (Admin)
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado.',
            });
        }

        // Remover sessão do Redis
        const redis = req.app.get('redis');
        await redis.del(`session:${user._id}`);

        logger.info(`Usuário deletado: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'Usuário deletado com sucesso.',
        });
    } catch (error) {
        logger.error('Erro ao deletar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};

// @desc    Atualizar perfil do usuário logado
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, email },
            { new: true, runValidators: true }
        ).select('-refreshTokens');

        logger.info(`Perfil atualizado: ${user.email}`);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor.',
        });
    }
};
