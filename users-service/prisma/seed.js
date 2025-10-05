
// users-service/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      {
        email: 'mentor1@example.com',
        name: 'Mentor One',
        role: 'MENTOR',
        seniority: 'SENIOR',
        rate: 30,
        currency: 'USD',
        timezone: 'Asia/Colombo',
        domains: ['backend', 'devops'],
        badges: ['interview-coach'],
        packages: [
          { name: 'Resume + Mock Interview', price: 40 },
          { name: 'System Design Deep Dive', price: 60 }
        ]
      },
      {
        email: 'mentor2@example.com',
        name: 'Mentor Two',
        role: 'MENTOR',
        seniority: 'STAFF',
        rate: 45,
        currency: 'USD',
        timezone: 'Asia/Colombo',
        domains: ['frontend', 'data'],
        badges: ['system-design-specialist'],
        packages: [
          { name: 'React Refactor + Code Review', price: 35 }
        ]
      },
      {
        email: 'mentee1@example.com',
        name: 'Mentee One',
        role: 'MENTEE',
        timezone: 'Asia/Colombo',
        domains: ['backend'],
        badges: []
      }
    ]
  });
  console.log('Seeded sample users');
}

main().finally(() => prisma.$disconnect());
