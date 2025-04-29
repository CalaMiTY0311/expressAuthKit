const express = require('express');
const options = express.Router();
const AuthController = require('../../src/util/AuthController');
const { createResponse } = require('../../src/util/helperFunc');
const { redisClient, mongo } = require("../dependencie");
const { body, validationResult } = require('express-validator');
const totpUtil = require('../../src/util/totpUtil');
const { isLoggedIn } = require('../Middleware');

// 계정 정보 업데이트
options.put('/updateAccount', isLoggedIn, async(req, res) => {
    try {
        // 사용자 ID 설정
        req.cookies = {
            ...req.cookies,
            UID: req.user._id
        };
        
        const result = await AuthController.updateAccount(req);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("계정 업데이트 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
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
            return res.status(400).json(createResponse(400, errors.array()[0].msg).data);
        }
        
        // 소셜 로그인 사용자 제한
        if (req.user.provider && req.user.provider !== 'local') {
            return res.status(403).json(createResponse(403, "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.").data);
        }
        
        // 사용자 ID 설정
        req.cookies = {
            ...req.cookies,
            UID: req.user._id
        };
        
        const result = await AuthController.changePassword(req);
        
        if (result.status === 200) {
            await terminateUserSessions(req.user._id, req.sessionID);
        }
        
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("비밀번호 변경 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
    }
});

// 세션 종료 함수 (코드 재사용성 향상)
async function terminateUserSessions(userId, currentSessionId) {
    try {
        // Redis에서 현재 사용자의 세션 검색
        const sessionPattern = 'sess:*';
        const allSessions = await redisClient.keys(sessionPattern);
        
        // 사용자의 세션 필터링
        const userSessions = [];
        const currentSessionKey = `sess:${currentSessionId}`;
        
        for (const sessionKey of allSessions) {
            const sessionData = await redisClient.get(sessionKey);
            if (!sessionData) continue;
            
            try {
                const parsedData = JSON.parse(sessionData);
                if (parsedData?.passport?.user === userId) {
                    userSessions.push(sessionKey);
                }
            } catch (e) {
                console.error('Session data parse error:', e);
            }
        }
        
        // 현재 세션을 제외한 모든 세션 삭제
        let terminatedCount = 0;
        for (const session of userSessions) {
            if (session !== currentSessionKey) {
                await redisClient.del(session);
                terminatedCount++;
            }
        }
        
        console.log(`Terminated ${terminatedCount} active sessions for user ${userId}`);
        return terminatedCount;
    } catch (error) {
        console.error('Error terminating sessions:', error);
        return 0;
    }
}

// 계정 삭제
options.delete('/deleteAccount', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const result = await AuthController.deleteAccount({
            ...req,
            params: { id: userId }
        });
        
        if (result.status === 200) {
            // Passport 로그아웃 처리
            req.logout(function(err) {
                if (err) {
                    console.error("로그아웃 오류:", err);
                    return res.status(500).json(createResponse(500, "로그아웃 중 오류가 발생했습니다.").data);
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
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
    }
});

// 현재 사용자 정보 조회
options.get('/me', isLoggedIn, (req, res) => {
    try {
        // 보안을 위해 비밀번호 제외
        const { password, ...userInfo } = req.user;
        
        res.status(200).json(createResponse(200, "사용자 정보 조회 성공", {
            user: userInfo
        }).data);
    } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
    }
});

// 2단계 인증(TOTP) 활성화/비활성화
options.post('/toggleTotp', isLoggedIn, async (req, res) => {
    try {
        const { enable } = req.body;
        const userId = req.user._id;
        
        // 소셜 로그인 사용자 확인
        if (req.user.provider && req.user.provider !== 'local') {
            return res.status(403).json(createResponse(403, "소셜 로그인 사용자는 2단계 인증을 활성화할 수 없습니다.").data);
        }
        
        // 사용자 정보 업데이트 - $set 연산자 제거
        await mongo.updateDB(
            { _id: userId },
            { totpEnable: !!enable }
        );
        
        // 응답 생성
        const message = enable ? "2단계 인증이 활성화되었습니다." : "2단계 인증이 비활성화되었습니다.";
        res.status(200).json(createResponse(200, message, {
            totpEnable: !!enable
        }).data);
    } catch (error) {
        console.error("TOTP 설정 변경 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
    }
});

// TOTP 인증 테스트(현재 활성화된 사용자를 위한)
options.post('/testTotp', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        
        // TOTP가 활성화되어 있지 않으면 오류
        if (!user.totpEnable) {
            return res.status(400).json(createResponse(400, "2단계 인증이 활성화되어 있지 않습니다.").data);
        }
        
        // 이메일로 인증 코드 전송
        const result = await totpUtil.sendVerificationCode(user.email, user._id);
        
        if (!result.success) {
            return res.status(500).json(createResponse(500, "인증 코드 전송 중 오류가 발생했습니다.").data);
        }
        
        res.status(200).json(createResponse(200, "인증 코드가 이메일로 전송되었습니다.", {
            email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") // 이메일 부분 마스킹
        }).data);
    } catch (error) {
        console.error("TOTP 테스트 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
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
            return res.status(400).json(createResponse(400, errors.array()[0].msg).data);
        }
        
        const { code } = req.body;
        const userId = req.user._id;
        
        // 인증 코드 검증
        const verificationResult = await totpUtil.verifyTotpCode(userId, code);
        
        if (!verificationResult.success) {
            return res.status(400).json(createResponse(400, verificationResult.message).data);
        }
        
        // 인증 코드 삭제
        await totpUtil.clearTotpCode(userId, code);
        
        res.status(200).json(createResponse(200, "인증에 성공했습니다.").data);
    } catch (error) {
        console.error("TOTP 인증 오류:", error);
        res.status(500).json(createResponse(500, "서버 오류가 발생했습니다.").data);
    }
});

module.exports = options;