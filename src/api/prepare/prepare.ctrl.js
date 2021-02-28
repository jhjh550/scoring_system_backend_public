/* eslint-disable require-atomic-updates */
import TestInfo from '../../models/testinfo';
import Criteria from '../../models/criteria';
import Score from '../../models/score';
import LogInfo from '../../models/loginfo';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { saveScoreData } from '../score/score.ctrl';
import criteria from '../criteria/index';

const listJpgFiles = dirPath => {
  const files = fs
    .readdirSync(dirPath)
    .filter(file => path.extname(file) === '.jpg');

  var msg = '';
  for (var i = 0; i < files.length; i++) {
    const file = files[i];
    msg += '\t\t\t\t"' + file + '"';
    if (i != files.length - 1) {
      msg += ',';
    }
    msg += '\n';
  }
  return msg;
};

const generateListTestPapersJSFile = testPath => {
  const dirs = fs
    .readdirSync(testPath, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  var msg = 'const listTestPapers = () =>{\n' + '\treturn [\n';

  for (const _dir of dirs) {
    const dir = _dir.trim();
    const dirPath = path.join(testPath, dir);

    msg += '\t\t{\n';
    msg += "\t\t\tdirname: '" + dir + "',\n";
    msg += '\t\t\tfilenames: [\n';
    msg += listJpgFiles(dirPath);
    msg += '\t\t\t],\n';
    msg += '\t\t},\n';
  }
  msg += '\t];\n' + '};\n\n' + 'export default listTestPapers;\n';

  const writePath = path.join(
    __dirname,
    '..',
    '..',
    'lib',
    'listTestPapers.js',
  );
  fs.writeFileSync(writePath, msg);

  return msg;
};

const insertDBAnswerInfo = async ctx => {
  const libPath = path.join(
    __dirname,
    '..',
    '..',
    'lib',
    'listAnswerPapers.js',
  );
  const res = fs.readFileSync(libPath);
  const answerInfos = JSON.parse(res);

  // generate empty score info
  for (var i = 0; i < answerInfos.length; i++) {
    const answerInfo = answerInfos[i];
    const lastIndex = answerInfo.testName.lastIndexOf('_');
    if (lastIndex < 0) {
      continue;
    }

    const testName = answerInfo.testName.substring(0, lastIndex);
    const testInfo = await TestInfo.find({ testName }).exec();
    const testinfo = testInfo[0];
    const query = { 'question.testinfoId': testinfo._id };
    const criterias = await Criteria.find(query).exec();

    for (const criteria of criterias) {
      var details = [];
      criteria.details.map(detail => {
        details.push({ criteria: detail.text, point: detail.point });
      });

      var scoreAuth = [];
      criteria.scoreAuth.map(auth => {
        scoreAuth.push({ _id: auth._id, username: auth.username });
      });

      const { width, height, xPos, yPos } = criteria.question.area;

      for (const answer of answerInfo.answer) {
        const fileNames = answer.fileNames;

        const scoreData = {
          question: {
            area: {
              xPos,
              yPos,
              width,
              height,
              imgFileName: fileNames[criteria.question.pageNo],
            },
            testPaperNo: answer.testNo,
            testName: testName,
            totalScore: criteria.question.score,
            questionNo: criteria.question.no,
          },
          scoreAuth: scoreAuth,
          details: details,
        };

        saveScoreData(ctx, scoreData);
      }
    }
  }
};

export const generateEmptyScores = async ctx => {
  /**
   * 1. generate paper image list js file
   * 2. generate empty score db
   */
  const answerDirPath = '/var/www/images/answer';
  generateListAnswerPapersJSFile(answerDirPath);
  await insertDBAnswerInfo(ctx);
};

const generateListAnswerPapersJSFile = answerPath => {
  const dirs = fs
    .readdirSync(answerPath, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  var msg = '[\n';
  for (var i = 0; i < dirs.length; i++) {
    const _testNamedir = dirs[i];
    const testName = _testNamedir.trim();
    const testNameDirPath = path.join(answerPath, testName);
    const testNameDirs = fs
      .readdirSync(testNameDirPath, { withFileTypes: true })
      .filter(dir => dir.isDirectory())
      .filter(dir => dir.name[0] !== '.')
      .map(dir => dir.name);

    msg += '\t{\n';
    msg += '\t\t"testName": "' + testName + '",\n';
    msg += '\t\t"answer": [\n';

    console.log('length : ' + testNameDirs.length);
    console.log('path : ' + testNameDirPath);

    for (var k = 0; k < testNameDirs.length; k++) {
      const _testNo = testNameDirs[k];
      const testNo = _testNo.trim();
      const testNoDirPath = path.join(testNameDirPath, testNo);

      msg += '\t\t{\n';
      msg += '\t\t\t"testNo": "' + testNo + '",\n';
      msg += '\t\t\t"fileNames": [\n';
      msg += listJpgFiles(testNoDirPath);
      msg += '\t\t\t]\n';
      msg += '\t\t}';
      if (k != testNameDirs.length - 1) {
        msg += ',';
      }
      msg += '\n';
    }
    msg += '\t]\n';
    msg += '\t}';
    if (i != dirs.length - 1) {
      msg += ',';
    }
    msg += '\n';
  }
  msg += ']\n';

  const writePath = path.join(
    __dirname,
    '..',
    '..',
    'lib',
    'listAnswerPapers.js',
  );
  fs.writeFileSync(writePath, msg);
  return msg;
};

const insertDBTestInfo = async (ctx, testDirPath) => {
  const dirs = fs
    .readdirSync(testDirPath, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  for (const _dir of dirs) {
    const testName = _dir.trim();
    const testInfo = new TestInfo({
      testName,
      user: ctx.state.user,
    });
    try {
      await testInfo.save();
    } catch (e) {
      ctx.throw(500, e);
    }
  }
};

export const generateTestInfo = async ctx => {
  const testDirPath = '/var/www/images/testinfo';

  const msg = generateListTestPapersJSFile(testDirPath);
  await insertDBTestInfo(ctx, testDirPath);

  // code from testinfo.ctrl list
  const page = 1;
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

export const deleteTemp5th = async ctx => {
  const testPaperNos = [
    '5A0117',
    '5A0118',
    '5A0119',
    '5A0120',
    '5A0121',
    '5A0122',
    '5A0123',
    '5A0124',
    '5A0125',
  ];
  try {
    for (const no of testPaperNos) {
      const query = { 'question.testPaperNo': no };
      Score.find(query)
        .remove()
        .exec();
    }
  } catch (e) {
    console.log(e);
    ctx.throw(e);
  }
  console.log('delete done!');

  ctx.body = { result: 'ok' };
};

export const makeFileList = async ctx => {
  const answerDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer',
  );
  var fileListData = [];
  // 디렉토리 순회 하면서 그 디렉토리 아래에 있는 jpg 파일 리스트 만들기
  const dirs = fs
    .readdirSync(answerDirPath, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  for (const dir of dirs) {
    const filePath = path.join(answerDirPath, dir);
    const filenames = fs
      .readdirSync(filePath)
      .filter(file => path.extname(file) === '.jpg');

    const subFileListData = { dirname: dir, filenames: filenames };
    fileListData.push(subFileListData);
  }

  console.log(JSON.stringify(fileListData, null, 4));

  ctx.body = fileListData;
};

const testPaperNoValidate = (testPaperNo, pageNo) => {
  if (testPaperNo.substring(0, 1) !== '5') {
    console.log('error1', testPaperNo, 'pageNo', pageNo);
    return false;
  }
  if (testPaperNo.substring(1, 2) !== 'A') {
    console.log('error2', testPaperNo, 'pageNo', pageNo);
    return false;
  }

  const remains = testPaperNo.substring(
    testPaperNo.length - 4,
    testPaperNo.length,
  );

  // 마지막 네자리 숫자 체크!! 이라고 했는데 잘 안되는듯?
  if (!parseInt(remains)) {
    console.log('error3', remains, testPaperNo, 'pageNo', pageNo);
    return false;
  }

  if (testPaperNo.length !== 6) {
    console.log('error4', testPaperNo);
    return false;
  }

  return true;
};
/**
 * public/answer/문제지번호 디렉토리에 pageNo 로 시작하는 파일명으로 변경해서 이동시킨다.
 */
const moveFile = async (testPaperNo, pageNo, file, filePath) => {
  // validate testPaperNo
  const confirmedTestPaperNo = testPaperNoValidate(testPaperNo, pageNo)
    ? testPaperNo
    : 'error';

  const destPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer',
    confirmedTestPaperNo,
  );

  !fs.existsSync(destPath) &&
    fs.mkdirSync(destPath, { recursive: true }, err => {
      console.log('destPath', destPath, err);
    });

  const destFileName = pageNo + '_' + file;
  const destFilePath = path.join(destPath, destFileName);

  await sharp(filePath)
    .resize({ width: 1630 }) // 1517, 1630
    .toFile(destFilePath);

  // fs.renameSync(filePath, destFilePath, () => {
  //   console.log('file moved', destFilePath);
  // });
};

/**
 * public/upload/answer 디렉토리의 이미지에서 paper no 와 page no 를 읽어낸다.
 */
const cropDetect = async uploadPath => {
  const files = fs
    .readdirSync(uploadPath)
    .filter(file => path.extname(file) === '.jpg');
  const worker = createWorker({
    // logger: m => console.log(m),
  });

  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789A/',
  });

  // 4,5,6 학년
  // const paperNoLeft = 1242;
  // const paperNoTop = 152;
  // const paperNoWidth = 232;
  // const paperNoHeight = 52;
  // const pageNoLeft = 792;
  // const pageNoTop = 2116;
  // const pageNoWidth = 88;
  // const pageNoHeight = 30;

  // 3학년 문제지 기준
  // const paperNoLeft = 1165;
  // const paperNoTop = 76;
  // const paperNoWidth = 222;
  // const paperNoHeight = 50;
  // const pageNoLeft = 710;
  // const pageNoTop = 2036;
  // const pageNoWidth = 100;
  // const pageNoHeight = 36;

  // // 3학년 답안지 기준
  // const paperNoLeft = 2392;
  // const paperNoTop = 180;
  // const paperNoWidth = 320;
  // const paperNoHeight = 80;

  // 4,5학년 답안지 기준
  // const paperNoLeft = 2390;
  // const paperNoTop = 20;
  // const paperNoWidth = 300;
  // const paperNoHeight = 80;

  // 4,5학년 답안지 기준
  // const paperNoLeft = 2500;
  // const paperNoTop = 165;
  // const paperNoWidth = 300;
  // const paperNoHeight = 80;

  // 6학년 답안지 기준
  // const paperNoLeft = 2450;
  // const paperNoTop = 160;
  // const paperNoWidth = 300;
  // const paperNoHeight = 80;

  // 6학년 답안지 기준
  // const paperNoLeft = 2500;
  // const paperNoTop = 120;
  // const paperNoWidth = 300;
  // const paperNoHeight = 80;

  // 5학년 답안지 기준
  const paperNoLeft = 2400;
  const paperNoTop = 15;
  const paperNoWidth = 320;
  const paperNoHeight = 85;
  const pageNoLeft = 1300;
  const pageNoTop = 3920;
  const pageNoWidth = 350;
  const pageNoHeight = 100;

  // // 첫번째 페이지 답안지 기준
  // const paperNoLeft = 2300;
  // const paperNoTop = 160;
  // const paperNoWidth = 350;
  // const paperNoHeight = 90;

  for (const file of files) {
    try {
      const filePath = path.join(uploadPath, file);
      const bufferTestPaperNo = await sharp(filePath)
        .extract({
          left: paperNoLeft,
          top: paperNoTop,
          width: paperNoWidth,
          height: paperNoHeight,
        })
        .toBuffer();
      const resultTestPaperNo = await worker.recognize(bufferTestPaperNo);
      const testPaperNo = resultTestPaperNo.data.text.trim();

      console.log('detect paper no', testPaperNo);

      const bufferPageNo = await sharp(filePath)
        .extract({
          left: pageNoLeft,
          top: pageNoTop,
          width: pageNoWidth,
          height: pageNoHeight,
        })
        .toBuffer();
      const {
        data: { text },
      } = await worker.recognize(bufferPageNo);
      const textTrimmed = text.trim();
      const pageNo = textTrimmed.substring(0, textTrimmed.length - 3);

      // console.log(
      //   'filename',
      //   file,
      //   'textTrimmed',
      //   textTrimmed,
      //   'paperNo',
      //   testPaperNo,
      //   'pageNo',
      //   pageNo,
      // );

      // const pageNoString = filePath.substring(
      //   filePath.length - 6,
      //   filePath.length - 4,
      // );
      // const pageNo = (parseInt(pageNoString) % 20) - 1;

      // if (pageNo > 0 && pageNo < 17) {
      await moveFile(testPaperNo, pageNo, file, filePath);
      // } else {
      // fs.unlinkSync(filePath);
      // }
    } catch (e) {
      console.log('error', e, file);
    }
  }

  await worker.terminate();
};

const rotate90 = async uploadPath => {
  const not_rotate = path.join(uploadPath, 'not_rotate');

  const files = fs
    .readdirSync(not_rotate)
    .filter(file => path.extname(file) === '.jpg');
  for (const file of files) {
    const filePath = path.join(not_rotate, file);
    const destPath = path.join(uploadPath, file);

    const meta = await sharp(filePath).metadata();
    if (meta.width > meta.height) {
      await sharp(filePath)
        .rotate(270)
        .toFile(destPath);
      fs.unlinkSync(filePath);
    } else {
      fs.renameSync(filePath, destPath, () => {
        console.log('file moved', destPath);
      });
    }
  }
};

/**
 * 문제지 번호 별로 분류
 */
export const prepare = async ctx => {
  const uploadPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'upload',
    'answer',
  );

  await rotate90(uploadPath);
  await renameFile(uploadPath);
  await cropDetect(uploadPath);
  // await generateEmptyScoreData(ctx);

  ctx.body = JSON.stringify('');
};

