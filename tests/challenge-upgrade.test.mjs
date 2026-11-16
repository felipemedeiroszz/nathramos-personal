import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./database.mjs";

test("migração de integridade preserva registros da instalação anterior e corrige o reenvio", async () => {
  const db = await testDatabase({ through: "000056_challenges.sql" });
  try {
    await db.exec(`
      drop index challenge_activities_daily_unique;
      alter table challenge_activities drop column activity_day;
      alter table challenges drop column score_revision;
      alter table challenge_activities add unique(participant_id,goal_id,activity_date);
    `);
    const user = "00000000-0000-4000-8000-000000000001",
      admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
    await db.query(
      "insert into auth.users(id,email) values($1,'upgrade@example.test')",
      [user],
    );
    await db.query(
      "insert into subscriptions(user_id,plan_id,status,unit_amount_cents) values($1,(select id from plans limit 1),'active',100)",
      [user],
    );
    const challenge = (
      await db.query(
        "insert into challenges(title,start_date,end_date,status,created_by) values('Desafio anterior',now()-interval '1 day',now()+interval '5 days','published',$1) returning id",
        [admin],
      )
    ).rows[0].id;
    const goal = (
      await db.query(
        "insert into challenge_goals(challenge_id,title,goal_type,target_value,unit,frequency,points,max_points) values($1,'Água','water',3,'litros','daily',5,10) returning id",
        [challenge],
      )
    ).rows[0].id;
    const participant = (
      await db.query(
        "insert into challenge_participants(challenge_id,user_id,joined_at,accepted_rules,accepted_version,status) values($1,$2,now()-interval '1 hour','Regras anteriores',1,'active') returning id",
        [challenge, user],
      )
    ).rows[0].id;
    const activity = (
      await db.query(
        "insert into challenge_activities(challenge_id,participant_id,goal_id,recorded_value,activity_date,period_key,request_id,validation_status) values($1,$2,$3,1,now(),(now() at time zone 'America/Sao_Paulo')::date,gen_random_uuid(),'rejected') returning id,activity_date",
        [challenge, participant, goal],
      )
    ).rows[0];
    await db.exec(
      await readFile(
        "supabase/migrations/000057_challenge_integrity.sql",
        "utf8",
      ),
    );
    const stored = (
      await db.query(
        "select id,activity_day,validation_status from challenge_activities where id=$1",
        [activity.id],
      )
    ).rows[0];
    assert.equal(stored.id, activity.id);
    assert.equal(stored.validation_status, "rejected");
    assert.ok(stored.activity_day);
    const request = "00000000-0000-4000-8000-000000000099";
    const input = {
      challenge_id: challenge,
      goal_id: goal,
      recorded_value: 3,
      activity_date: activity.activity_date.toISOString(),
      proof_image: null,
      notes: "Correção",
      request_id: request,
    };
    const replacement = (
      await db.query("select challenge_mutate($1,'activity',$2) id", [
        user,
        JSON.stringify(input),
      ])
    ).rows[0].id;
    assert.notEqual(replacement, activity.id);
    await db.query("select challenge_mutate($1,'review',$2)", [
      admin,
      JSON.stringify({
        challenge_id: challenge,
        activity_id: replacement,
        approved: true,
        reason: "Conferido",
      }),
    ]);
    assert.equal(
      Number(
        (
          await db.query(
            "select total_points from challenge_participants where id=$1",
            [participant],
          )
        ).rows[0].total_points,
      ),
      5,
    );
  } finally {
    await db.close();
  }
});
