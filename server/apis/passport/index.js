const passport = require('passport');
const local = require('./localStrategy'); // 로컬서버로 로그인할때
const google = require('./googleStrategy'); // 구글 소셜 로그인
//const kakao = require('./kakaoStrategy'); // 카카오서버로 로그인할때
// const User = require('../models/user');
const { mongo } = require("../dependencie")

module.exports = () => {
   /*
    * ㅇ 직렬화(Serialization) : 객체를 직렬화하여 전송 가능한 형태로 만드는 것.
    * ㅇ 역직렬화(Deserialization) : 직렬화된 파일 등을 역으로 직렬화하여 다시 객체의 형태로 만드는 것.
    */

   //? req.login(user, ...) 가 실행되면, serializeUser가 실행된다.
   //? 즉 로그인 과정을 할때만 실행
   passport.serializeUser((user, done) => {
      // req.login(user, ...)의 user가 일로 와서 값을 이용할수 있는 것이다.
    
      done(null, user._id);

      // user.id만을 세션객체에 넣음. 사용자의 온갖 정보를 모두 들고있으면, 
      // 서버 자원낭비기 때문에 사용자 아이디만 저장 그리고 데이터를 deserializeUser애 전달함
      // 세션에는 { id: 3, 'connect.sid' : s%23842309482 } 가 저장됨
   });

   //? deserializeUser는 serializeUser()가 done하거나 passport.session()이 실행되면 실행된다.
   //? 즉, 서버 요청이 올때마다 항상 실행하여 로그인 유저 정보를 불러와 이용한다.
   // passport.deserializeUser((id, done) => {
   //    // req.session에 저장된 사용자 아이디를 바탕으로 DB 조회로 사용자 정보를 얻어낸 후 req.user에 저장. 
   //    // 즉, id를 sql로 조회해서 전체 정보를 가져오는 복구 로직이다.
   //    User.findOne({ where: { id } })
   //       .then(user => done(null, user)) //? done()이 되면 이제 다시 req.login(user, ...) 쪽으로 되돌아가 다음 미들웨어를 실행하게 된다.
   //       .catch(err => done(err));
   // });
   passport.deserializeUser(async (id, done) => {
      try {
          // MongoDB에서 사용자 정보를 가져옵니다.
        //   console.log("id",id)
          const users = await mongo.selectDB({ _id : id }); // 여기서 id는 세션에 저장된 user.id
          if (users.length > 0) {
              done(null, users[0]); // 사용자 정보를 req.user로 전달
          } else {
              done(new Error("세션은 존재하나 db에는 사용자가 존재하지 않습니다."), null); // 사용자 정보가 없다면 에러 처리
          }
      } catch (err) {
          done(err, null); // DB 조회 중 에러가 발생하면 에러 처리
      }
  });

   //^ 위의 이러한 일련의 과정은, 그냥 처음부터 user객체를 통째로 주면 될껄 뭘 직렬화/역직렬화를 하는 이유는
   //^ 세션 메모리가 한정되어있기때문에 효율적으로 하기위해, user.id값 하나만으로 받아와서, 
   //^ 이를 deserialize 복구해서 사용하는 식으로 하기 위해서다.

   /* ---------------------------------------------------------------------- */

   local();
   google();
   //kakao();
};