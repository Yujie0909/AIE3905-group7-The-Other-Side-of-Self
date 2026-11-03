import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {fail} from './errors.mjs';

// Local SQLite repository. Deliberately not a D1-compatible object.
// Future PostgreSQL adapter must implement these business operations with its own transactions.
export function sqliteStore(path){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
 const version=Number(db.prepare('PRAGMA user_version').get().user_version);
 if(version>1){db.close();throw Error('database_version_not_supported')}
 if(version===0){db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS local_submissions(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS local_words(submission_id TEXT NOT NULL REFERENCES local_submissions(id),word TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(submission_id,word));
 CREATE INDEX IF NOT EXISTS local_words_frequency ON local_words(word,created_at);
 CREATE TABLE IF NOT EXISTS local_limits(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS local_limits_expiry ON local_limits(expires);
 CREATE TABLE IF NOT EXISTS local_images(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,status TEXT NOT NULL,url TEXT,expires INTEGER NOT NULL);
 PRAGMA user_version=1; COMMIT;`)}
 const q=sql=>db.prepare(sql);
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
 function count(bucket,max,expires){const r=q('INSERT INTO local_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET n=n+1 WHERE n<? RETURNING n').get(bucket,expires,max);if(!r)fail(429,'quota_exceeded')}
 return {
  close(){db.close()},
  quota(buckets){transaction(()=>{for(const b of buckets)count(...b);q('DELETE FROM local_limits WHERE expires<?').run(Date.now())})},
  imageStart(id,hash,limit){return transaction(()=>{
   const row=q('SELECT * FROM local_images WHERE id=?').get(id);
   // Keep the request tombstone even after temporary URL expiry: retries must not incur a second charge.
   if(row){if(row.body_hash!==hash)fail(409,'idempotency_conflict');if(row.status==='complete'&&row.expires>Date.now())return row.url;fail(409,'image_request_already_started')}
   count(`image:${Math.floor(Date.now()/86400000)}`,limit,Date.now()+86400000);
   q("INSERT INTO local_images(id,body_hash,status,expires) VALUES(?,?,'pending',?)").run(id,hash,Date.now()+3600000);return null;
  })},
  imageFinish(id,url){q('UPDATE local_images SET status=?,url=? WHERE id=?').run(url?'complete':'failed',url??null,id)},
  shared(id,hash){const r=q('SELECT body_hash FROM local_submissions WHERE id=?').get(id);if(r&&r.body_hash!==hash)fail(409,'idempotency_conflict');return Boolean(r)},
  share(id,hash,words,identity){return transaction(()=>{
   const r=q('SELECT body_hash FROM local_submissions WHERE id=?').get(id);if(r){if(r.body_hash!==hash)fail(409,'idempotency_conflict');return true}
   count(`share:${identity}:${Math.floor(Date.now()/86400000)}`,5,Date.now()+86400000);
   q('INSERT INTO local_submissions VALUES(?,?,?)').run(id,hash,Date.now());
   const insert=q('INSERT INTO local_words VALUES(?,?,?)');for(const word of words)insert.run(id,word,Date.now());return false;
  })},
  cloud(){const all=q('SELECT word,COUNT(*) AS frequency,MAX(created_at) AS recent FROM local_words GROUP BY word ORDER BY frequency DESC,word LIMIT 12').all();const rare=q('SELECT word,COUNT(*) AS frequency,MAX(created_at) AS recent FROM local_words GROUP BY word ORDER BY frequency ASC,recent DESC LIMIT 18').all();return [...all,...rare.filter(r=>!all.some(w=>w.word===r.word))].slice(0,18).map(({word,frequency})=>({word,frequency}))}
 };
}
