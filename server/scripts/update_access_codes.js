const prisma = require('../src/prisma');

async function main() {
  const events = await prisma.event.findMany();
  console.log(`Found ${events.length} events.`);

  for (const event of events) {
    if (!event.accessCode) {
      // Generate clean 6-character secure code e.g. SEC-847291
      const randomCode = `SEC-${Math.floor(100000 + Math.random() * 900000)}`;
      await prisma.event.update({
        where: { id: event.id },
        data: { accessCode: randomCode },
      });
      console.log(`Updated event "${event.title}" with accessCode: ${randomCode}`);
    } else {
      console.log(`Event "${event.title}" already has accessCode: ${event.accessCode}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
