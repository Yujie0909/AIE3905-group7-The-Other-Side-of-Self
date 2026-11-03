// Isolated protocol fixtures + an embedded real PostgreSQL engine. No live cloud/API proof.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {postgresStore} from '../cloudbase/postgres.mjs';
export async function fixtureDatabase(path){
 const sql=new PGlite(path);await sql.waitReady;await sql.exec(readFileSync(new URL('../cloudbase/migrations/0001_core.sql',import.meta.url),'utf8'));
 let tail=Promise.resolve();
 const lock=async()=>{let release;const next=new Promise(r=>release=r),previous=tail;tail=previous.then(()=>next);await previous;return release};
 const query=async(...args)=>{const r=await sql.query(...args);return {...r,rowCount:r.affectedRows||r.rows.length}};
 const pool={async connect(){const unlock=await lock();return {query,release:unlock}},async query(...args){const unlock=await lock();try{return await query(...args)}finally{unlock()}},async end(){await tail;await sql.close()}};
 const store=postgresStore(pool);return {sql,store,pool};
}
export const cloudEnv={ALLOWED_ORIGINS:'https://site.example',CLOUDBASE_DB_TYPE:'postgresql',DATABASE_URL:'postgresql://fixture:fixture@db.invalid/fixture',DEEPSEEK_BASE_URL:'https://text.example/v1',DEEPSEEK_MODEL:'fixture-text',DEEPSEEK_API_KEY:'fixture-not-a-secret',ARK_BASE_URL:'https://images-api.example/v3',ARK_IMAGE_MODEL:'fixture-image',ARK_API_KEY:'fixture-not-a-secret',ARK_IMAGE_HOSTS:'images.example',ABUSE_SALT:'isolated-fixture-salt-never-used-in-production',CLIENT_IP_HEADER:'x-test-client-ip',TENCENT_CAPTCHA_APP_ID:'fixture-id',TENCENT_CAPTCHA_APP_SECRET_KEY:'fixture-only'};
export function modelFixture(state){return async(url,options)=>{
 const body=JSON.parse(options.body);state.calls++;
 if(String(url).includes('/images/')){state.images++;if(state.failImage)return new Response('{}',{status:503});await new Promise((resolve,reject)=>{const done=()=>{options.signal.removeEventListener('abort',abort);resolve()};const timer=setTimeout(done,120);const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};options.signal.addEventListener('abort',abort,{once:true});if(options.signal.aborted)abort()});return Response.json({data:[{url:`https://images.example/${state.images}.webp`}]})}
 const input=JSON.parse(body.messages[1].content),system=body.messages[0].content;let result;
 if(input.words)result={approved:input.words};
 else if(system.includes('返回environment'))result={environment:'森林中的书屋',role:'阅读的人',activities:['阅读'],emotions:['安静'],lifestyle:'慢生活',visualElements:['书','树'],explicitFacts:[input.ideal],artisticAdditions:['柔和晨光'],uncertainties:[],questions:[],visual:{subject:'阅读空间',composition:'16:9',environment:'树林',objects:'书',lighting:'晨光',colors:'绿色',time:'清晨',spatialRelations:'近处书屋远处森林',mood:'安静'},prompt:input.adjustment?'A bright forest library with books.':'A quiet forest library with books.'};
 else if(system.includes('possibleDifferences'))result={summary:'你珍惜阅读的时间。',possibleDifferences:['日常节奏可能不同。'],uncertainties:['不能据此推断原因。']};
 else if(system.includes('response，keywords'))result={response:'你珍惜阅读，也在认真生活。',keywords:['阅读','平静']};
 else result={keywords:['阅读','平静']};
 return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
}}