/**
 * generate 되는지 확인해 보는 함수
 */
export const generateTest = async ctx => {
  await generateEmptyScoreData(ctx);
  ctx.body = JSON.stringify({ result: true });
  console.log('end of generate test');
};

const generateEmptyScoreData = async ctx => {
  const { testCode } = ctx.params;

  console.log('generateEmptyScoreData');
  // 1. testinfos 에서 testinfo 들을 얻어온다.
  // 2. 해당 testinfo 의 criteria 들을 얻어온다.

  // dirs : [6A0001, 6A0002 ... ]

  const testInfoQuery = { testCode };
  const testinfos = await TestInfo.find(testInfoQuery).exec();
  testinfos.map(async testinfo => {
    const query = {
      ...{ 'question.testinfoId': testinfo._id }, //예를 들어 3학년 시험 //
    };

    const criterias = await Criteria.find(query).exec();

    const libPath = path.join(
      __dirname,
      '..',
      '..',
      'lib',
      'list_answer_paper.js',
    );

    const res = fs.readFileSync(libPath);
    const content = JSON.parse(res);

    for (const dir of content) {
      if (dir.dirname.substring(0, 1) === String(testinfo.testCode)) {
        criterias.map(criteria => {
          const files = dir.filenames;
          const { pageNo } = criteria.question;

          for (const file of files) {
            const names = file.split('_');
            if (names[0] === String(pageNo)) {
              var details = [];
              criteria.details.map(detail => {
                details.push({ criteria: detail });
              });

              var scoreAuth = [];
              criteria.scoreAuth.map(auth => {
                scoreAuth.push({ _id: auth._id, username: auth.username });
              });

              const { width, height, xPos, yPos } = criteria.question.area;

              const scoreData = {
                question: {
                  area: {
                    xPos,
                    yPos,
                    width,
                    height,
                    imgFileName: file,
                  },
                  testPaperNo: dir.dirname,
                  testName: testinfo.testName,
                  totalScore: criteria.question.score,
                  questionNo: criteria.question.no,
                },
                scoreAuth: scoreAuth,
                details: details,
              };

              const { questionNo, testPaperNo } = scoreData.question;
              if (questionNo === 'S050100' && testPaperNo === '5A0117') {
                console.log(JSON.stringify(scoreData, null, 4));
              }
              saveScoreData(ctx, scoreData);
            }
          }
        });
      }
    }
  });
  console.log(testCode, 'scores generate done!');
};

