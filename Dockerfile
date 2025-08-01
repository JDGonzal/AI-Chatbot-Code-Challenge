# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in the container
WORKDIR /app

# Install pnpm globally for faster package management
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (if available)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check to ensure the container is running properly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: process.env.PORT || 3000, timeout: 2000 }; const request = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); request.on('error', () => process.exit(1)); request.end();"

# Start the application
CMD ["pnpm", "start"]