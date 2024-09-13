# Use the official Node.js LTS version as the base image
FROM node:latest

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Install tsx globally
RUN npm install -g tsx

# Copy the rest of the application code
COPY . .

# Expose necessary ports (if any)
# None needed for this bot

# Start the bot using tsx
CMD ["tsx", "index.ts"]

