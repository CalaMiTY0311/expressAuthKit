const express = require('express');
const logout = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");

const { isLoggedIn } = require("../Middleware")

logout.get('/logout', isLoggedIn, async (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); } // 에러 핸들링
        
        // 클라이언트에서 UID 쿠키 제거
        res.clearCookie('UID');
        
        req.session.destroy(() => {
            res.status(200).json({ "data": { "msg": "로그아웃 성공" } });
        });
    });
});

module.exports = logout;