const express = require('express');
const { v4: uuidv4 } = require('uuid');
const login = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const LoginSessionCheck = require("../authMiddleware")

// const authController = new AuthController(); // 인스턴스 생성

login.post('/login', LoginSessionCheck, async (req, res) => {
    const result = await AuthController.login(req);
    if (result.status === 200) {
        // console.log(result.data.user)
        const sessionToken = uuidv4();
        res.cookie('SID', sessionToken, {
            httpOnly: true,      // 브라우저 접근 제한
            // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
            secure: true,       // HTTP 환경에서 작동하도록 설정
            maxAge: 36000 * 1000,
          });
        await redisClient.setEx(sessionToken, 10, JSON.stringify(result.data.user)); 
        try {
            const keys = await redisClient.keys('*');  // 모든 키 가져오기
            const redisData = {};

            for (const key of keys) {
                const value = await redisClient.get(key);
                redisData[key] = value;
            }
        } catch (error) {
            console.error("Error fetching Redis data:", error);
            res.status(500).json({ error: "Failed to fetch Redis data" });
        }
        res.status(result.status).json(result.data);
    } else {
        res.status(result.status).json(result.data);
    }
});

module.exports = login;
