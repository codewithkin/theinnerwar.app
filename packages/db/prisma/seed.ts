import "varlock/auto-load";

import { createPrismaClient } from "../src/index";
import { books, paths } from "./seed-data";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed");

const db = createPrismaClient({ DATABASE_URL: databaseUrl });

async function main() {
  for (const book of books) {
    await db.book.upsert({ where: { slug: book.slug }, create: book, update: book });
  }

  for (const { bookSlug, chapters, days, promises, ...path } of paths) {
    const book = await db.book.findUniqueOrThrow({ where: { slug: bookSlug } });
    const data = { ...path, promises: [...promises], bookId: book.id };
    const saved = await db.path.upsert({ where: { slug: path.slug }, create: data, update: data });

    for (const chapter of chapters) {
      await db.chapter.upsert({
        where: { pathId_number: { pathId: saved.id, number: chapter.number } },
        create: { ...chapter, pathId: saved.id },
        update: chapter,
      });
    }

    for (const { missionSteps, smallerMissions, ...day } of days) {
      const chapter = await db.chapter.findFirstOrThrow({
        where: { pathId: saved.id, startDay: { lte: day.dayNumber }, endDay: { gte: day.dayNumber } },
      });
      const dayData = {
        ...day,
        missionSteps: [...missionSteps],
        smallerMissions: [...smallerMissions],
        chapterId: chapter.id,
      };
      await db.pathDay.upsert({
        where: { pathId_dayNumber: { pathId: saved.id, dayNumber: day.dayNumber } },
        create: { ...dayData, pathId: saved.id },
        update: dayData,
      });
    }
  }

  console.log(`Seeded ${books.length} books and ${paths.length} paths.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
