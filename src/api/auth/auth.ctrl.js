/* eslint-disable require-atomic-updates */
import Joi from 'joi';
import User from '../../models/user';

export const register = async ctx => {
  const schema = Joi.object().keys({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .required(),
    password: Joi.string().required(),
  });
  const result = Joi.validate(ctx.request.body, schema);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { username, password } = ctx.request.body;
  try {
    // username 이 이미 존재하는지 확인
    const exists = await User.findByUsername(username);
    if (exists) {
      console.log('exist: ', username);
      ctx.status = 409; // conflict
      return;
    }

    const user = new User({ username });
    await user.setPassword(password);
    await user.save();

    // 응답할 데이터에서 hashedPassword 필드 제거
    ctx.body = user.serialize();

    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 604800000, // 1000*60*60*24*7 : 7일
      httpOnly: true,
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const login = async ctx => {
  const { username, password } = ctx.request.body;

  // username, password 가 없으면 에러처리
  if (!username || !password) {
    ctx.status = 401; // unauthrized
    return;
  }
  try {
    const user = await User.findByUsername(username);
    // 계정이 존재하지 않으면 에러처리
    if (!user) {
      ctx.status = 401;
      return;
    }
    const valid = await user.checkPassword(password);
    if (!valid) {
      // 잘못된 비밀번호
      ctx.status = 401;
      return;
    }
    ctx.body = user.serialize();

    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 604800000, // 1000*60*60*24*7 : 7일
      httpOnly: true,
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};

// 로그인 확인
export const check = async ctx => {
  const { user } = ctx.state;
  if (!user) {
    // 로그인 중이 아니라면
    ctx.status = 401;
    return;
  }
  ctx.body = user;
};

export const list = async ctx => {
  const { user } = ctx.state;
  if (!user) {
    ctx.status = 401;
    return;
  }
  if (!user.admin) {
    ctx.status = 401;
    return;
  }
  // query 해서 user list 반환
  const query = {
    admin: false,
  };

  try {
    const scorers = await User.find(query).exec();
    ctx.body = scorers;
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const logout = async ctx => {
  ctx.cookies.set('access_token');
  ctx.status = 204; // no content
};
