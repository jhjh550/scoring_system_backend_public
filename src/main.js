require('dotenv').config();
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose from 'mongoose';
import serve from 'koa-static';
import path from 'path';
import send from 'koa-send';

import cors from 'koa-cors';
import api from './api';
import jwtMiddleware from './lib/jwtMiddleware';

const { PORT, MONGO_URI } = process.env;
// console.log(PORT, MONGO_URI);

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(e => {
    console.log(e);
  });

const logger = require('koa-logger');

const app = new Koa();
const router = new Router();

app.use(cors());
app.use(logger());
// 라우터 적용 전에 bodyParser 설정
app.use(bodyParser());
app.use(jwtMiddleware);
// static file
app.use(serve('./public'));
// 라우터 설정
router.use('/api', api.routes()); // api 라우트 적용
// app 인스턴스에 router 적용
app.use(router.routes()).use(router.allowedMethods());

const buildDirectory = path.resolve(
  __dirname,
  '../../scoring_system_frontend_snue/build',
);
app.use(serve(buildDirectory));
app.use(async ctx => {
  // Not Found 이고 주소가 /api 로 시작하지 않는 경우
  if (ctx.status === 404 && ctx.path.indexOf('/api') !== 0) {
    // index.html 내용을 반환
    await send(ctx, 'index.html', { root: buildDirectory });
  }
});

// PORT 가 지정되어 있지 않다면 4000 을 사용
const port = PORT || 4000;
app.listen(port, () => {
  console.log('Score system listening to port %d', port);
});
