#! /bin/bash

echo ""
echo "### 시험정보 생성 및 채점 준비 시작 ###"
echo "date : $(date +%Y)년 $(date +%m)월 $(date +%d)일 $(date +%H) 시  $(date +%M) 분  $(date +%S) 초 " 

# validate : TODO : archive 에 같은 이름의 디렉토리가 있으면 에러 알리고 중단할것 
#if []
#then
#fi

# db dump
echo ""
echo "### db dump ###"
mongodump --db score --out ~/score/db/backup/$(date +%Y)$(date +%m)$(date +%d)-$(date +%H)$(date +%M)

# db init
echo ""
echo "### db init ###"
mongorestore --db score ~/score/db/init/dump/score --drop

# 이전 /var/www/images/ 에 있는 문제지 이미지 삭제
echo ""
echo "### delete previos test images ###"
rm -rf /var/www/images/testinfo

# 문제 이미지 복사 ~/score/images/TEST_IMGS/ -> (/var/www/images)
echo ""
echo "### copy test images ###"
cp -r ~/score/TEST_IMGS /var/www/images/testinfo

# archiving
echo ""
echo "### archive test images ###"
cp -r ~/score/TEST_IMGS /mnt/42644816-38d1-4b0a-8797-63602c26d147/test_images/testinfo


# restart
echo ""
echo "### restart service ###"
pm2 restart index
