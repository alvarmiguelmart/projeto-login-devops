const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rotas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Rotas protegidas
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/password', protect, changePassword);

module.exports = router;
