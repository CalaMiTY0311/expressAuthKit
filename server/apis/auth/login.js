const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

// import qrcode from 'qrcode';                 #qr코드 인증에 필요한 라이브러리 추후 구현 예정
// import { authenticator } from 'otplib';

const totpEmail = require('./totpEmail');

const { againLoginCheck } = require("../Middleware")

async function setSession(res, UID) {
    const SID = uuidv4();
    res.cookie('SID', SID, {
        httpOnly: true,      // 브라우저 접근 제한
        // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
        secure: true,       // HTTP 환경에서 작동하도록 설정
        maxAge: 36000 * 1000,
    });
    
    res.cookie('UID', UID, {
        httpOnly: true,
        secure: true,
        maxAge: 36000 * 1000,
    });
    await redisClient.setEx(`session:${SID}`, 3600, JSON.stringify({ UID: UID }));
    return
}

login.post('/login', againLoginCheck,
    async (req, res) => {
        const result = await AuthController.login(req);        
            const {status, data} = result;

            // 2차 인증 여부확인
            if (result.status === 200) {
                if (result.data.user.totpEnable === false) {
                    await setSession(res, result.data.user.UID); 
                    res.status(result.status).json(result.data);
                } else {
                    try {
                        // email로 인증 코드 보내는 함수
                        const UID = result.data.user.UID;
                        const email = result.data.user.email;
                        const emailAuthResult = await totpEmail.sendVerifyCode(email, UID);
            
                        if (!emailAuthResult.success) {
                            return res.status(500).json({ 
                                msg: "인증 코드 전송에 실패했습니다." 
                            });
                        }
                        // 2FA 필요 상태를 클라이언트에 알림
                        res.status(result.status).json(result.data);
                    } catch (error) {
                        console.error('이메일 인증 코드 전송 오류:', error);
                        return res.status(500).json({ 
                            msg: "인증 코드 전송 중 오류가 발생했습니다." 
                        });
                    }
                }
            } else {
                return res.status(result.status).json(result.data);
            }
});

login.post('/verifyEmail', [
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('유효한 6자리 인증 코드를 입력하세요')
], async (req, res) => {
    try {
        // 입력 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                status: 'error',
                errors: errors.array() 
            });
        }
        const { code } = req.body;
        const UID = req.headers['uid'];
        if (!UID) {
            return res.status(401).json({
                status: 'error',
                message: '인증 세션이 만료되었습니다. 다시 로그인해주세요.'
            });
        }
        const verificationResult = await totpEmail.checkVerifyCode(UID, code);
        if (!verificationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: verificationResult.message
            });
        }
        await setSession(res, UID);
        await redisClient.del(`verifyEmail:${UID}`);

        // 성공 응답
        return res.status(200).json({
            status: 'success',
            message: '2단계 인증이 완료되었습니다.'
        });

    } catch (error) {
        console.error('2FA 인증 검증 오류:', error);
        return res.status(500).json({
            status: 'error',
            message: '인증 처리 중 오류가 발생했습니다.'
        });
    }
});

module.exports = login;