import mongoose from 'mongoose';

const { Schema } = mongoose;
const LogInfoSchema = new Schema({
  date: Date,
  user_id: mongoose.Types.ObjectId,

  data: String,
});

const LogInfo = mongoose.model('LogInfo', LogInfoSchema);
export default LogInfo;
