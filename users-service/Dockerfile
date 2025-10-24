# users-service/Dockerfile
FROM node:20-bullseye-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install runtime utilities (pg_isready) and OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first (cache)
COPY package*.json ./

# Install all dependencies (prisma CLI needs dev deps)
RUN npm install

# Copy app source & prisma schema
COPY . .

# Generate Prisma client (needs prisma dev dependency)
RUN npx prisma generate

EXPOSE 4101

# Wait for DB, run migrations, then start server
CMD ["sh", "-c", "until pg_isready -h users-db -U postgres -d users_db; do echo waiting for users-db; sleep 1; done; npx prisma migrate deploy && node server.js"]
