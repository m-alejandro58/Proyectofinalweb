const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("USERS:", users.map(u => ({ username: u.username, name: u.name, role: u.role, password: u.password })));
}
main().finally(() => prisma.$disconnect());
