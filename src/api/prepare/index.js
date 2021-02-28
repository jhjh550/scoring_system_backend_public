import Router from 'koa-router';
import * as prepareCtrl from './prepare.ctrl';

const prepare = new Router();

// prepare.get('/', prepareCtrl.prepare);
// prepare.get('/countNotProcessed', prepareCtrl.countNotProcessed);
// prepare.get('/secondProcess', prepareCtrl.secondProcess);
// prepare.get('/fileCopy/:startNo', prepareCtrl.fileCopy);
// prepare.get('/moveToAnswerGroupDir', prepareCtrl.moveToAnswerGroupDir);
// prepare.get('/resize', prepareCtrl.resize);
// prepare.get('/rename', prepareCtrl.rename);
// prepare.get('/temp1', prepareCtrl.temp1);
// prepare.get('/temp2', prepareCtrl.temp2);
// prepare.get('/makeFileList', prepareCtrl.makeFileList);
// prepare.get('/copyFirstPageFile', prepareCtrl.copyFirstPageFile);

// prepare.get('/delte5th', prepareCtrl.deleteTemp5th);
// prepare.get('/deleteMatch', prepareCtrl.deleteMatch);

//prepare.get('/testGenerate/:testCode', prepareCtrl.generateTest);
prepare.get('/hello', prepareCtrl.hello);
prepare.get('/changeDetails', prepareCtrl.changeDetails);
prepare.get('/testinfo', prepareCtrl.generateTestInfo)
prepare.get('/scores', prepareCtrl.generateEmptyScores)
export default prepare;
