const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.count();
  const sales = await prisma.sale.count();
  const products = await prisma.product.count();
  const lastSale = await prisma.sale.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log(`Users: ${users}, Sales: ${sales}, Products: ${products}`);
  console.log(`Last Sale Date: ${lastSale ? lastSale.createdAt : 'None'}`);
}
main().finally(() => prisma.$disconnect());
