import Router from 'koa-router';
import * as testimgCtrl from './testimg.ctrl';
import checkedLoggedIn from '../../lib/checkedLoggedIn';

const testimg = new Router();

testimg.get('/:testName', checkedLoggedIn, testimgCtrl.list);

export default testimg;
