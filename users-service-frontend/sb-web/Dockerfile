# users-service-frontend/sb-web/Dockerfile
# Stage 1: build
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy and build
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
