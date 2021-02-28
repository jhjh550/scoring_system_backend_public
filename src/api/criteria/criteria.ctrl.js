/* eslint-disable require-atomic-updates */
import Criteria from '../../models/criteria';
import TestInfo from '../../models/testinfo';
import Score from '../../models/score';
import mongoose from 'mongoose';
import Joi from 'joi';

import path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import fs from 'fs';  

export const testPageNumber = async ctx => {
  getPageNumber("문제지_단답형", "short_페이지_003.jpg");
}

const getPageNumber = (testName, imgFileName) => {
  const dirPath = "/var/www/images/testinfo/"+testName;

  const files = fs
    .readdirSync(dirPath)
    .filter(file => path.extname(file) === '.jpg');

  for(var i=0; i<files.length; i++){
    if(files[i] === imgFileName){
      console.log("index : "+i+", "+files[i]);
      return i;
    }
  }
  return 0;
}

const getPageNumberOld = async (testName, imgFileName) => {
  const filePath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'testinfo',
    testName,
    imgFileName,
  );

  const query = { testName: testName };
  const result = await TestInfo.find(query)
    .limit(1)
    .exec();

  if (!result || result.length === 0) {
    return;
  }
  const testinfo = result[0];

  const { pageNoArea } = testinfo.imgInfo;
  const buffer = await sharp(filePath)
    .extract({
      left: pageNoArea.xPos,
      top: pageNoArea.yPos,
      width: pageNoArea.width,
      height: pageNoArea.height,
    })
    .toBuffer();

  const worker = createWorker({
    // logger: m => console.log(m),
  });

  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  const {
    data: { text },
  } = await worker.recognize(buffer);

  const textTrimmed = text.trim();
  const pageNo = textTrimmed.substring(0, textTrimmed.length - 3);
  console.log('pageNo', pageNo);
  return pageNo;
};

const { ObjectId } = mongoose.Types;
export const checkObjectId = (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }
  return next();
};

