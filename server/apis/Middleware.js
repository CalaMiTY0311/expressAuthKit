const { redisClient } = require("./dependencie");

const blockAgainLogin = async (req, res, next) => {
    const SID = req.cookies.SID;
    //쿠키에 SID라는 세션 값이 존재하면
    if (SID) {
        // redisClient에 SID값 조회
        try{
            const flag = await redisClient.get(`session:${SID}`);
            // redisClient안에 값과 SID 값이 일치하면 이미 로그인 상태이므로 에러 발생
            if (flag) {
                return res.status(403).json( { msg: "존재하는 세션으로 로그아웃 필요" });
            } else {
                next();
            }
    } catch (error) {
        console.log("blockAgainLogin Middleware error", error);
        res.status(500).json({msg:"어스 서버 미들웨어 에러"})
    } 
    } else {
        next();
    }
}

const verifySession = async (req, res, next) => {
    const SID = req.cookies.SID;
    if (SID) {
        try {
            const flag = await redisClient.get(`session:${SID}`);
            if (!flag) {
                return res.status(401).json({ msg : "로그아웃 상태 입니다." });
            } else {
                next();
            }
        } catch(error) {
            console.error("Session Check middleware error:", error);
            res.status(500).json({msg:"어스 서버 미들웨어 에러"})
        }
    } else {
        return res.status(401).json({ msg : "로그아웃 상태 입니다." });
    }
};

const verifyUid = async (req, res, next) => {
    const UID = req.cookies.UID
    const SID = req.cookies.SID

    if (!UID) {
        return res.status(401).json({ msg: "유효하지 않은 사용자 정보입니다." });
    }

    try {
        const flag = await redisClient.get(`session:${SID}`);
        const flagJson = JSON.parse(flag);
        if (UID === flagJson.UID) {
                next();
        } else {
            return res.status(401).json({ msg: "유효하지 않은 사용자 정보입니다." });
        }
    }  catch(error) {
        console.error("UID verification middleware error:", error);
        return res.status(500).json({msg:"어스 서버 미들웨어 에러"});
    }

}

//* 사용자 미들웨어를 직접 구현

// exports.isLoggedIn = (req, res, next) => {
//     // isAuthenticated()로 검사해 로그인이 되어있으면
//     if (req.isAuthenticated()) {
//        next(); // 다음 미들웨어
//     } else {
//        res.status(403).send('로그인 필요');
//     }
//  };
 
//  exports.isNotLoggedIn = (req, res, next) => {
//     if (!req.isAuthenticated()) {
//        next(); // 로그인 안되어있으면 다음 미들웨어
//     } else {
//        const message = encodeURIComponent('로그인한 상태입니다.');
//        res.redirect(`/?error=${message}`);
//     }
//  };

 const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
       next();
    } else {
       res.status(403).send({msg:"로그인 필요"});
    }
 };
 
 const isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log("로그인 상태가 아니니까 패스")
       next();
    } else {
        res.status(403).json({msg:"이미 로그인 상태입니다."})
    }
 };

module.exports = {blockAgainLogin, verifySession, verifyUid, isLoggedIn, isNotLoggedIn}

// 사용자가 로그인 후 악의적인 UID변경으로 다른 사용자로부터 간섭문제를 해결해야함 