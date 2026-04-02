const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({ where: { username: 'admin' }, data: { password: '9975' } });
  console.log('Password updated to 9975');
}
main().finally(() => prisma.$disconnect());