export const countNotProcessed = async ctx => {
  const uploadPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'upload',
    'answer',
  );

  !fs.existsSync(uploadPath) &&
    fs.mkdirSync(uploadPath, { recursive: true }, err => {
      console.log('destPath', uploadPath, err);
    });

  const dirs = fs
    .readdirSync(uploadPath)
    .filter(file => path.extname(file) === '.jpg');

  ctx.body = dirs.length;
};

export const secondProcess = ctx => {
  console.log('second process start');
  const answerDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer',
  );

  const errorDirPath = path.join(answerDirPath, 'error');

  const errorfiles = fs
    .readdirSync(errorDirPath)
    .filter(file => path.extname(file) === '.jpg');

  for (const errorFile of errorfiles) {
    const errorPageNo = errorFile.split('_')[0];
    const errorFileNo = errorFile.substring(
      errorFile.length - 8,
      errorFile.length - 4,
    );
    const startFileNo = parseInt(errorFileNo) - parseInt(errorPageNo) + 1;

    const dirs = fs
      .readdirSync(answerDirPath, { withFileTypes: true })
      .filter(dir => dir.isDirectory())
      .filter(dir => dir.name[0] !== '.')
      .map(dir => dir.name);

    for (const dir of dirs) {
      const filePath = path.join(answerDirPath, dir);
      const compareFiles = fs
        .readdirSync(filePath)
        .filter(file => path.extname(file) === '.jpg');

      for (const compareFile of compareFiles) {
        const compareFileNoStr = compareFile.substring(
          compareFile.length - 8,
          compareFile.length - 4,
        );
        const compareFileNo = parseInt(compareFileNoStr);

        if (compareFileNo === startFileNo) {
          const errorFilePath = path.join(errorDirPath, errorFile);
          const destFilePath = path.join(filePath, errorFile);
          fs.renameSync(errorFilePath, destFilePath, () => {
            console.log('file moved', destFilePath);
          });
        }
      }
    }
  }

  ctx.body = { result: 'ok' };
};

