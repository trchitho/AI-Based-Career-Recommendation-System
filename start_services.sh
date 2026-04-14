#!/bin/bash

echo "🚀 Starting AI Career Recommendation System Services..."
echo

echo "📋 Services to start:"
echo "  - PostgreSQL (careerai_postgres) on port 5433"
echo "  - Redis (careerai_redis) on port 6379"
echo "  - Neo4j (careerai_neo4j) on ports 7474/7687"
echo

echo "🔄 Starting Docker Compose services..."
docker-compose --env-file .env.docker up -d

echo
echo "⏳ Waiting for services to be ready..."
sleep 10

echo
echo "🔍 Checking service status..."
docker-compose ps

echo
echo "✅ Services started! Access points:"
echo "  📊 PostgreSQL: localhost:5433 (user: postgres, pass: 123456)"
echo "  🔄 Redis: localhost:6379"
echo "  🌐 Neo4j Browser: http://localhost:7474 (user: neo4j, pass: password123456)"
echo
echo "🎯 Next steps:"
echo "  1. Run backend: cd apps/backend && python -m uvicorn app.main:app --reload --port 8000"
echo "  2. Run frontend: cd apps/frontend && npm run dev"
echo "  3. Setup Neo4j data: cd apps/backend && python app/etl/build_graph_fixed.py"
echo