FROM node:20-alpine

# Set working directory
WORKDIR /app

# Cache bust for Railway: Updated Oct 9 2025

# Copy package files first for better caching
COPY worker/package.json worker/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY worker/ .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