/**
 * 3 학년 이미지에서 %20 해서 1나오는 페이지(첫번째 페이지)만 모아서 복사
 */
export const copyFirstPageFile = async ctx => {
  const scandataDir = path.join(__dirname, '..', '..', '..', '..', 'scandata');

  const answerDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'upload',
    'answer',
    'not_rotate',
  );

  const files = fs
    .readdirSync(scandataDir)
    .filter(file => path.extname(file) === '.jpg');
  for (const file of files) {
    const fileNoStr = file.substring(file.length - 8, file.length - 4);
    const fileNo = parseInt(fileNoStr);

    if (fileNo % 20 === 1) {
      const copyFilePath = path.join(scandataDir, file);
      const destFilePath = path.join(answerDirPath, file);
      console.log('origin', copyFilePath, 'dest', destFilePath);
      fs.copyFileSync(copyFilePath, destFilePath);
    }
  }
};

/*
 * cropDetect 를 처리하기 위해 이미지 100개씩 을 복사해 오는 함수
 */
export const fileCopy = async ctx => {
  const scandataDir = path.join(__dirname, '..', '..', '..', '..', 'scandata');

  const { startNo } = ctx.params;
  const startFileNo = parseInt(startNo);
  console.log('startFileNo', startFileNo);

  const answerDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'upload',
    'answer',
    'not_rotate',
  );

  const files = fs
    .readdirSync(scandataDir)
    .filter(file => path.extname(file) === '.jpg');
  for (const file of files) {
    const fileNoStr = file.substring(file.length - 8, file.length - 4);
    const fileNo = parseInt(fileNoStr);
    if (startFileNo < fileNo && fileNo <= startFileNo + 100) {
      const copyFilePath = path.join(scandataDir, file);
      const destFilePath = path.join(answerDirPath, file);
      console.log('dest : ', destFilePath);

      await fs.renameSync(copyFilePath, destFilePath, () => {
        console.log('file moved', destFilePath);
      });
    }
  }

  console.log('100 file copy done', startFileNo);
  ctx.body = { result: 'ok' };
};

