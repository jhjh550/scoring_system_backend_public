import mongoose from 'mongoose';

const { Schema } = mongoose;

const ScoreDetail = new Schema({
  criteria: String,
  point: Number,
  correct: { type: Boolean, default: false },
});

const ScoreAuth = new Schema({
  _id: String,
  username: String,
});

const ScoreSchema = new Schema({
  // state: 0: not scored, 1: process, 2: done
  state: { type: Number, default: 0 },
  acquiredScore: { type: Number, default: 0 },
  question: {
    testPaperNo: String,
    testName: String,
    questionNo: String,
    totalScore: Number,
    area: {
      imgFileName: String,
      xPos: Number,
      yPos: Number,
      width: Number,
      height: Number,
    },
  },
  details: [ScoreDetail],
  scoreAuth: [ScoreAuth],

  publishedDate: {
    type: Date,
    default: Date.now, // 현재 날짜를 기본값으로 지정
  },
  user: {
    _id: mongoose.Types.ObjectId,
    username: String,
  },
});

const Score = mongoose.model('Score', ScoreSchema);
export default Score;
