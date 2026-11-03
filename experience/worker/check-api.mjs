// Read-only public deployment check. Never invokes paid models or uploads words.
export async function checkApi(env=process.env,transport=fetch){
 let url;try{url=new URL(env.VITE_API_BASE_URL)}catch{throw Error('Set VITE_API_BASE_URL to the verified HTTPS API origin')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('VITE_API_BASE_URL must be an HTTPS origin, without /api or credentials');
 if(!env.VITE_TURNSTILE_SITE_KEY?.trim())throw Error('Set the public VITE_TURNSTILE_SITE_KEY; never use the secret key here');
 const origin='https://yujie0909.github.io';
 const response=await transport(url.origin+'/api/health',{headers:{Origin:origin},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`API health HTTP ${response.status}; deployment is not verified`);
 let body;try{body=await response.json()}catch{throw Error('Health is not JSON: a Hello World response is not the API implementation')}
 if(body?.ok!==true||['textConfigured','imageConfigured','databaseConfigured','verificationConfigured'].some(k=>body[k]!==true)||!Array.isArray(body.configurationIssues)||body.configurationIssues.length)throw Error('Worker API bindings, providers, or verification are not ready');
 if(response.headers.get('Access-Control-Allow-Origin')!==origin)throw Error('Health CORS does not allow the GitHub Pages origin');
 const preflight=await transport(url.origin+'/api/text',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type,X-Turnstile-Token'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!preflight.ok||preflight.headers.get('Access-Control-Allow-Origin')!==origin||!preflight.headers.get('Access-Control-Allow-Methods')?.split(',').map(x=>x.trim()).includes('POST')||!['content-type','x-turnstile-token'].every(k=>preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase().split(',').map(x=>x.trim()).includes(k)))throw Error('API POST preflight is not ready');
 return {ready:true,scope:'Current runner only; no proof of mainland reachability, live model authentication, or D1 writes'};
}
if(import.meta.url===new URL(process.argv[1],'file://').href){try{console.log(await checkApi())}catch(e){console.error(e.name==='TypeError'?'API network request failed':e.message);process.exitCode=2}}
