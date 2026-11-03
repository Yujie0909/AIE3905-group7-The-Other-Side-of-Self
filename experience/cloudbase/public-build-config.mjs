// These two values are PUBLIC. Never print rejected input: it may be a misplaced secret.
export function publicBuildConfig(env=process.env){
 let url;try{url=new URL(env.VITE_API_BASE_URL)}catch{throw Error('VITE_API_BASE_URL is missing or invalid')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!/^\/[A-Za-z0-9_/-]*$/.test(url.pathname)||url.pathname.replace(/\/$/,'')!=='/flow-space-api')throw Error('VITE_API_BASE_URL must be the real HTTPS gateway address ending in /flow-space-api, without /api/health');
 const appId=env.VITE_TENCENT_CAPTCHA_APP_ID?.trim();
 if(!appId||!/^\d+$/.test(appId)||!Number.isSafeInteger(Number(appId))||Number(appId)<1)throw Error('VITE_TENCENT_CAPTCHA_APP_ID must be the public numeric captcha App ID, never AppSecretKey');
 return {base:env.VITE_API_BASE_URL,appId};
}
