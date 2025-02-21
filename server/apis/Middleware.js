const { mongo, redisClient } = require("./dependencie")

const againLoginCheck = async (req, res, next) => {
    try{
        const SID = req.cookies.SID;
        if (SID){
            const flag = await redisClient.get(`session:${SID}`);
            console.log(flag)
            if (flag) {
                return res.status(403).json({ msg: "이미 로그인된 상태입니다." });
            }
        }
        next();
    } catch (error) {
        console.log("againLoginCheck Middleware error", error);
        res.status(500).json({msg:error})
    }
}

const SessionCheck = async (req, res, next) => {
    try {
        const SID = req.cookies.SID;
        console.log(SID)
        if (SID) {
            const flag = await redisClient.get(`session:${SID}`);
            console.log(flag)
            if (!flag){
                return res.status(403).json({ msg : "만료된 사용자" });
            } 
        }
        next();
    } catch (error) {
        console.error("Redis session check error:", error);
        res.status(500).json({ msg : error });
    }
};


module.exports = {againLoginCheck, SessionCheck}
