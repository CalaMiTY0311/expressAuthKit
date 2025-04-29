const express = require('express');
const logout = express.Router();
const { createResponse } = require('../../src/util/helperFunc');

const { isLoggedIn } = require("../Middleware")

logout.get('/logout', isLoggedIn, async (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); } // 에러 핸들링
        
        // 클라이언트에서 쿠키 제거
        res.clearCookie('SID', { httpOnly: true, secure: true, sameSite: 'none' });
        res.clearCookie('UID', { httpOnly: true, secure: true, sameSite: 'none' });
        
        req.session.destroy(() => {
            const responseData = createResponse(200, "로그아웃 성공");
            res.status(200).json(responseData.data);
        });
    });
});

module.exports = logout;