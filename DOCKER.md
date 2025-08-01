# Docker Setup for AI Chatbot Code Challenge 🐳

This document provides instructions for running the AI Chatbot application using Docker.

## 📋 Prerequisites

- Docker installed on your system
- Docker Compose (usually included with Docker Desktop)
- Your API keys and environment variables ready

## 🏗️ Project Structure

The Docker setup includes:
- `Dockerfile` - Main container configuration
- `docker-compose.yml` - Service orchestration
- `.dockerignore` - Files excluded from Docker build

## 🚀 Quick Start

### 1. Environment Variables Setup

Create a `.env` file in the project root with your configuration:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Authentication
AUTH_SEED=your-secret-jwt-seed-here

# OpenAI Configuration
OPENAI_API_KEY="sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop"

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=your-pinecone-index-name
```

### 2. Build and Run

```bash
# Build and start the application
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`

## 🔧 Docker Commands

### Production Build
```bash
# Build the Docker image
docker build -t ai-chatbot .

# Run the container
docker run -p 3000:3000 --env-file .env ai-chatbot
```

### Development Mode
```bash
# Run development service with hot reload
docker-compose --profile dev up ai-chatbot-dev
```

### Management Commands
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build
```

## 🏥 Health Checks

The container includes health checks that verify the application is responding properly:
- **Interval**: 30 seconds
- **Timeout**: 3 seconds  
- **Retries**: 3 attempts
- **Start Period**: 5 seconds

Check container health:
```bash
docker-compose ps
```

## 🔐 Security Features

- Uses Node.js Alpine image for smaller attack surface
- Runs as non-root user (`nextjs`)
- Excludes sensitive files via `.dockerignore`
- Environment variables for configuration

## 📊 Container Specifications

- **Base Image**: `node:18-alpine`
- **Package Manager**: pnpm (for faster installs)
- **Port**: 3000
- **User**: nextjs (non-root)
- **Working Directory**: `/app`

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs ai-chatbot

# Check if port is already in use
netstat -an | findstr :3000  # Windows
lsof -i :3000               # macOS/Linux
```

### Environment Variables Not Loading
- Ensure `.env` file exists in project root
- Check file permissions
- Verify variable names match exactly

### Build Fails
```bash
# Clean build (remove cache)
docker-compose build --no-cache

# Check Docker disk space
docker system df
```

### Permission Issues
```bash
# Reset file permissions (Unix-based systems)
sudo chown -R $USER:$USER .
```

## 🚀 Production Deployment

For production deployment:

1. **Environment Variables**: Set secure values for all API keys
2. **Reverse Proxy**: Use nginx or similar for SSL termination
3. **Resource Limits**: Add memory and CPU limits to docker-compose.yml
4. **Monitoring**: Implement logging and monitoring solutions
5. **Backup**: Ensure data persistence strategies

### Example Production Override
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  ai-chatbot:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    restart: always
```

Run with: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

## 📝 Notes

- The application uses ES modules (`"type": "module"`)
- pnpm is used for faster package installation
- Development mode mounts source code for hot reload
- Health checks ensure container reliability
- All test files and documentation are excluded from the build

## 🔗 Related Files

- `server.js` - Application entry point
- `package.json` - Dependencies and scripts
- `jest.config.js` - Test configuration
- `tests/README.md` - Testing documentation