/* eslint-disable require-atomic-updates */
import TestInfo from '../../models/testinfo';
import Criteria from '../../models/criteria';
import Score from '../../models/score';
import LogInfo from '../../models/loginfo';

import mongoose from 'mongoose';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';

const { ObjectId } = mongoose.Types;
export const checkObjectId = (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }
  return next();
};

/**
 * Write
 */
export const write = async ctx => {
  const schema = Joi.object().keys({
    testName: Joi.string().required(),
  });

  const result = Joi.validate(ctx.request.body, schema);
  if (result.error) {
    ctx.status = 400; // Bad Request
    console.log(result.error);
    ctx.body = result.error;
    return;
  }
  const { testName } = ctx.request.body;
  const testInfo = new TestInfo({
    testName,
    user: ctx.state.user,
  });

  try {
    await testInfo.save();
    ctx.body = testInfo;

    // testName 으로된 디렉토리 생성
    const dirName = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'testinfo',
      testName,
    );

    !fs.existsSync(dirName) &&
      fs.mkdirSync(dirName, { recursive: true }, err => {
        console.log(err);
      });
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * GET /api/testinfo?page=
 */
export const list = async ctx => {
  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }
  const countPerPage = 10;
  try {
    var testinfo = await TestInfo.find()
      .sort({ _id: 1 })
      .limit(countPerPage)
      .skip((page - 1) * countPerPage)
      .exec();

    const testinfoCount = await TestInfo.countDocuments().exec();
    ctx.set('Last-Page', Math.ceil(testinfoCount / countPerPage));
    ctx.body = testinfo;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * read
 */
export const read = async ctx => {
  ctx.body = ctx.state.testinfo;
};

/**
 * remove
 */
export const remove = async ctx => {
  const { id } = ctx.params;
  try {
    const testinfo = await TestInfo.findByIdAndRemove(id).exec();
    ctx.status = 204;
    console.log('delete', JSON.stringify(testinfo, null, 4));
    const { testName } = testinfo;
    if (testName) {
      console.log('delete', testName);
      deleteTestNameDirectory(testName);
    }
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * update
 */
export const update = async ctx => {
  const { id } = ctx.params;
  try {
    const testinfo = await TestInfo.findByIdAndUpdate(id, ctx.request.body, {
      new: true,
    }).exec();
    if (!testinfo) {
      ctx.status = 404;
      return;
    }
    ctx.body = testinfo;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const getTestinfoById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; // Bad Request
    return;
  }
  try {
    const testinfo = await TestInfo.findById(id);
    if (!testinfo) {
      ctx.status = 404;
      return;
    }
    ctx.state.testinfo = testinfo;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

const deleteTestNameDirectory = testName => {
  const dirName = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'testinfo',
    testName,
  );
  deleteFolderRecursive(dirName);
};

const deleteFolderRecursive = function(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file, index) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
};

/**
 * RemoveAll
 */
export const deleteAll = async ctx => {
  try {
    await TestInfo.deleteMany({});
    await Criteria.deleteMany({});
    await LogInfo.deleteMany({});
    await Score.deleteMany({});
    // ctx.status = 204;
    const result = JSON.stringify({ result: 'OK' });
    ctx.body = result;
    console.log('delete TestInfo, Criteria, LogInfo, Score!!!!!');
  } catch (e) {
    ctx.throw(500, e);
  }
};
