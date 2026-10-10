// Release gate: prove that Vite emitted a fully self-contained, relative-path
// static website that can be hosted on GitHub Pages or any ordinary HTTP server.
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const dist=resolve('dist');
const htmlFile=resolve(dist,'index.html');
function fail(message){throw new Error('Release verification failed: '+message)}
function check(condition,message){if(!condition)fail(message)}
check(existsSync(htmlFile),'dist/index.html missing — run npm run build first');
const html=readFileSync(htmlFile,'utf8');
check(/<html[^>]*lang="ar"[^>]*dir="rtl"/.test(html),'Arabic right-to-left markup missing');
for(const id of ['game','levelValue','waveValue','lifeValue','goldValue','arrowBtn','cannonBtn','windBtn','modalBtn']){
 check(html.includes('id="'+id+'"'),'game control '+id+' missing from generated HTML');
}
check(!/src=["'](?:https?:)?\/\//i.test(html),'remote scripts detected');
check(!/href=["'](?:https?:)?\/\//i.test(html),'remote styles detected');
check(!/src=["']\/(?!\/)/i.test(html),'root-absolute source URLs break subfolder deployment');
check(!/href=["']\/(?!\/)/i.test(html),'root-absolute stylesheet URLs break subfolder deployment');
check(!/src=["'][^"']*src\/main\.js/i.test(html),'source module left unresolved');
const assets=[];
for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)){
 const link=match[1];
 if(link.startsWith('data:'))continue;
 check(link.startsWith('./assets/')||link.startsWith('assets/'),'unexpected asset path '+link);
 const abs=resolve(dist,link);
 check(abs.startsWith(dist+'/'),'unsafe asset reference '+link);
 check(existsSync(abs),'referenced file missing: '+link);
 check(statSync(abs).size>0,'empty asset: '+link);
 assets.push({name:link,bytes:statSync(abs).size});
}
check(assets.some(a=>extname(a.name)==='.js'),'compiled JavaScript missing');
check(assets.some(a=>extname(a.name)==='.css'),'compiled CSS missing');
const js=assets.filter(a=>extname(a.name)==='.js').reduce((s,a)=>s+a.bytes,0);
const css=assets.filter(a=>extname(a.name)==='.css').reduce((s,a)=>s+a.bytes,0);
check(js<200_000,'JavaScript exceeds 200 kB budget');
check(css<100_000,'CSS exceeds 100 kB budget');
const unexpected=readdirSync(dist).filter(x=>x==='node_modules'||x==='package.json'||x==='.env');
check(unexpected.length===0,'development-only files leaked: '+unexpected.join(','));
console.log('PASS: static, portable, offline-capable production build');
console.log(JSON.stringify({htmlBytes:statSync(htmlFile).size,assets,jsBytes:js,cssBytes:css},null,2));
