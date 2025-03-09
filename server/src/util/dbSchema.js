const userSchema = {
    _id:String,
    username:{ type: String, default: "user" },
    email:String,
    password: { type: String, default: null },
    bio:{ type: String, default: "" },
    profilePicURL: { type: String, default: "" },
    createdAt: { type: Number, default: Date.now },
    provider:{ type: String, default: "local" },

    totpEnable: { type: Boolean, default: true },  // TOTP 활성화 여부
    totpSecret: { type: String, default: null }     // TOTP 비밀 키
};

const userFields = Object.keys(userSchema);

module.exports = {userSchema,userFields};