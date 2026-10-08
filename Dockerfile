FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --silent

# Copy app source
COPY . .

# Set environment and expose port
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "app.js"]
