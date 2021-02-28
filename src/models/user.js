import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 채점자 정보
const UserSchema = new Schema({
  username: String,
  hashedPassword: String,
  admin: { type: Boolean, default: false },
});

UserSchema.methods.setPassword = async function(password) {
  const hash = await bcrypt.hash(password, 10);
  this.hashedPassword = hash;
};
UserSchema.methods.checkPassword = async function(password) {
  const result = await bcrypt.compare(password, this.hashedPassword);
  return result; //true/false
};
UserSchema.methods.serialize = function() {
  const data = this.toJSON();
  delete data.hashedPassword;
  return data;
};
UserSchema.methods.generateToken = function() {
  const token = jwt.sign(
    {
      // 첫번째 파라미터에는 토큰안에 집어 넣고 싶은 데이터를 넣습니다.
      _id: this.id,
      username: this.username,
      admin: this.admin,
},
    process.env.JWT_SECRET,
    {
      expiresIn: '7d', // 7일동안 유효함
    },
  );
  return token;
};
UserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

const User = mongoose.model('User', UserSchema);
export default User;
