# booking-service/Dockerfile
FROM node:20-bullseye-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4103

CMD ["sh", "-c", "until pg_isready -h booking-db -U postgres -d booking_db; do echo waiting for booking-db; sleep 1; done; npx prisma migrate deploy && node server.js"]
