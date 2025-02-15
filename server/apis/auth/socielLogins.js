const express = require('express');
const { v4: uuidv4 } = require('uuid');
const socielLogins = express.Router();
const AuthController = require('./authController'); 
const { redisClient } = require("../dependencie");

const SessionCheck = require("../Middleware")

const { StatusCodes } = require('http-status-codes');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_SECRET_KEY;
const REDIRECT_URI = process.env.GOOGLE_AUTH_URL;

function getOauth2Client(){
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Google 인증 시작
socielLogins.get('/google/login', (req, res) => {
    try{
        const oauth2Client = getOauth2Client();
    
        const url = oauth2Client.generateAuthUrl({
          access_type: 'offline',
        //   prompt: 'consent',  // 매번 사용자에게 동의 요청
          scope: [
            'https://www.googleapis.com/auth/userinfo.email',  // 이메일 범위
            'https://www.googleapis.com/auth/userinfo.profile' // 프로필 범위
        ],
        });
        
        res.redirect(url);
    } catch(err){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    }
    
});

// Google 인증 후 콜백 처리
socielLogins.get('/google/login/callback', async (req, res) => {
    const code = req.query.code;
    // console.log("code : ",code)
  
    if (!code) {
      return res.redirect('/');
    }
  
    const oauth2Client = getOauth2Client();
  
    try {
      // 토큰 교환: code를 사용하여 access token과 refresh token을 얻음
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
  
      // Google API를 호출하여 사용자 정보를 얻음
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      sessionToken = userInfo.config.headers.Authorization
      sessionToken = sessionToken.replace('Bearer ', '');

            // 쿠키 설정
        res.cookie('SID', sessionToken, {
            httpOnly: true,
            secure: true,            
            maxAge: 3600 * 1000,  // 1시간
        });

      res.redirect('/');
    } catch (error) {
      console.error('Error during authentication:', error);
      res.redirect('/');
    }
});

module.exports = socielLogins;