/* 

{
    "question": {
        "no": "test1",
        "score": "10",
        "testinfoId": "5dccb3bea2db82765dc39e29",
        "testName": "2019년 제1회 교원 창의력 지수 CQ 초등 6학년",
        "area": {
            "imgFileName": "602.jpg",
            "xPos": 252,
            "yPos": 669,
            "width": 563,
            "height": 267
        }
    },
    "details": [
        {
            "point": "4",
            "text": "rlwns1"
        },
        {
            "point": "6",
            "text": "rlwns2"
        }
    ]
}


*/
export const write = async ctx => {
  const schema = Joi.object().keys({
    question: Joi.object().keys({
      testName: Joi.string().required(),
      testinfoId: Joi.string().required(),
      no: Joi.string().required(),
      score: Joi.number().required(),
      area: Joi.object().keys({
        imgFileName: Joi.string().required(),
        xPos: Joi.number().required(),
        yPos: Joi.number().required(),
        width: Joi.number().required(),
        height: Joi.number().required(),
      }),
    }),
    details: Joi.array()
      .items(
        Joi.object().keys({
          point: Joi.number().required(),
          text: Joi.string().required(),
        }),
      )
      .required(),
  });

  const result = Joi.validate(ctx.request.body, schema);
  if (result.error) {
    ctx.status = 400; // Bad Request
    ctx.body = result.error;
    return;
  }

  console.log("criteria write : "+JSON.stringify(ctx.request.body, null, 4));
  const { question, details } = ctx.request.body;
  const pageNo = await getPageNumber(
    question.testName,
    question.area.imgFileName,
  );

  
  const question_ = { ...question, pageNo: pageNo };
  const criteria = new Criteria({
    question: question_,
    details,
    user: ctx.state.user,
  });

  console.log(JSON.stringify(criteria, null, 4));
  try {
    await criteria.save();
    ctx.body = criteria;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * GET /api/criteria?page=
 */
export const list = async ctx => {
  const { testinfoId, testName, userId } = ctx.query;

  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }

  const query = {
    ...(testName ? { 'question.testName': testName } : {}),
    ...(testinfoId ? { 'question.testinfoId': testinfoId } : {}),
    ...(userId ? { 'scoreAuth._id': userId } : {}),
  };

  const countPerPage = 10;
  try {
    const criterias = await Criteria.find(query)
      .sort({ 'question.no': 1 })
      // .sort({ _id: -1 })
      // .limit(countPerPage)
      // .skip((page - 1) * countPerPage)
      .exec();

    const postCount = await Criteria.countDocuments().exec();
    ctx.set('Last-Page', Math.ceil(postCount / countPerPage));
    ctx.body = criterias;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const read = async ctx => {
  ctx.body = ctx.state.criteria;
};

export const remove = async ctx => {
  const { id } = ctx.params;
  try {
    await Criteria.findByIdAndRemove(id).exec();
    ctx.status = 204;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const update = async ctx => {
  const { id } = ctx.params;

  const pageNo = await getPageNumber(
    ctx.request.body.question.testName,
    ctx.request.body.question.area.imgFileName,
  );

  const bodyWidthPageNo = {
    ...ctx.request.body,
    question: {
      ...ctx.request.body.question,
      pageNo: pageNo,
    },
  };

  try {
    const criteria = await Criteria.findByIdAndUpdate(id, bodyWidthPageNo, {
      new: true,
    }).exec();
    if (!criteria) {
      ctx.status = 404;
      return;
    }
    ctx.body = criteria;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const getCriteriaById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; // Bad Request
    return;
  }
  try {
    const criteria = await Criteria.findById(id);
    if (!criteria) {
      ctx.status = 404; // Not Found;
      return;
    }
    ctx.state.criteria = criteria;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const checkOwnCriteria = (ctx, next) => {
  const { user, criteria } = ctx.state;
  if (criteria.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }
  return next();
};

/**
 * 채점자 관리에 사용, score 데이터 있으면 scoreAuth 업데이트 시켜줘야
 * todo : 지금처럼 몽땅 다 반복하는게 아니라 먼저 query 해서 하는 식으로 수정해야함
 */
export const updateCriterias = async ctx => {
  //const criterias = ctx.request.body.criterias;
  const { changedCriterias } = ctx.request.body;

  try {
    for (const criteria of changedCriterias) {
      const updated = await Criteria.findByIdAndUpdate(criteria._id, criteria, {
        new: true,
      }).exec();
      if (!updated) {
        ctx.status = 404;
        return;
      }
      await updateScorer(updated);
    }

    const result = JSON.stringify({ result: 'OK' });
    console.log('updateCriterias', result);
    ctx.body = result;
  } catch (e) {
    ctx.throw(500, e);
  }
};

// criteria 변경에 따른 채점자 update
const updateScorer = async criteria => {
  const query = {
    'question.questionNo': criteria.question.no,
    'question.testName': criteria.question.testName,
  };

  try {
    await Score.updateMany(query, { scoreAuth: criteria.scoreAuth });
  } catch (e) {
    console.log(e);
  }

  console.log('updateScorer done!!!');
};

/**
 * 전체 시험지 아래 페이지 번호 전체 업데이트
 */
export const tempPageNoUpdate = async ctx => {
  // console.log('tempPageNoUpdate');
  try {
    const criterias = await Criteria.find().exec();
    criterias.map(async cr => {
      const { testName } = cr.question;
      const { imgFileName } = cr.question.area;

      const pageNo = await getPageNumber(testName, imgFileName);
      cr.question.pageNo = pageNo;

      const updated = await Criteria.findByIdAndUpdate(cr._id, cr, {
        new: true,
      }).exec();
      if (!updated) {
        ctx.status = 404;
        return;
      }
      console.log(JSON.stringify(updated, null, 4));
    });
    // for (var cr of criterias) {
    //   const { testName } = cr.question;
    //   const { imgFileName } = cr.question.area;

    //   const pageNo = await getPageNumber(testName, imgFileName);
    //   cr.question.pageNo = pageNo;

    //   const updated = await Criteria.findByIdAndUpdate(cr._id, cr, {
    //     new: true,
    //   }).exec();
    //   if (!updated) {
    //     ctx.status = 404;
    //     return;
    //   }
    //   console.log(JSON.stringify(updated, null, 4));
    // }
    ctx.body = { result: 'OK' };
  } catch (e) {
    ctx.throw(500, e);
  }
};
