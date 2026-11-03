import {createHash} from 'node:crypto';
import {fail} from './errors.mjs';
const tables={meta:'flow_api_limits',submissions:'flow_wordcloud_submissions',words:'flow_wordcloud_words',images:'flow_image_jobs'};
const key=v=>createHash('sha256').update(v).digest('hex');
export function postgresStore(pool){
 async function transaction(fn){
  // Serialize only the small database work, never a model/API call. Locks work across function instances.
  for(let attempt=0;attempt<3;attempt++){
   const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='3s'");const value=await fn(c);await c.query('COMMIT');return value}
   catch(e){await c.query('ROLLBACK').catch(()=>{});if(attempt===2||!['40001','40P01'].includes(e.code))throw e}finally{c.release()}
  }
 }
 async function lock(c,namespace,id){await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[namespace+':'+id])}
 async function count(c,bucket,max,expires){const r=await c.query(`INSERT INTO ${tables.meta}(bucket,n,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET n=${tables.meta}.n+1 WHERE ${tables.meta}.n<$3 RETURNING n`,[bucket,expires,max]);if(!r.rowCount)fail(429,'quota_exceeded')}
 return {
  close:()=>pool.end(),
  async quota(buckets){return transaction(async c=>{for(const [id,max,expires] of [...buckets].sort((a,b)=>a[0].localeCompare(b[0])))await count(c,id,max,expires)})},
  async consumeTicket(ticket,expires){return transaction(async c=>{await lock(c,'captcha',key(ticket));const bucket='captcha:'+key(ticket),r=await c.query(`SELECT n FROM ${tables.meta} WHERE bucket=$1`,[bucket]);if(r.rowCount)fail(403,'verification_replayed');await count(c,bucket,1,expires)})},
  async imageStart(id,hash,max){return transaction(async c=>{
   await lock(c,'image',id);const {rows}=await c.query(`SELECT body_hash,status,image_url,expires_at FROM ${tables.images} WHERE id=$1`,[id]);const prev=rows[0];
   if(prev){if(prev.body_hash!==hash)fail(409,'idempotency_conflict');if(prev.status==='complete'&&Number(prev.expires_at)>Date.now())return prev.image_url;fail(409,'image_request_already_started')}
   await count(c,'image-global:'+Math.floor(Date.now()/86400000),max,Date.now()+86400000);
   await c.query(`INSERT INTO ${tables.images}(id,body_hash,status,expires_at) VALUES($1,$2,'pending',$3)`,[id,hash,Date.now()+3600000]);return null;
  })},
  async imageFinish(id,url){await pool.query(`UPDATE ${tables.images} SET status=$2,image_url=$3 WHERE id=$1`,[id,url?'complete':'failed',url??null])},
  async shared(id,hash){const {rows}=await pool.query(`SELECT body_hash FROM ${tables.submissions} WHERE id=$1`,[id]);if(rows[0]&&rows[0].body_hash!==hash)fail(409,'idempotency_conflict');return Boolean(rows[0])},
  async share(id,hash,words,identity){return transaction(async c=>{
   await lock(c,'share',id);const {rows}=await c.query(`SELECT body_hash FROM ${tables.submissions} WHERE id=$1`,[id]);
   if(rows[0]){if(rows[0].body_hash!==hash)fail(409,'idempotency_conflict');return true}
   await count(c,`share:${identity}:${Math.floor(Date.now()/86400000)}`,5,Date.now()+86400000);
   await c.query(`INSERT INTO ${tables.submissions}(id,body_hash,created_at) VALUES($1,$2,$3)`,[id,hash,Date.now()]);
   // Stable ordering avoids deadlocks when users share overlapping words.
   for(const word of [...words].sort())await c.query(`INSERT INTO ${tables.words}(word,frequency,updated_at) VALUES($1,1,$2) ON CONFLICT(word) DO UPDATE SET frequency=${tables.words}.frequency+1,updated_at=EXCLUDED.updated_at`,[word,Date.now()]);return false;
  })},
  async cloud(){const {rows}=await pool.query(`WITH top AS (SELECT word,frequency FROM ${tables.words} ORDER BY frequency DESC,word LIMIT 12), rare AS (SELECT word,frequency FROM ${tables.words} WHERE word NOT IN(SELECT word FROM top) ORDER BY frequency ASC,updated_at DESC,word LIMIT 6) SELECT * FROM top UNION ALL SELECT * FROM rare`);return rows.map(({word,frequency})=>({word,frequency:Number(frequency)}))},
  async ready(){const r=await pool.query('SELECT version FROM flow_schema_versions WHERE version=1');return r.rowCount===1}
 };
}
export async function connectPostgres(env){
 if(env.CLOUDBASE_DB_TYPE!=='postgresql')fail(503,'database_type_not_confirmed');
 const value=env.DATABASE_URL;if(!value)fail(503,'database_not_configured');
 let u;try{u=new URL(value)}catch{fail(503,'database_not_configured')}
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||!u.username||u.search)fail(503,'invalid_database_url');
 const {default:pg}=await import('pg');
 const pool=new pg.Pool({connectionString:value,ssl:{rejectUnauthorized:true,...(env.DATABASE_CA_CERT?{ca:env.DATABASE_CA_CERT.replace(/\\n/g,'\n')}: {})},max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,statement_timeout:5000,application_name:'flow-space-api'});
 pool.on('error',()=>{});return postgresStore(pool);
}
