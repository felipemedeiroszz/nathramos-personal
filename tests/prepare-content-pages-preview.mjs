// Render the actual editor with isolated actions. No remote records are changed.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const out = resolve("artifacts/content-pages-qa");
await mkdir(out, { recursive: true });
await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';
    import pt from './src/messages/pt-BR.json';import en from './src/messages/en-US.json';
    import {AdminContentPagesClient} from './src/components/admin/content/AdminContentPagesClient';
    import {DEFAULT_CONTENT_PAGES} from './src/lib/content/contentPages';
    const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';
    const empty={title_pt:'',title_en:'',subtitle_pt:'',subtitle_en:'',text_pt:'',text_en:'',image_url:'',button_label_pt:'',button_label_en:'',button_url:''};
    window.qa={fail:false,calls:0,pages:Object.values(DEFAULT_CONTENT_PAGES).map(p=>({slug:p.slug,title_pt:p.titlePt,title_en:p.titleEn,subtitle_pt:p.subtitlePt,subtitle_en:p.subtitleEn,image_url:'',cta_label_pt:'',cta_label_en:'',cta_url:'',blocks:p.blocks.map(b=>({...empty,...b})),is_active:true,isCustomized:false,updated_at:null}))};
    function Demo(){const[pages,setPages]=React.useState(window.qa.pages),[tick,setTick]=React.useState(0);
      React.useEffect(()=>{const refresh=()=>{setPages([...window.qa.pages]);setTick(t=>t+1)};window.addEventListener('fixture-refresh',refresh);return()=>window.removeEventListener('fixture-refresh',refresh)},[]);
      return <NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><div className="admin-shell" style={{minHeight:'100vh'}}>
        <div style={{padding:'9px 24px',background:'#f4ce4710',fontSize:10,color:'#b4a66f',display:'flex',gap:16,flexWrap:'wrap'}}><span>TESTE ISOLADO • Nenhuma publicação real</span><button onClick={()=>{window.qa.fail=!window.qa.fail;setTick(t=>t+1)}}>Falha de rede: {window.qa.fail?'ligada':'desligada'}</button><button onClick={()=>{window.qa.pages=window.qa.pages.map(p=>p.slug==='termos'?{...p,title_pt:'Título da outra sessão',updated_at:new Date().toISOString()}:p);window.dispatchEvent(new Event('fixture-refresh'))}}>Simular outra sessão</button><output aria-label="Publicações do teste">{window.qa.calls}</output></div>
        <main style={{maxWidth:1200,padding:'30px clamp(16px,3vw,36px)',margin:'0 auto'}}><div className="admin-module-context" style={{fontSize:9,color:'#8b8d98',letterSpacing:2,marginBottom:12}}>GESTÃO DA PLATAFORMA</div><h1 style={{fontSize:28,fontWeight:600,letterSpacing:'-1px'}}>Páginas do site</h1><p style={{fontSize:12,color:'#9698a1',margin:'9px 0 28px'}}>Crie uma experiência clara, do primeiro título à última resposta.</p><AdminContentPagesClient pages={pages}/></main></div></NextIntlClientProvider>}
    createRoot(document.getElementById('root')).render(<Demo/>);`,
  },
  bundle: true,
  jsx: "automatic",
  outfile: resolve(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "content-fixture",
      setup(b) {
        b.onResolve(
          { filter: /^(next\/(link|navigation)|@\/app\/actions\/content)$/ },
          (a) => ({ path: a.path, namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => {
          const contents =
            a.path === "next/link"
              ? `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`
              : a.path === "next/navigation"
                ? `const router={refresh:()=>window.dispatchEvent(new Event('fixture-refresh'))};export const useRouter=()=>router;export const useParams=()=>({locale:new URLSearchParams(location.search).get('locale')||'pt-BR'});`
                : `export async function upsertContentPageAction(input){window.qa.calls++;await new Promise(r=>setTimeout(r,800));if(window.qa.fail)throw Error('network');const row={...input,updated_at:new Date().toISOString()};window.qa.pages=window.qa.pages.map(p=>p.slug===input.slug?{...p,...row,isCustomized:true}:p);return {success:true,data:row}};export async function uploadProductImageAction(){return {success:false,message:'Upload desativado no teste isolado.'}};`;
          return { contents, loader: "tsx", resolveDir: process.cwd() };
        });
      },
    },
  ],
});
execFileSync(
  process.execPath,
  [
    "node_modules/tailwindcss/lib/cli.js",
    "-i",
    "src/app/globals.css",
    "-o",
    resolve(out, "base.css"),
    "--minify",
  ],
  { stdio: "pipe" },
);
await writeFile(
  resolve(out, "admin.css"),
  await readFile("src/app/[locale]/admin/admin.css"),
);
await writeFile(
  resolve(out, "index.html"),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="admin.css"><link rel="stylesheet" href="app.css"></head><body style="font-family:Arial"><div id="root"></div><script src="app.js"></script></body></html>',
);
await writeFile(
  resolve(out, "server.mjs"),
  `import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';const root=${JSON.stringify(out)};const files={'/':'index.html','/app.js':'app.js','/app.css':'app.css','/base.css':'base.css','/admin.css':'admin.css'};createServer(async(req,res)=>{const path=files[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(await readFile(resolve(root,path)));}catch{res.writeHead(500);res.end();}}).listen(3101,'localhost',()=>console.log('CONTENT_FIXTURE_READY'));`,
);
console.log(out);
