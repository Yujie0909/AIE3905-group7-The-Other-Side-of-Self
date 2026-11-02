// Run ONLY in the backend environment, after configuring actual provider secrets.
// Never prints keys, headers, generated content or signed image URLs.
for(const provider of ['DEEPSEEK','ARK']){
 const key=process.env[provider==='ARK'?'ARK_API_KEY':'DEEPSEEK_API_KEY'],base=process.env[provider+'_BASE_URL'],model=process.env[provider==='ARK'?'ARK_IMAGE_MODEL':'DEEPSEEK_MODEL'];
 if(!key||!base){console.log(provider,'NOT VERIFIED: configure server key and base URL');continue}
 const root=new URL(base);if(root.protocol!=='https:'||root.username||root.password)throw Error('HTTPS base URL required');
 const headers={Authorization:`Bearer ${key}`,'Content-Type':'application/json'},start=Date.now();
 try{const r=await fetch(base.replace(/\/$/,'')+'/models',{headers,signal:AbortSignal.timeout(10000)});const j=r.ok?await r.json():{};console.log(provider,'models status',r.status,'listed exact model:',Array.isArray(j.data)?j.data.some(x=>x.id===model):'not available')}catch{console.log(provider,'models probe failed')}
 if(!model){console.log(provider,'NOT VERIFIED: configure the exact authorized model ID');continue}
 // Image generation costs money: explicitly opt in to this one-image probe.
 if(provider==='ARK'&&process.env.VERIFY_IMAGE_GENERATION!=='1'){console.log('ARK image not verified: set VERIFY_IMAGE_GENERATION=1 for one paid image');continue}
 const path=provider==='ARK'?'/images/generations':'/chat/completions',body=provider==='ARK'?{model,prompt:'A single blue ceramic cup on a plain table, no text',size:process.env.ARK_IMAGE_SIZE||'2048x1152',n:1,response_format:'url',watermark:true}:{model,messages:[{role:'user',content:'Reply with OK only.'}],max_tokens:8,stream:false};
 try{const r=await fetch(base.replace(/\/$/,'')+path,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(provider==='ARK'?110000:20000)}),j=r.ok?await r.json():{};console.log(provider,'actual call status',r.status,'valid response:',provider==='ARK'?Boolean(j.data?.[0]?.url):Boolean(j.choices?.[0]?.message?.content),'elapsed ms',Date.now()-start)}catch{console.log(provider,'actual call failed or timed out')}
}
