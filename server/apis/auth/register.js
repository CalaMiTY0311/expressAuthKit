const express = require('express');
const register = express.Router();
const AuthController = require('../../src/util/AuthController');
const { createResponse } = require('../../src/util/helperFunc');
const { isNotLoggedIn } = require('../Middleware');
const { body, validationResult } = require('express-validator');

register.post('/register', 
    isNotLoggedIn,
    [
        body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ], async (req, res, next) => {

        // 이메일 패스워드 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(createResponse(400, errors.errors[0].msg).data);
        }

        // 회원가입 로직 실행 
        const result = await AuthController.register(req);
        // 성공 시 레디스에 세션 저장
        if (result.status === 201) {
            const user = result.data.user; // 등록된 사용자 객체
            // ✅ 자동 로그인 처리
            req.login(user, (loginError) => {
                if (loginError){
                    console.error("자동 로그인 에러:", loginError);
                    return next(loginError);
                }
                const responseData = createResponse(201, "회원가입 및 자동 로그인 성공", { user });
                return res.status(201).json(responseData.data);
            });
        } else {
            // 실패 시
            return res.status(result.status).json(result.data);
        }
    });

module.exports = register;