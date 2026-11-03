import {fail} from './errors.mjs';
export async function verifyCaptcha(env,ticket,randstr,ip){
 if(!env.TENCENT_CAPTCHA_APP_ID||!env.TENCENT_CAPTCHA_APP_SECRET_KEY)fail(503,'verification_not_configured');
 const secretId=env.TENCENTCLOUD_SECRETID,secretKey=env.TENCENTCLOUD_SECRETKEY,token=env.TENCENTCLOUD_SESSIONTOKEN;
 // Prefer the function execution role's temporary credentials. Never accept credentials from request headers.
 if(!secretId||!secretKey)fail(503,'verification_identity_unavailable');
 const sdk=await import('tencentcloud-sdk-nodejs-captcha');const Client=(sdk.default||sdk).captcha.v20190722.Client;
 const client=new Client({credential:{secretId,secretKey,token},region:env.TENCENT_CAPTCHA_REGION||'ap-guangzhou',profile:{httpProfile:{endpoint:'captcha.tencentcloudapi.com',reqTimeout:8}}});
 let result;try{result=await client.DescribeCaptchaResult({CaptchaType:9,Ticket:ticket,UserIp:ip,CaptchaAppId:Number(env.TENCENT_CAPTCHA_APP_ID),AppSecretKey:env.TENCENT_CAPTCHA_APP_SECRET_KEY,Randstr:randstr})}catch{fail(503,'verification_unavailable')}
 if(result.CaptchaCode!==1)fail(403,'verification_failed');
}
