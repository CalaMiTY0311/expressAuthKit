#!/bin/bash

# 8080 포트를 사용 중인 프로세스 ID 찾기  
PID=$(lsof -t -i :5050) 

# 프로세스가 사용 중이면 종료
if [ -n "$PID" ]; then
  echo "포트 8080을 사용 중인 프로세스가 있습니다. PID: $PID"
  kill -9 $PID
  echo "프로세스를 종료했습니다."
else
  echo "포트 8080을 사용 중인 프로세스가 없습니다."
fi

# 서버 재시작 (npm start로 서버 시작)
echo "서버를 재시작합니다..."
npm start