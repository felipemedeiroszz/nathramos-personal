/** Bounded workers avoid one request per row without overwhelming the database. */
export async function runLimited<T>(
  items: T[],
  limit: number,
  visit: (item: T) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, limit), items.length) },
      async () => {
        while (next < items.length) {
          const index = next++;
          await visit(items[index]);
        }
      },
    ),
  );
}
