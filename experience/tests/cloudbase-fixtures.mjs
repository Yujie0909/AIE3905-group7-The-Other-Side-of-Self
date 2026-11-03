// Isolated protocol fixtures + an embedded real PostgreSQL engine. No live cloud/API proof.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {cloudBaseRpcStore} from '../cloudbase/rdb-http.mjs';
export async function fixtureDatabase(path){
 const sql=new PGlite(path);await sql.waitReady;
 await sql.exec("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;");
 await sql.exec(readFileSync(new URL('../cloudbase/migrations/0001_core.sql',import.meta.url),'utf8'));
 let tail=Promise.resolve();
 const lock=async()=>{let release;const next=new Promise(r=>release=r),previous=tail;tail=previous.then(()=>next);await previous;return release};
 const transport=async(url,options)=>{
  if(url!=='https://flow-space-d9gzw4xiiba0881b3.api.tcloudbasegateway.com/v1/rdb/rest/rpc/flow_backend_rpc'||options.headers.Authorization!=='Bearer fixture-server-key')return Response.json({message:'unauthorized'},{status:401});
  const {p_operation,p_payload}=JSON.parse(options.body),unlock=await lock();
  try{
   await sql.exec('SET ROLE service_role');
   const r=await sql.query('SELECT public.flow_backend_rpc($1,$2::jsonb) AS result',[p_operation,JSON.stringify(p_payload)]);
   return Response.json(r.rows[0].result);
  }catch(e){return Response.json({code:e.code,message:e.message},{status:400})}
  finally{await sql.exec('RESET ROLE');unlock()}
 };
 const store=cloudBaseRpcStore({CLOUDBASE_ENV_ID:'flow-space-d9gzw4xiiba0881b3',CLOUDBASE_DB_TYPE:'postgresql',CLOUDBASE_SERVER_API_KEY:'fixture-server-key'},{transport});
 const close=store.close;store.close=async()=>{await close();await tail;await sql.close()};return {sql,store,transport};
}
export const cloudEnv={ALLOWED_ORIGINS:'https://site.example',CLOUDBASE_DB_TYPE:'postgresql',CLOUDBASE_ENV_ID:'flow-space-d9gzw4xiiba0881b3',CLOUDBASE_SERVER_API_KEY:'fixture-server-key',DEEPSEEK_BASE_URL:'https://text.example/v1',DEEPSEEK_MODEL:'fixture-text',DEEPSEEK_API_KEY:'fixture-not-a-secret',ARK_BASE_URL:'https://images-api.example/v3',ARK_IMAGE_MODEL:'fixture-image',ARK_API_KEY:'fixture-not-a-secret',ARK_IMAGE_HOSTS:'images.example',ABUSE_SALT:'isolated-fixture-salt-never-used-in-production',CLIENT_IP_HEADER:'x-test-client-ip',TENCENT_CAPTCHA_APP_ID:'fixture-id',TENCENT_CAPTCHA_APP_SECRET_KEY:'fixture-only'};
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
