import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
test("posts e stories persistem a música e permitem removê-la sem alterar conteúdo", async () => {
  const db = await testDatabase();
  try {
    const mutate = async (action, input) =>
      (
        await db.query("select community_mutate($1,$2,$3) id", [
          admin,
          action,
          JSON.stringify(input),
        ])
      ).rows[0].id;
    const id = await mutate("post", {
      request_id: crypto.randomUUID(),
      body: "Treino com música",
      images: [],
      music_track_id: 3135556,
    });
    const feed = (await db.query("select community_read($1) data", [admin]))
      .rows[0].data;
    assert.equal(feed.items.find((p) => p.id === id).music_track_id, 3135556);
    await mutate("edit", {
      id,
      version: 1,
      body: "Treino atualizado",
      images: [],
    });
    assert.equal(
      (
        await db.query(
          "select music_track_id from community_posts where id=$1",
          [id],
        )
      ).rows[0].music_track_id,
      3135556,
    );
    await mutate("edit", {
      id,
      version: 2,
      body: "Treino atualizado",
      images: [],
      music_track_id: null,
    });
    assert.equal(
      (
        await db.query(
          "select music_track_id from community_posts where id=$1",
          [id],
        )
      ).rows[0].music_track_id,
      null,
    );
    const story = (
      await db.query("select community_story_mutate($1,'create',$2) id", [
        admin,
        JSON.stringify({
          request_id: crypto.randomUUID(),
          caption: "💪",
          music_track_id: 3135556,
        }),
      ])
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select community_story_read($1) data", [admin])
      ).rows[0].data.find((s) => s.id === story).music_track_id,
      3135556,
    );
    await assert.rejects(
      mutate("post", {
        request_id: crypto.randomUUID(),
        body: "Inválido",
        images: [],
        music_track_id: -1,
      }),
    );
  } finally {
    await db.close();
  }
});
test("Deezer normaliza metadados, restringe hosts e mantém URL canônica de atribuição", () => {
  const { normalizeTrack } = loadTs("src/services/DeezerService.ts", {
    "server-only": {},
    "@/lib/auth/platform": {},
  });
  const raw = {
    id: 123,
    title: "Treino",
    artist: { name: "Artista" },
    album: { cover_medium: "https://cdn-images.dzcdn.net/images/cover/a.jpg" },
    preview: "https://cdnt-preview.dzcdn.net/a.mp3",
    link: "https://evil.example",
  };
  const track = normalizeTrack(raw);
  assert.equal(track.link, "https://www.deezer.com/track/123");
  assert.ok(track.preview);
  assert.equal(
    normalizeTrack({ ...raw, preview: "http://cdnt-preview.dzcdn.net/audio" })
      .preview,
    null,
  );
  assert.equal(
    normalizeTrack({ ...raw, preview: "https://dzcdn.net.evil.example/audio" })
      .preview,
    null,
  );
  assert.equal(normalizeTrack({ ...raw, id: -1 }), null);
});
test("busca de música exige autenticação e valida consulta antes de acessar Deezer", async () => {
  let allowed = false,
    calls = 0;
  class AccessError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const { GET } = loadTs("src/app/api/community/music/route.ts", {
    "@/services/CommunityService": {
      communityActor: async () => {
        if (!allowed) throw new AccessError("Entre", 401);
        return { userId: "student" };
      },
    },
    "@/lib/auth/platform": { AccessError },
    "@/services/DeezerService": {
      searchDeezer: async () => {
        calls++;
        return [];
      },
      getDeezerTrack: async () => {
        calls++;
        return {};
      },
    },
  });
  const request = (query) => ({
    nextUrl: new URL("http://localhost/api/community/music?" + query),
  });
  assert.equal((await GET(request("q=treino"))).status, 401);
  assert.equal(calls, 0);
  allowed = true;
  assert.equal((await GET(request("q=a"))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await GET(request("track=https://evil.example"))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await GET(request("q=treino"))).status, 200);
  assert.equal(calls, 1);
});

test("favoritas persistem por usuário, não duplicam e não guardam endereços de áudio", async () => {
  const db = await testDatabase();
  try {
    const other = "00000000-0000-4000-8000-000000000099";
    await db.query(
      "insert into auth.users(id,email) values($1,'favorite-test@example.test')",
      [other],
    );
    await db.query("update profiles set role='admin' where id=$1", [other]);
    const call = async (actor, action, track = {}) =>
      (
        await db.query("select community_music_favorite($1,$2,$3) data", [
          actor,
          action,
          JSON.stringify(track),
        ])
      ).rows[0].data;
    const track = {
      id: 3135556,
      title: "Treino",
      artist: "Artista",
      preview: "https://cdnt-preview.dzcdn.net/signed",
    };
    assert.equal((await call(admin, "save", track)).length, 1);
    assert.equal((await call(admin, "save", track)).length, 1);
    assert.equal((await call(admin, "read"))[0].preview, undefined);
    assert.deepEqual(await call(other, "read"), []);
    await call(other, "remove", { id: 3135556 });
    assert.equal((await call(admin, "read")).length, 1);
    assert.deepEqual(await call(admin, "remove", { id: 3135556 }), []);
    for (let id = 1; id <= 50; id++)
      await call(admin, "save", { id, title: "Faixa " + id });
    await assert.rejects(call(admin, "save", { id: 51, title: "Limite" }));
    assert.equal(
      (
        await db.query(
          "select has_function_privilege('authenticated','community_music_favorite(uuid,text,jsonb)','execute') allowed",
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});

test('API de favoritas usa identidade autenticada e metadados canônicos; origem externa é recusada',async()=>{
 class AccessError extends Error{constructor(message,status){super(message);this.status=status;}}
 const calls=[];let allowed=true;
 const {POST,GET}=loadTs('src/app/api/community/music/favorites/route.ts',{
  '@/services/CommunityService':{communityActor:async()=>{if(!allowed)throw new AccessError('Entre',401);return {userId:'actor'};}},
  '@/lib/auth/platform':{AccessError},
  '@/services/DeezerService':{getDeezerTrack:async(id)=>({id,title:'Canonical',artist:'Artist',preview:'https://cdnt-preview.dzcdn.net/test'})},
  '@/lib/supabase/server':{createServiceClientSSR:async()=>({rpc:async(name,args)=>{calls.push(args);return {data:[],error:null};}})}
 });
 const req=(origin)=>{const r=new Request('http://localhost/api/community/music/favorites',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'save',id:123,user_id:'victim',title:'forged'})});r.nextUrl=new URL(r.url);return r;};
 assert.equal((await POST(req('https://evil.example'))).status,403);assert.equal(calls.length,0);
 assert.equal((await POST(req('http://localhost'))).status,200);assert.equal(calls[0].p_actor,'actor');assert.equal(calls[0].p_track.title,'Canonical');
 allowed=false;assert.equal((await GET()).status,401);assert.equal(calls.length,1);
});
