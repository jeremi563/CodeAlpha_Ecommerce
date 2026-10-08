import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'ReplaceWithAdminPassword123!';
const name = process.argv[4] || 'Store Admin';

const main = async () => {
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin account ready: ${admin.email} (${admin.role})`);
};

main()
  .catch((error) => {
    console.error('Failed to create admin account:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