export const moveToAnswerGroupDir = async ctx => {
  const answerDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer',
  );

  const answerGroupDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer6',
  );

  copyFolderSync(answerDirPath, answerGroupDirPath);

  console.log('end of moveToAnswerGroupDir');
  ctx.body = { result: 'ok' };
};

function copyFolderSync(from, to) {
  !fs.existsSync(to) && fs.mkdirSync(to);

  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

export const rename = async ctx => {
  const rootPath = path.join(__dirname, '..', '..', '..', '..', 'scandata');
  //path.join(__dirname, '..', '..', '..', 'public', 'answer');

  renameFile(rootPath);
};

const renameFile = parentPath => {
  fs.readdirSync(parentPath).forEach(element => {
    if (fs.lstatSync(path.join(parentPath, element)).isFile()) {
      var p = path.parse(element);
      var newName = p.name.replace(/[^_0-9]/gi, '');

      const oldPath = path.join(parentPath, element);
      const newPath = path.join(parentPath, newName);

      console.log('old', oldPath);
      console.log('new', newPath);

      fs.rename(oldPath, newPath + '.jpg', function(err) {
        console.log('err', err);
      });
    } else {
      renameFile(path.join(parentPath, element));
    }
  });
};

const resizeFiles = async (originDir, destDir) => {
  const dirs = fs.readdirSync(originDir);
  for (const dir of dirs) {
    const subDirPath = path.join(originDir, dir);
    if (fs.lstatSync(path.join(subDirPath)).isFile()) {
      continue;
    }

    const subOutputPath = path.join(destDir, dir);
    !fs.existsSync(subOutputPath) && fs.mkdirSync(subOutputPath);

    console.log(subOutputPath);

    const files = fs
      .readdirSync(subDirPath)
      .filter(file => path.extname(file) === '.jpg');
    for (const file of files) {
      const outputPath = path.join(subOutputPath, file);
      await sharp(path.join(subDirPath, file))
        .resize({ width: 1630 }) // 1517, 1630
        .toFile(outputPath);
      console.log(file);
    }
  }
  console.log('resize done!!!');
};

export const resize = async ctx => {
  const answer_3_dir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'data_missed',
    'answer3_result_not_resize',
  );

  const outputDirPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'data_missed',
    '_answer3',
  );
  !fs.existsSync(outputDirPath) && fs.mkdirSync(outputDirPath);

  await resizeFiles(answer_3_dir, outputDirPath);
  ctx.body = { result: 'ok' };
};

