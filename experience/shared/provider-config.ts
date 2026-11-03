export interface ProviderEnv{DEEPSEEK_BASE_URL?:string;DEEPSEEK_MODEL?:string;ARK_BASE_URL?:string;ARK_IMAGE_MODEL?:string;ARK_IMAGE_MODEL_ID?:string}
export class ProviderConfigError extends Error{constructor(publicCode:string){super(publicCode);this.name='ProviderConfigError'}}
/** Never infer an issuer or model from a key. Never silently replace a base URL. */
export function providerConfig(env:ProviderEnv,kind:'DEEPSEEK'|'ARK',requireModel=true){
 const base=(kind==='ARK'?env.ARK_BASE_URL:env.DEEPSEEK_BASE_URL)?.trim().replace(/\/+$/,'');
 const model=(kind==='ARK'?env.ARK_IMAGE_MODEL:env.DEEPSEEK_MODEL)?.trim()||'';
 if(kind==='ARK'&&env.ARK_IMAGE_MODEL_ID?.trim()&&env.ARK_IMAGE_MODEL_ID.trim()!==model)throw new ProviderConfigError(model?'image_model_config_conflict':'rename_ARK_IMAGE_MODEL_ID_to_ARK_IMAGE_MODEL');
 if(!base)throw new ProviderConfigError(kind==='ARK'?'image_base_url_missing':'text_base_url_missing');
 let url:URL;try{url=new URL(base)}catch{throw new ProviderConfigError('invalid_provider_base_url')}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||/\/(chat\/completions|images\/generations|models)$/.test(url.pathname))throw new ProviderConfigError('invalid_provider_base_url');
 if(requireModel&&!model)throw new ProviderConfigError(kind==='ARK'?'image_model_missing':'text_model_missing');
 return {base,model};
}
export function providerIssues(env:ProviderEnv){return (['DEEPSEEK','ARK'] as const).flatMap(kind=>{try{providerConfig(env,kind);return []}catch(e){return [e instanceof ProviderConfigError?e.message:'invalid_provider_config']}})}

export function hasProviderConfig(env:ProviderEnv,kind:'DEEPSEEK'|'ARK'){try{providerConfig(env,kind);return true}catch{return false}}
