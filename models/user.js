const { Schema, model } = require("mongoose");

const UserSchema = Schema({
  name          : {type: String,},
  lastName      : {type: String,},
  email         : {type: String,unique: true,},
  phone         : {type: String,required: true,unique: true,},
  password      : {type: String,required: true,},
  avatar        : {type: String, default:"https://ik.imagekit.io/mrprwema7/user_default_nUfUA9Fxa.png?ik-sdk-version=javascript-1.4.3&updatedAt=1668611498443"},
  google        : {type: Boolean,default: false,},
  refreshToken  : [String],
  verified      : {type: Boolean, default: false,},
  verifiedCode  : {type: String},
  state         : {type: Boolean,default: true,},
  role          : {type: Schema.Types.ObjectId,ref: 'Role'},
  
 
  
},{ timestamps: true });

UserSchema.methods.toJSON = function () {
  const { __v, password, refreshToken, ...user } = this.toObject();
  return user;
};

module.exports = model("User", UserSchema);
