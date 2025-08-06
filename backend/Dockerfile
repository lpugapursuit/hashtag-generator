# Use the official Node.js runtime as the base image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["node", "app.js"] 