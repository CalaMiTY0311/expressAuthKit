const express = require('express');
const register = express.Router();
const AuthController = require('./authController'); 
const { blockAgainLogin } = require('../Middleware');
const { body, validationResult } = require('express-validator');
const { redisClient } = require("../dependencie");
const { v4: uuidv4 } = require('uuid');

async function setSession(res,UID) {
    const SID = uuidv4();
    res.cookie('SID', SID, {
        httpOnly: true,      // 브라우저 접근 제한
        // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
        secure: true,       // HTTP 환경에서 작동하도록 설정
        maxAge: 3600 * 1000,
    });
    
    res.cookie('UID', UID, {
        httpOnly: true,
        secure: true,
        maxAge: 36000 * 1000,
    });

    await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ UID: UID }));
}

register.post('/register', blockAgainLogin, 
    [
        body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ], async (req, res) => {

        console.log("asd")
        // 이메일 패스워드 유효성 검사
        const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({msg:errors.errors[0].msg});
    }

    // 회원가입 로직 실행 
    const result = await AuthController.register(req);
    console.log(result.data)
    // 성공 시 레디스에 세션 저장
    if (result.status === 201){
        setSession(res,result.data.user._id)
    }

    res.status(result.status).json(result.data);
});

module.exports = register;