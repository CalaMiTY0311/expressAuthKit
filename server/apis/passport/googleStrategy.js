const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { mongo } = require('../dependencie');
const { userSchema, userFields } = require("../../src/util/dbSchema");

/**
 * Google 로그인 전략 설정
 * 
 * 환경변수:
 * - GOOGLE_CLIENT_ID: Google OAuth 클라이언트 ID
 * - GOOGLE_SECRET_KEY: Google OAuth 시크릿 키
 * - GOOGLE_REDIRECT_URL: 인증 후 리디렉션 URL
 */
module.exports = () => {
  // Google OAuth 설정 확인
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SECRET_KEY;
  const callbackURL = process.env.GOOGLE_REDIRECT_URL;
  
  if (!clientID || !clientSecret || !callbackURL) {
    console.warn('⚠️ Google OAuth 설정이 불완전합니다. Google 로그인이 작동하지 않을 수 있습니다.');
    console.warn('다음 환경 변수를 설정하세요: GOOGLE_CLIENT_ID, GOOGLE_SECRET_KEY, GOOGLE_REDIRECT_URL');
    return;
  }
  
  console.log('🔑 Google OAuth 설정이 로드되었습니다.');
  
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
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
            console.log(`✅ Google 로그인 성공: ${email} (기존 사용자)`);
            return done(null, existingUser[0]);
          } else {
            // 새 사용자 등록
            console.log(`➕ Google 로그인 - 신규 사용자 등록: ${email}`);
            
            // 새 사용자 객체 생성
            const newUser = { 
              _id: profile.id,
              email,
              provider: "google"
            };
            
            // 기본 필드 설정
            if (profile.displayName) {
              newUser.username = profile.displayName;
            }
            
            if (profile.photos && profile.photos[0]) {
              newUser.profilePicURL = profile.photos[0].value;
            }
            
            // 스키마 기본값 적용
            for (const field of userFields) {
              if (newUser[field] === undefined && userSchema[field]?.default !== undefined) {
                newUser[field] = typeof userSchema[field].default === "function"
                  ? userSchema[field].default()
                  : userSchema[field].default;
              }
            }
            
            // DB에 새 사용자 추가
            await mongo.insertDB(newUser);
            console.log(`✅ Google 사용자 등록 완료: ${email}`);
            return done(null, newUser);
          }
        } catch (error) {
          console.error('❌ Google 인증 오류:', error);
          return done(error);
        }
      }
    )
  );
};