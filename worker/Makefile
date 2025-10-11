# XspensesAI Worker Makefile

.PHONY: help dev build start test lint clean docker-build docker-up docker-down logs

# Default target
help:
	@echo "XspensesAI Worker - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start development server with hot reload"
	@echo "  build        Build TypeScript to JavaScript"
	@echo "  start        Start production server"
	@echo "  test         Run tests"
	@echo "  lint         Run ESLint"
	@echo "  clean        Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build Build Docker image"
	@echo "  docker-up    Start services with Docker Compose"
	@echo "  docker-down  Stop services with Docker Compose"
	@echo "  logs         View Docker logs"
	@echo ""
	@echo "Database:"
	@echo "  db-setup     Set up database schema"
	@echo "  db-seed      Seed database with sample data"
	@echo ""

# Development commands
dev:
	@echo "Starting development server..."
	npm run dev

build:
	@echo "Building TypeScript..."
	npm run build

start:
	@echo "Starting production server..."
	npm start

test:
	@echo "Running tests..."
	npm test

lint:
	@echo "Running ESLint..."
	npm run lint

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/
	npm install

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t xspensesai-worker .

docker-up:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d

docker-down:
	@echo "Stopping services with Docker Compose..."
	docker-compose down

logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f worker

# Database commands
db-setup:
	@echo "Setting up database schema..."
	@echo "Please run this SQL in your Supabase SQL editor:"
	@echo "cat src/db/schema.sql"

db-seed:
	@echo "Seeding database with sample data..."
	@echo "Please run this SQL in your Supabase SQL editor:"
	@echo "cat scripts/seed-doc.sql"

# Utility commands
install:
	@echo "Installing dependencies..."
	npm install

type-check:
	@echo "Running TypeScript type checking..."
	npm run type-check

# Production deployment
deploy:
	@echo "Deploying to production..."
	@echo "1. Build the application"
	$(MAKE) build
	@echo "2. Build Docker image"
	$(MAKE) docker-build
	@echo "3. Deploy with Docker Compose"
	$(MAKE) docker-up
	@echo "Deployment complete!"

# Health check
health:
	@echo "Checking worker health..."
	curl -f http://localhost:8080/healthz || echo "Worker is not healthy"

# Queue management
queue-stats:
	@echo "Getting queue statistics..."
	curl -s http://localhost:8080/queue/stats | jq .

queue-pause:
	@echo "Pausing queue..."
	curl -X POST http://localhost:8080/queue/pause

queue-resume:
	@echo "Resuming queue..."
	curl -X POST http://localhost:8080/queue/resume

# Environment setup
env-setup:
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Created .env file from env.example"; \
		echo "Please edit .env with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi






