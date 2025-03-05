const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

const { againLoginCheck } = require("../Middleware")

login.post('/login', againLoginCheck,
    [
        // body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요'),
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ],
    async (req, res) => {
        const result = await AuthController.login(req);
        console.log(result)
        if (result.status === 200) {
            const SID = uuidv4();
            res.cookie('SID', SID, {
                httpOnly: true,      // 브라우저 접근 제한
                // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
                secure: true,       // HTTP 환경에서 작동하도록 설정
                maxAge: 36000 * 1000,
            });
            res.cookie('UID', result.user._id, {
                httpOnly: true,      // 브라우저 접근 제한
                // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
                secure: true,       // HTTP 환경에서 작동하도록 설정
                maxAge: 36000 * 1000,
            });

            // await redisClient.setEx(`session:${SID}`, 3600, result.user._id); 
            await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ _id: result.user._id }));
            // console.log(result)
            res.status(result.status).json(result.msg);
        } else {
            res.status(result.status).json(result.data);
        }
    });

module.exports = login;

