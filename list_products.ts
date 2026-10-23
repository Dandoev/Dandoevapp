import { prisma } from './src/lib/prisma';

async function main() {
  const bikes = await prisma.bike.findMany({
    where: {
      availability: {
        in: ['in_stock', 'pre_order']
      }
    }
  });

  const batteries = await prisma.accessory.findMany({
    where: {
      category: 'battery'
    }
  });

  const chargers = await prisma.accessory.findMany({
    where: {
      category: 'charger'
    }
  });

  console.log('--- BIKES ---');
  bikes.forEach(b => console.log(`- ${b.name} (₦${b.price}) [${b.availability}]`));
  
  console.log('\n--- BATTERIES ---');
  batteries.forEach(b => console.log(`- ${b.name} (₦${b.price})`));
  
  console.log('\n--- CHARGERS ---');
  chargers.forEach(c => console.log(`- ${c.name} (₦${c.price})`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
