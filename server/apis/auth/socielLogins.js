const express = require('express');
const { v4: uuidv4 } = require('uuid');
const socielLogins = express.Router();
const AuthController = require('./authController'); 
const { mongo, redisClient } = require("../dependencie");

const SessionCheck = require("../Middleware")

const { StatusCodes } = require('http-status-codes');
const { google } = require('googleapis');
const { Session } = require('express-session');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_SECRET_KEY;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URL;
  
function getOauth2Client(){
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}
socielLogins.get('/googleLogin', (req, res) => {
  try {
      const oauth2Client = getOauth2Client();
  
      // 사용자에게 Google 로그인 페이지로 리디렉션
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.profile'],
      });
      
      res.redirect(url);
  } catch (err) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

// Google 인증 후 콜백 처리
socielLogins.get('/googleLogin/callback', SessionCheck, async (req, res) => {
  const code = req.query.code;
  console.log("code :", code)

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

    const userEmail = userInfo.data.email
    const existingUser = await mongo.selectDB({ userEmail });
    console.log(existingUser)
    if (existingUser.length > 0) {
      console.log("이미 가입된 이메일입니다.");
    } else {
      const newUser = {
        _id: userInfo.data.id, // Google에서 제공하는 ID 사용
        email: userEmail,
        username: userInfo.data.name || "", // 기본값 설정
        bio: "",
        profilePicURL: userInfo.data.picture,
        createdAt: Date.now(),
        provider:"google"
      };
      await mongo.insertDB(newUser)
    }
    SID = userInfo.config.headers.Authorization
    SID = SID.replace('Bearer ', '');

    res.cookie('SID', SID, {
      httpOnly: true,      // 브라우저 접근 제한
      // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
      secure: true,       // HTTP 환경에서 작동하도록 설정
      maxAge: 36000 * 1000,
    });
    res.cookie('AID', userInfo.data.id, {
      httpOnly: true,      // 브라우저 접근 제한
      // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
      secure: true,       // HTTP 환경에서 작동하도록 설정
      maxAge: 36000 * 1000,
    });

    console.log("userInfo : ",userInfo.data)
    res.send({
      msg:"로그인 성공",
    })
  } catch (error) {
    console.error('구글 콜백 에러 : ', error);
    res.redirect('/');
  }
});

// // 사용자 프로필 정보
// socielLogins.get('/profile', (req, res) => {    
//   try {
//       const user = req.session.user;
//       res.status(StatusCodes.OK).json(user);
//   } catch (err) {
//       res.status(StatusCodes.INTERNAL_SERVER_ERROR);
//   }
// });

// // 로그아웃
// socielLogins.get('/logout', (req, res) => {
//   req.session = null; // 세션 삭제
//   res.redirect('/');
// });

module.exports = socielLogins;