/**
 * Passport 설정 파일
 * 
 * 이 파일은 Passport.js 인증 미들웨어를 설정합니다.
 * - 로컬 로그인 전략
 * - Google 소셜 로그인 전략
 * - 세션 직렬화/역직렬화
 */

const passport = require('passport');
const local = require('./localStrategy');    // 로컬 로그인 전략
const google = require('./googleStrategy');  // Google 소셜 로그인 전략
const { mongo } = require("../dependencie");

module.exports = () => {
   console.log('🔐 Passport 설정 초기화...');
   
   /**
    * 사용자 직렬화 (Serialization)
    * 로그인 성공 시 사용자 정보에서 ID만 추출하여 세션에 저장
    */
   passport.serializeUser((user, done) => {
      console.log(`✅ 사용자 인증 성공: ${user.email || '이메일 없음'} (ID: ${user._id})`);
      done(null, user._id);
      // 세션에는 { passport: { user: 'user._id' } } 형태로 저장됨
   });

   /**
    * 사용자 역직렬화 (Deserialization)
    * 세션에서 ID를 가져와 DB에서 사용자 정보 조회 후 req.user에 저장
    * 모든 요청마다 실행됨
    */
   passport.deserializeUser(async (id, done) => {
      try {
          // MongoDB에서 사용자 정보 조회
          const users = await mongo.selectDB({ _id: id });
          
          if (users.length > 0) {
              done(null, users[0]); // 사용자 정보를 req.user에 저장
          } else {
              done(new Error("세션은 존재하나 사용자 정보를 찾을 수 없습니다."), null);
          }
      } catch (err) {
          console.error('❌ 사용자 역직렬화 오류:', err);
          done(err, null);
      }
   });

   // 인증 전략 초기화
   local();  // 로컬 로그인 전략 설정
   google(); // Google 로그인 전략 설정
   
   console.log('✅ Passport 설정 완료');
};