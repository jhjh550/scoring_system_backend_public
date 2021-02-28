import Router from 'koa-router';
import * as scoredCtrl from './score.ctrl';
import checkedLoggedIn from '../../lib/checkedLoggedIn';

const scored = new Router();

scored.get('/', scoredCtrl.list); // userid 를 query 문으로 받음
scored.post('/', checkedLoggedIn, scoredCtrl.write);

// scored.get('/:id', scoredCtrl.checkObjectId, scoredCtrl.read);
scored.get('/score/:testName', scoredCtrl.getEmptyScore);
scored.get('/prev/:scoreId', scoredCtrl.getPrevScore);
scored.delete(
  '/:id',
  checkedLoggedIn,
  scoredCtrl.getScoredById,
  // scoredCtrl.checkOwnScored,
  scoredCtrl.checkObjectId,
  scoredCtrl.remove,
);

scored.patch(
  '/:id',
  checkedLoggedIn,
  scoredCtrl.getScoredById,
  // scoredCtrl.checkOwnScored,
  scoredCtrl.checkObjectId,
  scoredCtrl.update,
);

scored.post('/stat', scoredCtrl.getStat);
scored.get('/stat', scoredCtrl.getStatTest);

scored.get('/export/:testName', scoredCtrl.exportCsv);

scored.put('/', scoredCtrl.stateReset);
// scored.get('/onetozero', scoredCtrl.onetozero);
export default scored;
