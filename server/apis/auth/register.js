const express = require('express');
const register = express.Router();
const AuthController = require('./authController'); 
const { againLoginCheck } = require('../Middleware');
const { body, validationResult } = require('express-validator');

register.post('/register', againLoginCheck, 
    [
        // body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ], async (req, res) => {
        const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const result = await AuthController.register(req);
    res.status(result.status).json(result);
});

module.exports = register;