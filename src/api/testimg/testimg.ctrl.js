import listTestPapers from '../../lib/listTestPapers';

export const list = async ctx => {
  const { testName } = ctx.params;
  console.log('testName', testName);

  // listTestPapers : 시험 시작 전 미리 알아낸 문제지 이미지 파일 이름 리스트
  for (const test of listTestPapers()) {
    if (test.dirname === testName) {
      const result = JSON.stringify(test.filenames);
      ctx.body = result;
      return;
    }
  }
  ctx.status = 404;
};
