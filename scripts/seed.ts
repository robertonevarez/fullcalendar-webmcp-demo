import { closePool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';

async function main() {
  const force = !process.argv.includes('--no-force');
  const result = await seedDatabase(force);
  console.log(result);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