export const hello = async ctx => {
  console.log('hello world');
  ctx.body = { result: 'ok' };
};

export const temp1 = async ctx => {
  const answer_3_dir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer3',
  );

  const dirs3 = fs
    .readdirSync(answer_3_dir, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  const answer_dir = path.join(__dirname, '..', '..', '..', 'public', 'answer');

  const dirs = fs
    .readdirSync(answer_dir, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  for (const newdir of dirs) {
    var isSame = false;
    for (const olddir of dirs3) {
      if (newdir === olddir) {
        isSame = true;
        break;
      }
    }
    if (!isSame) {
      console.log(`"${newdir}",`);
    }
  }
};

export const temp2 = async ctx => {
  // const arr = [
  //   '3A0239',
  //   '3A0240',
  //   '3A0241',
  //   '3A0242',
  //   '3A0243',
  //   '3A0267',
  //   '3A0268',
  //   '3A0270',
  //   '3A0276',
  //   '3A0278',
  //   '3A0279',
  //   '3A0280',
  //   '3A0283',
  //   '3A0302',
  //   '3A0303',
  //   '3A0312',
  //   '3A0313',
  //   '3A0314',
  //   '3A0315',
  //   '3A0316',
  //   '3A0330',
  //   '3A0331',
  //   '3A0332',
  //   '3A0333',
  //   '3A0334',
  // ];

  const arr = [
    '3A0371',
    '3A0372',
    '3A0373',
    '3A0374',
    '3A0375',
    '3A0376',
    '3A0377',
    '3A0378',
  ];

  const result_dir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer3_result',
  );
  const scandataDir = path.join(__dirname, '..', '..', '..', '..', 'scandata');

  const scanFiles = fs
    .readdirSync(scandataDir)
    .filter(file => path.extname(file) === '.jpg');

  for (const dir of arr) {
    const dirPath = path.join(result_dir, dir);
    const firstIndexFiles = fs
      .readdirSync(dirPath)
      .filter(file => path.extname(file) === '.jpg');

    const firstIndexFile = firstIndexFiles[0];

    const startFileNo = parseInt(
      firstIndexFile.substring(
        firstIndexFile.length - 8,
        firstIndexFile.length - 4,
      ),
    );

    /**
     * 먼저 scandata 에서 해당하는 fileNo 있는지 확인한 다음 그 파일을 아래에서 만든 파일이름으로 바꾸서 복사한다.
     */

    const fileNamePrefix = firstIndexFile.substring(
      1,
      firstIndexFile.length - 8,
    );

    console.log('dir', dir);
    for (var i = 1; i < 18; i++) {
      const copyFileNo = startFileNo + i;
      for (const scanFile of scanFiles) {
        const scanFileNo = parseInt(
          scanFile.substring(scanFile.length - 8, scanFile.length - 4),
        );

        const result_dir_path = path.join(result_dir, dir);
        !fs.existsSync(result_dir_path) &&
          fs.mkdirSync(result_dir_path, { recursive: true }, err => {
            console.log('destPath', result_dir_path, err);
          });

        if (scanFileNo === copyFileNo) {
          const copyFileName = i + fileNamePrefix + (startFileNo + i) + '.jpg';
          console.log('copyfileName', copyFileName);
          fs.copyFileSync(
            path.join(scandataDir, scanFile),
            path.join(result_dir_path, copyFileName),
          );
        }
      }
    }
  }
};

