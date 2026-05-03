@echo off
echo ==========================================
echo Starting AI Career Recommendation System
echo ==========================================

REM Dừng và xóa tất cả containers cũ
echo Step 1: Stopping old containers...
docker compose down -v

REM Khởi động lại tất cả services với file .env
echo Step 2: Starting PostgreSQL, Redis, Neo4j...
docker compose --env-file apps/backend/.env up -d

REM Đợi services khởi động
echo Step 3: Waiting for services to be ready...
timeout /t 15 /nobreak > nul

REM Kiểm tra trạng thái
echo Step 4: Checking container status...
docker compose ps

echo.
echo Step 5: Testing connections...

REM Test PostgreSQL
echo PostgreSQL:
docker compose exec -T postgres pg_isready -U postgres

REM Test Redis
echo Redis:
docker compose exec -T redis redis-cli ping

REM Test Neo4j
echo Neo4j:
curl -s http://localhost:7474

echo.
echo ==========================================
echo All services are ready!
echo PostgreSQL: localhost:5433
echo Redis: localhost:6379
echo Neo4j HTTP: localhost:7474
echo Neo4j Bolt: localhost:7687
echo ==========================================
pause
