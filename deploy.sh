#!/bin/bash

# Otto Cloud Deployment Script
# This script builds the production Docker images for the SaaS platform.

echo "🚀 Starting Otto Cloud Deployment Build..."

# 1. Build Backend
echo "📦 Building Backend Image..."
docker build -t otto-backend:latest -f backend/Dockerfile backend/

# 2. Build Frontend (Production with Nginx)
echo "📦 Building Frontend Image..."
docker build -t otto-frontend:latest -f frontend/Dockerfile frontend/

# 3. Build Worker
echo "📦 Building Worker Image..."
docker build -t otto-worker:latest -f backend/Dockerfile.worker backend/

echo "✅ Build Complete!"
echo ""
echo "To run the full stack locally in production mode:"
echo "docker-compose -f docker-compose.yml up -d"
echo ""
echo "To push to a registry (e.g., AWS ECR or Docker Hub):"
echo "docker tag otto-backend:latest your-repo/otto-backend:latest"
echo "docker push your-repo/otto-backend:latest"
