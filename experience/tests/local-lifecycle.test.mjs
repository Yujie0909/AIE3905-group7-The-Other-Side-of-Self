// Runs the real single-process launcher, no provider calls or private input.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {request} from 'node:http';
import {createServer,connect} from 'node:net';
import {networkInterfaces} from 'node:os';
const root=new URL('../',import.meta.url);
const hostileHost=port=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:port===8788?'/api/health':'/',headers:{Host:`rebind.example:${port}`}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});
const closed=async port=>new Promise(resolve=>{const s=connect({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();resolve(false)});s.once('error',()=>resolve(true));s.setTimeout(1000,()=>{s.destroy();resolve(false)})});
for(const signal of ['SIGINT','SIGTERM'])test(`single launcher binds loopback only, rejects hostile Hosts, exits on ${signal} and releases both ports`,async()=>{
 for(const port of [5173,8788])assert.ok(await closed(port),'test requires free local port '+port);
 const child=spawn(process.execPath,['server/start-local.mjs'],{cwd:root,env:{...process.env,VITE_API_BASE_URL:'https://unused-old-worker.invalid'},stdio:['ignore','pipe','pipe']});
 const exited=once(child,'exit');let logs='';child.stdout.on('data',b=>{logs+=b});child.stderr.on('data',()=>{});
 try{
  await Promise.race([new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(Error('launcher timed out')),20000);child.stdout.on('data',()=>{if(logs.includes('Ctrl+C stops both servers')){clearTimeout(deadline);resolve()}});child.once('exit',()=>{clearTimeout(deadline);reject(Error('launcher exited before readiness'))})}),exited.then(()=>{throw Error('launcher failed')})]);
  assert.equal((await fetch('http://127.0.0.1:8788/api/health')).status,200);
  assert.equal((await fetch('http://127.0.0.1:5173')).status,200);
  for(const path of ['/server/.env','/server/data/flow.sqlite','/@fs'+new URL('server/.env',root).pathname]){const response=await fetch('http://127.0.0.1:5173'+path);assert.ok([403,404].includes(response.status),'private server files must not be served');await response.body?.cancel()}
  assert.equal(await hostileHost(5173),403);
  assert.equal(await hostileHost(8788),403);
  const ip=Object.values(networkInterfaces()).flat().find(i=>i.family==='IPv4'&&!i.internal)?.address;
  if(ip)for(const port of [5173,8788]){await new Promise((resolve,reject)=>{const s=connect({host:ip,port});s.once('connect',()=>{s.destroy();reject(Error('non-loopback socket unexpectedly accepted'))});s.once('error',resolve);s.setTimeout(1000,()=>{s.destroy();resolve()})})}
  child.kill(signal);const result=await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('shutdown timed out')),5000).unref())]);assert.deepEqual(result,[0,null]);
  for(const port of [5173,8788]){assert.ok(await closed(port),'port must be closed '+port);const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve)});await new Promise(r=>probe.close(r))}
 }finally{if(child.exitCode===null&&!child.signalCode){child.kill('SIGTERM');await exited}}
});
