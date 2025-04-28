const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { mongo } = require('../dependencie');
const { userSchema, userFields } = require("../../src/util/dbSchema");

module.exports = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_SECRET_KEY,
        callbackURL: process.env.GOOGLE_REDIRECT_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Google Profile에서 이메일 정보 추출
          const email = profile.emails && profile.emails[0].value;
          
          if (!email) {
            return done(null, false, { message: '이메일 정보를 가져올 수 없습니다.' });
          }
          
          // 기존 사용자 확인
          const existingUser = await mongo.selectDB({ email });
          
          if (existingUser.length > 0) {
            // 이미 가입된 사용자인 경우
            console.log("기존 사용자 로그인:", email);
            return done(null, existingUser[0]);
          } else {
            // 새 사용자 등록
            console.log("새 사용자 등록:", email);
            
            // 새 사용자 객체 생성
            const newUser = { _id: profile.id };
            
            // 기본 필드 설정
            for (const field of userFields) {
              if (field === 'email' && email) {
                newUser.email = email;
              } else if (field === 'username' && profile.displayName) {
                newUser.username = profile.displayName;
              } else if (field === 'profilePicURL' && profile.photos && profile.photos[0]) {
                newUser.profilePicURL = profile.photos[0].value;
              } else if (userSchema[field]?.default !== undefined) {
                newUser[field] = typeof userSchema[field].default === "function"
                  ? userSchema[field].default()
                  : userSchema[field].default;
              }
            }
            
            // 소셜 로그인 제공자 정보 저장
            newUser.provider = "google";
            
            // DB에 새 사용자 추가
            await mongo.insertDB(newUser);
            return done(null, newUser);
          }
        } catch (error) {
          console.error('Google 인증 에러:', error);
          return done(error);
        }
      }
    )
  );
};