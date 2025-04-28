const express = require('express');
const socielLogins = express.Router();
const { createResponse } = require('../../src/util/helperFunc');
const { redisClient } = require("../dependencie");
const passport = require('passport');
const { isNotLoggedIn } = require('../Middleware');

// Google 로그인 라우트
socielLogins.get('/googleLogin', isNotLoggedIn, passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// Google 인증 후 콜백 처리
socielLogins.get('/googleLogin/callback', isNotLoggedIn, (req, res, next) => {
  passport.authenticate('google', { failureRedirect: '/login' }, (err, user, info) => {
    if (err) {
      console.error('구글 인증 오류:', err);
      return next(err);
    }
    
    if (!user) {
      return res.redirect('/login');
    }
    
    // 사용자 로그인 처리
    req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error('로그인 오류:', loginErr);
        return next(loginErr);
      }
      
      // 쿠키 설정
      res.cookie('UID', user._id, {
        httpOnly: true,
        secure: true,
        maxAge: 36000 * 1000,
      });
      
      // 세션은 Passport가 자동으로 처리하므로 추가 Redis 저장은 불필요
      // 요청 완료 후 클라이언트로 리다이렉트
      res.redirect('http://localhost:5173/dashboard');
    });
  })(req, res, next);
});

module.exports = socielLogins;