const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    updateProfile,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas do usuário logado
router.put('/profile', updateProfile);

// Rotas de administrador
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
