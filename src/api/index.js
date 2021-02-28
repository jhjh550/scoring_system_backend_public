import Router from 'koa-router';
import auth from './auth';
import criteria from './criteria';
import score from './score';
import testinfo from './testinfo';
import testimg from './testimg';
import prepare from './prepare';

const api = new Router();

console.log('hello world 123123123');

api.use('/auth', auth.routes());
api.use('/criteria', criteria.routes());
api.use('/score', score.routes());
api.use('/testinfo', testinfo.routes());
api.use('/testimg', testimg.routes());
api.use('/prepare', prepare.routes());

export default api;


// pm2 monit
// pm2 list 
// pm2 재시작시키기 pm2 restart index

// 문제지 두번째 페이지부터 numbering (교원과 동일하게)

// 채점기준 리스트에서 정렬방법 
// 현재 1, 11, 12, ... 19, 2, 20, 21, ...
// 1,2,3, ... 9, 10, 11 ... 이렇게 수정하는게 좋을듯