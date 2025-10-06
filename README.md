# SkillBridge

prisma  
cd ~/Desktop/cloudassignment/SkillBridge/users-service && npx prisma migrate deploy
cd ~/Desktop/cloudassignment/SkillBridge/availability-service && npx prisma migrate deploy
cd ~/Desktop/cloudassignment/SkillBridge/booking-service && npx prisma migrate deploy
cd ~/Desktop/cloudassignment/SkillBridge/messaging-service && npx prisma migrate deploy
 
cd ~/Desktop/cloudassignment/SkillBridge && \
( cd users-service       && DATABASE_URL="postgresql://postgres:postgres@localhost:5436/users_db?schema=public"          npx prisma migrate deploy ) && \
( cd availability-service&& DATABASE_URL="postgresql://postgres:postgres@localhost:5433/availability_db?schema=public"  npx prisma migrate deploy ) && \
( cd booking-service     && DATABASE_URL="postgresql://postgres:postgres@localhost:5434/booking_db?schema=public"       npx prisma migrate deploy ) && \
( cd messaging-service   && DATABASE_URL="postgresql://postgres:postgres@localhost:5435/messaging_db?schema=public"     npx prisma migrate deploy ) && \
( cd code-review-service && DATABASE_URL="postgresql://postgres:postgres@localhost:5437/code_review_db?schema=public"   npx prisma migrate deploy )

 
 
  docker
  docker compose up -d
