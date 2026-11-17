import { test } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
test("conversation lifecycle preserves archived messages, authorizes deletion and audits atomically", async () => {
  const db = await testDatabase();
  const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
    coach = "80000000-0000-4000-8000-000000000002",
    student = "80000000-0000-4000-8000-000000000003",
    other = "80000000-0000-4000-8000-000000000004";
  try {
    await db.query(
      `insert into auth.users(id,email) values($1,'coach-lifecycle@example.test'),($2,'student-lifecycle@example.test'),($3,'other-lifecycle@example.test')`,
      [coach, student, other],
    );
    await db.query(`update profiles set role='coach' where id in ($1,$2)`, [
      coach,
      other,
    ]);
    const room = (
      await db.query(
        `insert into mentorship_rooms(user_id,coach_id,unread_count_user,unread_count_coach) values($1,$2,2,3) on conflict (user_id) do update set coach_id=excluded.coach_id,unread_count_user=2,unread_count_coach=3 returning id`,
        [student, coach],
      )
    ).rows[0].id;
    await db.query(
      `insert into chat_messages(room_id,sender_id,sender_type,content) values($1,$2,'user','Mensagem de teste')`,
      [room, student],
    );
    const manage = (actor, operation) =>
      db.query("select manage_mentorship_conversation($1,$2,$3)", [
        actor,
        room,
        operation,
      ]);
    await assert.rejects(() => manage(student, "archive"), /Acesso negado/);
    await assert.rejects(() => manage(other, "archive"), /indisponível/);
    await assert.rejects(() => manage(coach, "delete"), /Acesso negado/);
    await assert.rejects(() => manage(admin, "invalid"), /inválida/);
    await manage(coach, "archive");
    assert.equal(
      (
        await db.query("select is_active from mentorship_rooms where id=$1", [
          room,
        ])
      ).rows[0].is_active,
      false,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from chat_messages where room_id=$1 and not is_deleted",
          [room],
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      () =>
        db.query(
          `insert into chat_messages(room_id,sender_type,content) values($1,'user','Must fail')`,
          [room],
        ),
      /arquivada/,
    );
    await manage(coach, "reopen");
    await db.query(
      `insert into chat_messages(room_id,sender_type,content) values($1,'coach','Resposta')`,
      [room],
    );
    await manage(admin, "delete");
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from chat_messages where room_id=$1 and not is_deleted",
          [room],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from chat_messages where room_id=$1 and is_deleted and deleted_at is not null",
          [room],
        )
      ).rows[0].n,
      2,
    );
    const state = (
      await db.query(
        "select is_active,unread_count_user,unread_count_coach,last_message_at from mentorship_rooms where id=$1",
        [room],
      )
    ).rows[0];
    assert.deepEqual(state, {
      is_active: false,
      unread_count_user: 0,
      unread_count_coach: 0,
      last_message_at: null,
    });
    assert.equal(
      (
        await db.query(
          `select count(*)::int as n from audit_logs where entity_id=$1 and action like 'mentorship_room.%'`,
          [room],
        )
      ).rows[0].n,
      3,
    );
    await manage(admin, "reopen");
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from chat_messages where room_id=$1 and not is_deleted",
          [room],
        )
      ).rows[0].n,
      0,
    );
    const grants = (
      await db.query(
        `select has_function_privilege('authenticated','manage_mentorship_conversation(uuid,uuid,text)','EXECUTE') as allowed`,
      )
    ).rows[0];
    assert.equal(grants.allowed, false);
    // An audit failure rolls back the archive as well.
    await db.exec(
      `create function fail_conversation_audit() returns trigger language plpgsql as $$begin if new.action='mentorship_room.archive' then raise exception 'audit unavailable'; end if; return new; end$$; create trigger fail_conversation_audit before insert on audit_logs for each row execute function fail_conversation_audit();`,
    );
    await assert.rejects(() => manage(admin, "archive"), /audit unavailable/);
    assert.equal(
      (
        await db.query("select is_active from mentorship_rooms where id=$1", [
          room,
        ])
      ).rows[0].is_active,
      true,
    );
  } finally {
    await db.close();
  }
});
