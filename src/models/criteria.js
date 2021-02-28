import mongoose from 'mongoose';

const { Schema } = mongoose;

const ScoreAuth = new Schema({
  username: String,
  _id: String,
});

const CriteriaDetail = new Schema({
  point: Number,
  text: String,
});

const CriteriaSchema = new Schema({
  question: {
    no: String,
    score: Number,
    testinfoId: String,
    testName: String,
    pageNo: Number,
    area: {
      imgFileName: String,
      xPos: Number,
      yPos: Number,
      width: Number,
      height: Number,
    },
  },
  details: [CriteriaDetail], // 채점기준
  scoreAuth: [ScoreAuth], // 채점자
  publishedDate: {
    type: Date,
    default: Date.now, // 현재 날짜를 기본값으로 지정
  },
  user: {
    _id: mongoose.Types.ObjectId,
    username: String,
  },
});

const Criteria = mongoose.model('Criteria', CriteriaSchema);
export default Criteria;
