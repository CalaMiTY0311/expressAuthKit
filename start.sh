# chmod +x start.sh             <-----맥 사용자라면 먼저 ㄱㄱ
docker build -t authserver:1 .

docker-compose up --build -d
