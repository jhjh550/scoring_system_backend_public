import Router from 'koa-router';
import * as criteriaCtrl from './criteria.ctrl';
import checkedLoggedIn from '../../lib/checkedLoggedIn';

const criteria = new Router();

criteria.get('/test', criteriaCtrl.testPageNumber)
criteria.get('/', criteriaCtrl.list);
criteria.post('/', checkedLoggedIn, criteriaCtrl.write);

criteria.get(
  '/:id',
  criteriaCtrl.checkObjectId,
  criteriaCtrl.getCriteriaById,
  criteriaCtrl.read,
);
criteria.delete(
  '/:id',
  checkedLoggedIn,
  criteriaCtrl.getCriteriaById,
  // criteriaCtrl.checkOwnCriteria,
  criteriaCtrl.checkObjectId,
  criteriaCtrl.remove,
);

criteria.patch(
  '/:id',
  checkedLoggedIn,
  criteriaCtrl.getCriteriaById,
  // criteriaCtrl.checkOwnCriteria,
  criteriaCtrl.checkObjectId,
  criteriaCtrl.update,
);

criteria.patch('/', criteriaCtrl.updateCriterias);

criteria.put('/', criteriaCtrl.tempPageNoUpdate);

export default criteria;
