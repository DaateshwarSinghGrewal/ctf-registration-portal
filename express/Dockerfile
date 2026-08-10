FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies needed for the TypeScript build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project (runs tsc and copies migrations as defined in package.json)
RUN npm run build

# Expose the port your Express API runs on
EXPOSE 3000

# Start the application using the built JavaScript files
CMD ["npm", "start"]
