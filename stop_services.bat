@echo off
echo 🛑 Stopping AI Career Recommendation System Services...
echo.

echo 🔄 Stopping Docker Compose services...
docker-compose --env-file .env.docker down

echo.
echo ✅ All services stopped!
echo.
pause