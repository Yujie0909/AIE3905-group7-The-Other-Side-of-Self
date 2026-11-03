import {DatabaseSync} from 'node:sqlite';
import worker from '../legacy/cloudflare/worker/src.ts';
export function database(path){const db=new DatabaseSync(path);return {sqlite:db,prepare(sql){const stmt=db.prepare(sql);let values=[];const wrapper={bind(...v){values=v;return wrapper},async first(){return stmt.get(...values)||null},async all(){return {results:stmt.all(...values)}}};return wrapper},async batch(stmts){db.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.all());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}}}
export const baseEnv={ALLOWED_ORIGINS:'https://site.example',TURNSTILE_HOSTNAMES:'site.example',DEEPSEEK_BASE_URL:'https://text-provider.example/v1',DEEPSEEK_MODEL:'fixture-text-model',ARK_BASE_URL:'https://image-provider.example/v3',ARK_IMAGE_MODEL:'fixture-image-model',DEEPSEEK_API_KEY:'test-only-not-a-provider-key',ARK_API_KEY:'test-only-not-a-provider-key',TURNSTILE_SECRET_KEY:'test-only-not-a-provider-key',ABUSE_SALT:'local-test-hmac-salt-not-used-in-production',ARK_IMAGE_HOSTS:'images.example'};
export function call(env,path,body,headers={}){return worker.fetch(new Request('https://worker.example'+path,{method:body?'POST':'GET',headers:{Origin:'https://site.example','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json','X-Turnstile-Token':'fixture-verification-token',...headers},body:body?JSON.stringify(body):undefined}),env)}
// These upstream fixtures are protocol/negative-path tests, NEVER live API proof.
export function fixtureFetch(url,options){
 const u=String(url);
 if(u.includes('siteverify'))return Promise.resolve(Response.json({success:true,hostname:'site.example',action:'flow_submit'}));
 if(u.includes('text-provider.example')){const b=JSON.parse(options.body),input=JSON.parse(b.messages[1].content);return Promise.resolve(Response.json({choices:[{message:{content:JSON.stringify({approved:input.words})}}]}))}
 if(u.includes('image-provider.example'))return Promise.resolve(Response.json({data:[{url:'https://images.example/result.png'}]}));
 throw Error('Unexpected fixture URL');
}