export const deleteMatch = ctx => {
  const scandataDir = path.join(__dirname, '..', '..', '..', '..', 'scandata');
  const answer4dir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'answer5',
  );

  const scanfiles = fs
    .readdirSync(scandataDir)
    .filter(file => path.extname(file) === '.jpg');

  const dirs = fs
    .readdirSync(answer4dir, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .filter(dir => dir.name[0] !== '.')
    .map(dir => dir.name);

  for (const dir of dirs) {
    // 5A010100, ...

    const filePath = path.join(answer4dir, dir);
    const filenames = fs
      .readdirSync(filePath)
      .filter(file => path.extname(file) === '.jpg');

    for (const file of filenames) {
      const arrs = file.split('_');
      const deprefixed = file.substring(arrs[0].length + 1, file.length);
      for (const scanfile of scanfiles) {
        if (deprefixed === scanfile) {
          console.log(scanfile);
          const deletepath = path.join(scandataDir, scanfile);
          fs.unlinkSync(deletepath);
        }
      }
    }
  }
  console.log('done!');

  // 마지막 세글자 %20 해서 0,1,18,19 파일들 추가 삭제
  const scanfiles2 = fs
    .readdirSync(scandataDir)
    .filter(file => path.extname(file) === '.jpg');

  for (const file of scanfiles2) {
    const fileNo = parseInt(file.substring(file.length - 6, file.length - 4));
    const remains = fileNo % 20;
    if (remains === 0 || remains === 1 || remains === 18 || remains === 19) {
      const deletepath = path.join(scandataDir, file);
      fs.unlinkSync(deletepath);
    }
  }
};

export const changeDetails = async ctx => {
  const criterias = await Criteria.find().exec();
  for (const criteria of criterias) {
    const point = criteria.question.score / criteria.details.length;
    const newDetails = [];
    for (const detail of criteria.details) {
      var str = '';
      const detailObj = JSON.parse(JSON.stringify(detail));
      for (let [key, value] of Object.entries(detailObj)) {
        str += value;
      }
      newDetails.push({ point, text: str });
    }
    criteria.details = newDetails;

    try {
      await criteria.save();
      ctx.body = criteria;
    } catch (e) {
      ctx.throw(500, e);
    }
  }

  ctx.body = criterias;
};
