import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (let i = 0; i < 50; i++) {
    await prisma.post.create({
      data: {
        title: `Post ${i}`,
        content: `Post ${i} body`.repeat(50),
        published: true,
      },
    });
  }

  await prisma.$disconnect();
}

main();
