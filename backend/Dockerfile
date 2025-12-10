# backend/Dockerfile
# Security-hardened container for Cloud Run

# 1. Use an official Node.js runtime (Alpine for smaller attack surface)
FROM node:18-alpine

# 2. Create non-root user for security (CIS Docker Benchmark 4.1)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy package files and install dependencies
# Use --chown to avoid running as root later
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# 5. Copy the rest of the backend code
COPY --chown=nodejs:nodejs . .

# 6. Build the TypeScript code (outputs to /dist)
RUN npm run build

# 7. Remove dev dependencies and source files to reduce attack surface
RUN rm -rf src/ *.ts tsconfig.json

# 8. Switch to non-root user before running
USER nodejs

# 9. Expose the port Google expects (8080)
EXPOSE 8080

# 10. Set production environment
ENV NODE_ENV=production

# 11. Start the app
CMD ["node", "dist/server.js"]
