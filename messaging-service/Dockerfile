# messaging-service/Dockerfile
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

EXPOSE 4104

CMD ["sh", "-c", "until pg_isready -h messaging-db -U postgres -d messaging_db; do echo waiting for messaging-db; sleep 1; done; npx prisma migrate deploy && node server.js"]
