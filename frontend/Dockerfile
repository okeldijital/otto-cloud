FROM node:20-slim

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose port (default Vite port)
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
