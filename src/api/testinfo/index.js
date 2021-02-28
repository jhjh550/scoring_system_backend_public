import Router from 'koa-router';
import * as testinfoCtrl from './testinfo.ctrl';
import checkedLoggedIn from '../../lib/checkedLoggedIn';

const testinfo = new Router();

testinfo.get('/', testinfoCtrl.list);
testinfo.post('/', checkedLoggedIn, testinfoCtrl.write);
testinfo.get('/:id', testinfoCtrl.checkObjectId, testinfoCtrl.read);
testinfo.delete(
  '/:id',
  checkedLoggedIn,
  testinfoCtrl.getTestinfoById,
  testinfoCtrl.checkObjectId,
  testinfoCtrl.remove,
);
testinfo.patch(
  '/:id',
  checkedLoggedIn,
  testinfoCtrl.getTestinfoById,
  testinfoCtrl.checkObjectId,
  testinfoCtrl.update,
);

testinfo.delete('/', checkedLoggedIn, testinfoCtrl.deleteAll);

export default testinfo;
