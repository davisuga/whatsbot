# Use the official Node.js LTS version as the base image
FROM node:16

# Install necessary dependencies including Chromium
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    chromium \
    libx11-dev \
    libxkbfile-dev \
    libsecret-1-dev \
    xvfb \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libdrm2 \
    libxss1 \
    libgbm1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables to skip Chromium download and specify executable path
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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

# Start the bot using tsx
CMD ["tsx", "index.ts"]
