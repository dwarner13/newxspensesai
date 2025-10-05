#!/bin/bash
# Railway deployment script for worker backend

echo "🚀 Starting Railway deployment for XspensesAI Worker..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Start the server
echo "🎯 Starting server..."
npm start
