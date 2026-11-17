import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
function fixture(
  actor,
  pages = [[{ unread_count_user: 3, unread_count_coach: 7 }]],
  fail = false,
) {
  const filters = [];
  let batch = 0;
  const query = {
    select: () => query,
    eq: (...args) => {
      filters.push(args);
      return query;
    },
    gt: () => query,
    order: () => query,
    range: () =>
      Promise.resolve({
        data: pages[batch++] ?? [],
        error: fail ? { code: "failure" } : null,
      }),
  };
  const service = loadTs("src/services/MentorshipUnreadService.ts", {
    "server-only": {},
    "@/lib/auth/platform": {
      requirePlatformUser: async () => actor,
      AccessError: class extends Error {},
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({ from: () => query }),
    },
  });
  return { service, filters };
}
test("student unread count is restricted to the signed-in student and active rooms", async () => {
  const { service, filters } = fixture({
    userId: "student-1",
    role: "student",
    staff: false,
  });
  assert.equal(await service.mentorshipUnreadCount("student"), 3);
  assert.deepEqual(filters, [
    ["is_active", true],
    ["user_id", "student-1"],
  ]);
});
test("admin receives the staff count and coach only receives assigned room counts", async () => {
  const admin = fixture({ userId: "admin", role: "admin", staff: true });
  assert.equal(await admin.service.mentorshipUnreadCount("admin"), 7);
  assert.deepEqual(admin.filters, [["is_active", true]]);
  const coach = fixture({ userId: "coach", role: "coach", staff: true });
  assert.equal(await coach.service.mentorshipUnreadCount("admin"), 7);
  assert.deepEqual(coach.filters, [
    ["is_active", true],
    ["coach_id", "coach"],
  ]);
});
test("students cannot request staff counts", async () => {
  const f = fixture({ userId: "student", role: "student", staff: false });
  await assert.rejects(() => f.service.mentorshipUnreadCount("admin"));
  assert.equal(f.filters.length, 0);
});
test("counter reads every page instead of silently limiting large inboxes", async () => {
  const f = fixture({ userId: "admin", role: "admin", staff: true }, [
    Array.from({ length: 1000 }, () => ({ unread_count_coach: 2 })),
    [{ unread_count_coach: 4 }],
  ]);
  assert.equal(await f.service.mentorshipUnreadCount("admin"), 2004);
});
test("database failures are not reported as an empty inbox", async () => {
  const f = fixture({ userId: "admin", role: "admin", staff: true }, [], true);
  await assert.rejects(
    () => f.service.mentorshipUnreadCount("admin"),
    /consultar/,
  );
});
