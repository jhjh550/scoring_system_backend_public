import mongoose from 'mongoose';

const { Schema } = mongoose;
const TestInfoSchema = new Schema({
  testName: String,
  imgInfo: {
    pageNoArea: {
      xPos: Number,
      yPos: Number,
      width: Number,
      height: Number,
    },
    testImgWidth: Number,
    testImgHeight: Number,
    answerImgWidth: Number,
    answerImgHeight: Number,
  },
  publishedDate: {
    type: Date,
    default: Date.now, // 현재 날짜를 기본값으로 지정
  },
  user: {
    _id: mongoose.Types.ObjectId,
    username: String,
  },
});

const TestInfo = mongoose.model('TestInfo', TestInfoSchema);
export default TestInfo;
