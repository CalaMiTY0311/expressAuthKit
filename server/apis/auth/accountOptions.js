const express = require('express');
const accountOptions = express.Router();
const AuthController = require('../../src/util/AuthController');
const { createResponse } = require('../../src/util/helperFunc');
const { redisClient } = require("../dependencie");
const { body, validationResult } = require('express-validator');

const { isLoggedIn } = require('../Middleware');

// 계정 정보 업데이트 - Passport 인증 사용
accountOptions.put('/updateAccount', isLoggedIn, async(req, res) => {
    try {
        
        // console.log("req : ", req.user._id) ex)req : id
        // 사용자 ID를 세션에서 가져옴 (passport req.user 사용)
        req.cookies = {
            ...req.cookies,
            UID: req.user._id // Passport가 세션에서 복원한 사용자 ID 사용
        };
        // console.log(req.cookies) ex) { UID : "_id" }
        const result = await AuthController.updateAccount(req);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("계정 업데이트 오류:", error);
        res.status(500).json({
            msg: "서버 오류가 발생했습니다."
        });
    }
});

// 비밀번호 변경 - Passport 인증 사용
accountOptions.post('/changePassword', isLoggedIn,
    [
        body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다')
    ], async(req, res) => {
    try {
        // 입력 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array()[0].msg });
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

// 계정 삭제 - Passport 인증 사용
accountOptions.delete('/deleteAccount/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 자신의 계정만 삭제 가능하도록 검증
        if (id !== req.user._id) {
            return res.status(403).json({
                msg: "본인의 계정만 삭제할 수 있습니다."
            });
        }
        
        const result = await AuthController.deleteAccount(req);
        
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

// 현재 사용자 정보 조회 - Passport 인증 사용
accountOptions.get('/me', isLoggedIn, (req, res) => {
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

module.exports = accountOptions;