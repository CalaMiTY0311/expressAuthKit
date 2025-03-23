const express = require('express');
const logout = express.Router();
const AuthController = require('./authController');
const { redisClient } = require("../dependencie");

const { verifySession } = require("../Middleware")

logout.post('/logout', verifySession, async (req, res) => {
    const result = await AuthController.logout(req);
    if (result.status === 200) {
        const SID = result.data.SID;
        try {
            const deleteResult = await redisClient.del(`session:${SID}`);
            if (deleteResult !== 1) {
                // Redis에서 세션을 찾지 못하거나 삭제에 실패한 경우
                return res.status(500).json({ msg: "어스 서버 로그아웃 에러 발생"});
            }

            // 세션 삭제 성공 시에만 쿠키 삭제
            res.clearCookie('SID');
            res.clearCookie('UID');
            return res.status(result.status).json(result.data);

        } catch (redisError) {
            console.error('세션 삭제 실패:', redisError);
        }
    }
});

module.exports = logout;