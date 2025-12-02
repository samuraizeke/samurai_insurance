# backend/Dockerfile

# 1. Use an official Node.js runtime
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the backend code
COPY . .

# 5. Build the TypeScript code (outputs to /dist)
RUN npm run build

# 6. Expose the port Google expects (8080)
EXPOSE 8080

# 7. Start the app
CMD ["node", "dist/server.js"]