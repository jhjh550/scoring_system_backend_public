/* eslint-disable require-atomic-updates */
import Score from '../../models/score';

import mongoose from 'mongoose';
import Joi from 'joi';
import writeLogInfo from '../../lib/writeLogInfo';
import fs from 'fs';
import moment from 'moment-timezone';
import path from 'path';
import qs from 'qs';

moment.tz(moment.tz.guess()).zoneAbbr();
const Json2csvParser = require('json2csv').Parser;

const { ObjectId } = mongoose.Types;
export const checkObjectId = (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }
  return next();
};

const calcAcquiredScore = score => {
  const { totalScore } = score.question;
  const unitScore = totalScore / score.details.length;
  var acquiredScore = 0;
  for (const detail of score.details) {
    if (detail.correct) {
      acquiredScore += unitScore;
    }
  }
  return acquiredScore;
};

// export const exportCsv2 = async ctx => {
//   console.log('exportCsv2', ctx.params.testName);
//   const { testName } = ctx.params;
//   try {
//     var date = moment().format('YYYY-MM-DD_HH:mm:ss');
//     const fileName = `${testName}_${date}.csv`;

//     ctx.body = { fileName };
//   } catch (e) {
//     ctx.throw(500, e);
//   }
// };
export const exportCsv = async ctx => {
  const { testName } = ctx.params;

  try {
    const queryTestCode = {
      'question.testName': testName,
    };

    /** testPaperNo :ex) 3A00001 */
    const testPaperNos = await Score.find(queryTestCode)
      .sort({ 'question.testPaperNo': 1 })
      .distinct('question.testPaperNo')
      .exec();

    var fields = [];
    var questions = [];
    /** testPaperNo :ex) 3A00001 */
    for (var i = 0; i < testPaperNos.length; i++) {
      const testPaperNo = testPaperNos[i];

      console.log(testPaperNo);

      const scores = await Score.find({ 'question.testPaperNo': testPaperNo })
        .sort({ 'question.questionNo': 1 })
        .exec();

      if (i === 0) {
        // header fields
        fields.push('no');
        for (const score of scores) {
          fields.push(score.question.questionNo);
        }
      }

      var valueObj = { no: testPaperNo };
      for (const score of scores) {
        const no = score.question.questionNo;
        const acquired = calcAcquiredScore(score); // todo : 미리 계산하도록 수정할것!!!
        valueObj = { ...valueObj, [no]: acquired };
      }
      questions.push(valueObj);
    }
    const json2csvParser = new Json2csvParser({ fields });
    const csvData = json2csvParser.parse(questions);

    const dirName = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'excel_export',
    );

    !fs.existsSync(dirName) &&
      fs.mkdirSync(dirName, { recursive: true }, err => {
        console.log(err);
      });

    var date = moment().format('YYYY-MM-DD_HH:mm:ss');
    const fileName = `${testName}_${date}.csv`;
    const outputPath = path.join(dirName, fileName);

    fs.writeFile(outputPath, csvData, function(error) {
      if (error) throw error;
      console.log(`${outputPath}.csv saved success`);
    });

    const downloadPath = path.join('/excel_export', fileName);
    ctx.body = { fileName: downloadPath };
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const saveScoreData = async (ctx, scoreData) => {
  const schema = Joi.object().keys({
    question: Joi.object()
      .keys({
        testPaperNo: Joi.string().required(),
        testName: Joi.string().required(),
        totalScore: Joi.number().required(),
        questionNo: Joi.string().required(),
        area: Joi.object()
          .keys({
            imgFileName: Joi.string().required(),
            xPos: Joi.number().required(),
            yPos: Joi.number().required(),
            width: Joi.number().required(),
            height: Joi.number().required(),
          })
          .required(),
      })
      .required(),
    details: Joi.array().items(
      Joi.object().keys({
        criteria: Joi.string(),
        point: Joi.number().required(),
        correct: Joi.boolean(),
      }),
    ),
    scoreAuth: Joi.array().items(
      Joi.object().keys({
        _id: Joi.string(),
        username: Joi.string(),
      }),
    ),
  });

  const result = Joi.validate(scoreData, schema);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    return result.error;
  }
  const { question, details, scoreAuth } = scoreData;
  const score = new Score({
    question,
    details,
    scoreAuth,
    user: ctx.state.user,
  });
  try {
    await score.save();
    ctx.body = score;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const write = async ctx => {
  const scoreData = ctx.request.body;
  await saveScoreData(ctx, scoreData);
};

/**
 * GET /api/score?userId=&page=&limit=
 */
export const list = async ctx => {
  const { userId, testName, scoreAuth, state, questionNo } = ctx.query;

  console.log('questionNo', questionNo);
  const query = {
    ...(questionNo ? { 'question.questionNo': questionNo } : {}),
    ...(state ? { state: state } : {}),
    ...(userId ? { 'user._id': userId } : {}), // 5da3e6b5bbe65da84384fcc6
    ...(testName ? { 'question.testName': testName } : {}),
    ...(scoreAuth ? { 'scoreAuth.username': scoreAuth } : {}),
  };

  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }
  // const page = parseInt(ctx.query.page || '1', 10);
  // if (page < 1) {
  //   ctx.status = 400;
  //   return;
  // }

  const countPerPage = 100;
  try {
    const score = await Score.find(query)
       .sort({ 'question.testPaperNo': 1 })
      //.sort({ publishedDate: -1 })
      // .limit(100)
      .limit(countPerPage)
      .skip((page - 1) * countPerPage)
      .exec();

    const scoreCount = await Score.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(scoreCount / countPerPage));

    query.state = 0;
    const notProcessedCount = await Score.countDocuments(query).exec();
    query.state = 1;
    const processCount = await Score.countDocuments(query).exec();
    query.state = 2;
    const doneCount = await Score.countDocuments(query).exec();

    ctx.set('not-processed', notProcessedCount);
    ctx.set('process', processCount);
    ctx.set('done', doneCount);

    console.log('count : ', notProcessedCount, processCount, doneCount);

    ctx.set('Content-Type', 'application/json');
    ctx.body = score;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const read = async ctx => {
  ctx.body = ctx.state.score;
};

export const remove = async ctx => {
  const { id } = ctx.params;
  try {
    await Score.findByIdAndRemove(id).exec();
    ctx.status = 204;
  } catch (e) {
    ctx.throw(500, e);
  }
};

const updateFunc = async (ctx, id, scoreParam) => {
  const { user } = ctx.state;

  // 테스트 코드
  // if (user) {
  //   ctx.status = 503;
  //   //ctx.throw(404);
  //   return;
  // }

  console.log('update 1');
  const updateScore = {
    ...scoreParam,
    user: {
      _id: user._id,
      username: user.username,
    },
    publishedDate: new Date(),
  };

  console.log('update 2');
  // async
  writeLogInfo(user._id, JSON.stringify(updateScore));

  console.log('update 3');
  try {
    const score = await Score.findByIdAndUpdate(id, updateScore, {
      new: true,
    }).exec();
    if (!score) {
      ctx.status = 404;
      return;
    }
    ctx.body = score;
  } catch (e) {
    ctx.throw(500, e);
  }

  console.log('update 4');
};

export const update = async ctx => {
  const { id } = ctx.params;
  const scoreParam = ctx.request.body;
  await updateFunc(ctx, id, scoreParam);
};

export const getScoredById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; // Bad Request
    return;
  }
  try {
    const socre = await Score.findById(id);
    if (!socre) {
      ctx.status = 404;
      return;
    }
    ctx.state.score = socre;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * score 의 state 가 0 인거 아무거나 리턴 ( 한 다음에 state 1 로 수정할것 )
 * get 할때도 user update - 누가 채점하고 있는지 추적필요(get 으로 받아간다음에 연결끊기면 계속 채점중인 상태일듯)
 */
export const getEmptyScore = async ctx => {
  const { scoreId } = ctx.query;
  const { questionNo } = ctx.query;
  const { testName } = ctx.params;
  const { user } = ctx.state;

  const doneStateQuery = {
    state: 2,
    'question.testName': testName,
    'question.questionNo': questionNo,
    'scoreAuth._id': user._id,
  };
  const doneCount = await Score.countDocuments(doneStateQuery).exec();
  ctx.set('Done-Count', doneCount);
  ctx.set('Content-Type', 'application/json');

  if (scoreId) {
    // scoreId 가 있으면 다르게 호출하도록 하자
    const score = await Score.findById(scoreId).exec();
    if (!score) {
      ctx.status = 404;
    } else {
      ctx.body = score;
    }
    return;
  }
  try {
    const query = {
      state: 0,
      'question.testName': testName,
      'scoreAuth._id': user._id,
      ...(questionNo ? { 'question.questionNo': questionNo } : {}),
    };

    try {
      const scores = await Score.find(query)
        .sort({ 'question.questionNo': 1, 'question.testPaperNo':1 })
        .limit(1);
      if (!scores || scores.length === 0) {
        if (query) {
          console.log(query);
        }
        ctx.status = 404;
        return;
      }

      if (scores[0].state === 0) {
        await updateFunc(ctx, scores[0]._id, { state: 1 });
      }
      ctx.body = scores[0];
    } catch (e) {
      console.log(e);
      ctx.throw(500, e);
    }
  } catch (e) {
    const query = ctx.query;
    if (query) {
      console.log('log: ' + query);
    }
    console.log('log2' + ctx.params);
    console.log(e);
    ctx.throw(405, e);
  }
};

export const getStatTest = async ctx => {
  const { testName } = ctx.query;

  console.log('testName', testName);

  const query = { 'question.testName': testName };
  const totalCount = await Score.countDocuments(query).exec();

  query.state = 2;
  const doneCount = await Score.countDocuments(query).exec();

  query.state = 1;
  const processCount = await Score.countDocuments(query).exec();

  ctx.body = { totalCount, doneCount, processCount };
};

export const getStat = async ctx => {
  const { testName, scoreAuth, questionNos } = ctx.request.body.query;

  const result = [];
  try {
    for (const questionNo of questionNos) {
      const query = {
        ...(questionNo ? { 'question.questionNo': questionNo } : {}),
        ...(testName ? { 'question.testName': testName } : {}),
        ...(scoreAuth ? { 'scoreAuth.username': scoreAuth } : {}),
      };

      const totalCount = await Score.countDocuments(query).exec();

      query.state = 2;
      const doneCount = await Score.countDocuments(query).exec();

      result.push({
        questionNo: questionNo,
        total: totalCount,
        done: doneCount,
      });
    }

    ctx.body = result;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const getPrevScore = async ctx => {
  const { scoreId } = ctx.params;
  const { user } = ctx.state;

  if (scoreId) {
    const currentScore = await Score.findById(scoreId).exec();
    if (!currentScore) {
      ctx.status = 404;
      return;
    } else {
      const query = {
        //state: 2,
        'question.testName': currentScore.question.testName,
        'question.questionNo': currentScore.question.questionNo,
        'user._id': user._id,
        publishedDate: { $lt: currentScore.publishedDate },
      };
      const scores = await Score.find(query)
        .limit(1)
        .sort({ publishedDate: -1, 'question.testPaperNo':-1 }) 
        .exec();
      if (!scores || scores.length === 0) {
        console.log('no data');
        ctx.status = 404;
        return;
      }
      ctx.body = scores[0];
    }
  } else {
    ctx.status = 404;
    return;
  }
};

export const checkOwnScored = (ctx, next) => {
  const { user, score } = ctx.state;
  if (score.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }
  return next();
};

export const stateReset = async ctx => {
  console.log('start reset');
  try {
    await Score.updateMany({ state: 0 });
  } catch (e) {
    console.log(e);
    ctx.throw(500, e);
  }

  console.log('end reset');
  ctx.body = { result: 'OK' };
};

export const onetozero = async ctx => {
  const query = { state: 1 };

  try {
    const scores = await Score.find(query).exec();
    scores.map(score => {
      updateFunc(ctx, score._id, { state: 0 });
    });
  } catch (e) {
    console.log(e);
    ctx.throw(500, e);
  }
};
