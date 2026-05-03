#!/bin/bash

echo "=========================================="
echo "Starting AI Career Recommendation System"
echo "=========================================="

# Dừng và xóa tất cả containers cũ
echo "Step 1: Stopping old containers..."
docker compose down -v

# Khởi động lại tất cả services với file .env
echo "Step 2: Starting PostgreSQL, Redis, Neo4j..."
docker compose --env-file apps/backend/.env up -d

# Đợi services khởi động
echo "Step 3: Waiting for services to be ready..."
sleep 15

# Kiểm tra trạng thái
echo "Step 4: Checking container status..."
docker compose ps

# Kiểm tra kết nối
echo ""
echo "Step 5: Testing connections..."

# Test PostgreSQL
echo -n "PostgreSQL: "
docker compose exec -T postgres pg_isready -U postgres && echo "✓ Connected" || echo "✗ Failed"

# Test Redis
echo -n "Redis: "
docker compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo "✓ Connected" || echo "✗ Failed"

# Test Neo4j
echo -n "Neo4j: "
curl -s http://localhost:7474 > /dev/null 2>&1 && echo "✓ Connected" || echo "✗ Failed"

echo ""
echo "=========================================="
echo "All services are ready!"
echo "PostgreSQL: localhost:5433"
echo "Redis: localhost:6379"
echo "Neo4j HTTP: localhost:7474"
echo "Neo4j Bolt: localhost:7687"
echo "=========================================="
