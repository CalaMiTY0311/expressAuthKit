const userSchema = {
    _id:String,
    username:{ type: String, default: "user" },
    email:String,
    password: { type: String, default: null },
    bio:{ type: String, default: "" },
    profilePicURL: { type: String, default: "" },
    createdAt: { type: Number, default: Date.now },
    provider:{ type: String, default: "local" }
};

const userFields = Object.keys(userSchema);

module.exports = {userSchema,userFields};