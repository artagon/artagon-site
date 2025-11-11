#!/usr/bin/env node
import { promises as fs } from 'fs'; import path from 'path'; import crypto from 'crypto'; import * as cheerio from 'cheerio';
const distDir='dist';
const sha = (buf)=>crypto.createHash('sha256').update(buf).digest('base64');
async function walk(dir){ const out=[]; for(const e of await fs.readdir(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...await walk(p)); else if(p.endsWith('.html')) out.push(p);} return out; }
function buildPolicy(hashes, extras={}){
  const sHashes=[...hashes].map(h=>`'sha256-${h}'`); const directives={
    "default-src":["'self'"],"img-src":["'self'","data:"],"style-src":["'self'","'unsafe-inline'"],
    "font-src":["'self'","data:"],"connect-src":["'self'"],"object-src":["'none'"],"base-uri":["'none'"],"frame-ancestors":["'none'"],
    "script-src":["'self'",...sHashes]
  };
  for(const [k,v] of Object.entries(extras)){ directives[k]=[...(directives[k]||[]), ...v]; }
  return Object.entries(directives).map(([k,v])=>`${k} ${v.join(' ')}`).join('; ');
}
async function processHtml(fp){
  const html=await fs.readFile(fp,'utf8'); const $=cheerio.load(html);
  const inline=$('script:not([src])').toArray(); const hashes=new Set();
  for(const el of inline){ const code=$(el).html()||''; hashes.add(sha(Buffer.from(code))); }
  const extras={}; const hasDoc=$('script[src*="docsearch"]').length||$('link[href*="docsearch"]').length;
  if(hasDoc){ extras['script-src']=["https://cdn.jsdelivr.net"]; extras['style-src']=["https://cdn.jsdelivr.net"]; extras['connect-src']=["https://*.algolia.net","https://*.algolianet.com"]; }
  const policy=buildPolicy(hashes, extras); const existing=$('meta[http-equiv="Content-Security-Policy"]');
  if(existing.length) existing.attr('content',policy); else $('head').prepend(`<meta http-equiv="Content-Security-Policy" content="${policy}">`);
  await fs.writeFile(fp, $.html(),'utf8'); return hashes.size;
}
(async()=>{ const files=await walk(distDir); let count=0; for(const f of files) count+=await processHtml(f); console.log(`[CSP] files=${files.length} inline-hash-count=${count}`); })().catch(e=>{ console.error(e); process.exit(1); });
