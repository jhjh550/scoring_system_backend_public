#! /bin/bash

echo ""
echo "### 답안지 이미지 복사 시작 ###"
echo "date : $(date +%Y)년 $(date +%m)월 $(date +%d)일 $(date +%H) 시  $(date +%M) 분  $(date +%S) 초 " 

# validate : TODO : archive 에 같은 이름의 디렉토리가 있으면 에러 알리고 중단할것 
#if []
#then
#fi



# 이전 /var/www/images/ 에 있는 문제지 이미지 삭제
echo ""
echo "### delete previos answer images ###"
rm -rf /var/www/images/answer

# 문제 이미지 복사 ~/score/images/ANSWER_IMGS/ -> (/var/www/images)
echo ""
echo "### copy test images ###"
cp -r ~/score/ANSWER_IMGS /var/www/images/answer

# archiving
echo ""
echo "### archive test images ###"
cp -r ~/score/ANSWER_IMGS /mnt/42644816-38d1-4b0a-8797-63602c26d147/test_images/answer


echo ""
echo "### INIT COMPLETE ###"
echo ""