const express = require('express');
const options = express.Router();
const AuthController = require('../../src/util/AuthController');
const { createResponse } = require('../../src/util/helperFunc');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');
const totpUtil = require('../../src/util/totpUtil');
const { mongo } = require("../dependencie");

const { isLoggedIn } = require('../Middleware');

// 계정 정보 업데이트
options.put('/updateAccount', isLoggedIn, async(req, res) => {
    try {
        // 사용자 ID를 세션에서 가져옴 (passport req.user 사용)
        req.cookies = {
            ...req.cookies,
            UID: req.user._id // Passport가 세션에서 복원한 사용자 ID 사용
        };
        
        const result = await AuthController.updateAccount(req);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("계정 업데이트 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// 비밀번호 변경
options.post('/changePassword', isLoggedIn,
    [
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ], async(req, res) => {
    try {
        // 입력 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array()[0].msg });
        }
        
        // 소셜 로그인 사용자 제한
        if (req.user.provider && req.user.provider !== 'local') {
            return res.status(403).json({
                msg: "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다."
            });
        }
        
        // 사용자 ID를 세션에서 가져옴
        req.cookies = {
            ...req.cookies,
            UID: req.user._id
        };
        
        const result = await AuthController.changePassword(req);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("비밀번호 변경 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// 계정 삭제
options.delete('/deleteAccount', isLoggedIn, async (req, res) => {
    try {
        // 사용자 ID를 세션에서 가져옴
        const userId = req.user._id;
        
        const result = await AuthController.deleteAccount({
            ...req,
            params: { id: userId } // AuthController 함수의 호환성을 위해 params 오브젝트 추가
        });
        
        if (result.status === 200) {
            // Passport 로그아웃 처리
            req.logout(function(err) {
                if (err) {
                    console.error("로그아웃 오류:", err);
                    return res.status(500).json({ msg: "로그아웃 중 오류가 발생했습니다." });
                }
                
                // 세션 파기
                req.session.destroy(function(err) {
                    if (err) {
                        console.error("세션 파기 오류:", err);
                    }
                    res.status(result.status).json(result.data);
                });
            });
        } else {
            res.status(result.status).json(result.data);
        }
    } catch (error) {
        console.error("계정 삭제 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// 현재 사용자 정보 조회
options.get('/me', isLoggedIn, (req, res) => {
    try {
        // 보안을 위해 비밀번호 제외
        const { password, ...userInfo } = req.user;
        
        res.status(200).json({
            msg: "사용자 정보 조회 성공",
            user: userInfo
        });
    } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// 2단계 인증(TOTP) 활성화/비활성화
options.post('/toggleTotp', isLoggedIn, async (req, res) => {
    try {
        const { enable } = req.body;
        const userId = req.user._id;
        
        // 소셜 로그인 사용자 확인
        if (req.user.provider && req.user.provider !== 'local') {
            return res.status(403).json({
                msg: "소셜 로그인 사용자는 2단계 인증을 활성화할 수 없습니다."
            });
        }
        
        // 사용자 정보 업데이트
        await mongo.updateDB(
            { _id: userId },
            { $set: { totpEnable: !!enable } }
        );
        
        res.status(200).json({
            msg: enable ? "2단계 인증이 활성화되었습니다." : "2단계 인증이 비활성화되었습니다.",
            totpEnable: !!enable
        });
    } catch (error) {
        console.error("TOTP 설정 변경 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// TOTP 인증 테스트(현재 활성화된 사용자를 위한)
options.post('/testTotp', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        
        // TOTP가 활성화되어 있지 않으면 오류
        if (!user.totpEnable) {
            return res.status(400).json({
                msg: "2단계 인증이 활성화되어 있지 않습니다."
            });
        }
        
        // 이메일로 인증 코드 전송
        const result = await totpUtil.sendVerificationCode(user.email, user._id);
        
        if (!result.success) {
            return res.status(500).json({
                msg: "인증 코드 전송 중 오류가 발생했습니다."
            });
        }
        
        res.status(200).json({
            msg: "인증 코드가 이메일로 전송되었습니다.",
            email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") // 이메일 부분 마스킹
        });
    } catch (error) {
        console.error("TOTP 테스트 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// TOTP 인증 코드 확인
options.post('/verifyTotp', isLoggedIn, [
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('유효한 6자리 인증 코드를 입력하세요')
], async (req, res) => {
    try {
        // 입력 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array()[0].msg });
        }
        
        const { code } = req.body;
        const userId = req.user._id;
        
        // 인증 코드 검증
        const verificationResult = await totpUtil.verifyTotpCode(userId, code);
        
        if (!verificationResult.success) {
            return res.status(400).json({
                msg: verificationResult.message
            });
        }
        
        // 인증 코드 삭제
        await totpUtil.clearTotpCode(userId, code);
        
        res.status(200).json({
            msg: "인증에 성공했습니다."
        });
    } catch (error) {
        console.error("TOTP 인증 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

module.exports = options;