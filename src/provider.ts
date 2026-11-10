/** Send one prompt to an OpenAI-compatible chat-completions endpoint. */
export async function chatCompletion(options: {base:string; model:string; prompt:string; temperature:number; timeout:number; apiKey?:string}, request:typeof fetch = fetch):Promise<string> {
  const headers:Record<string,string>={'content-type':'application/json'};
  if (options.apiKey) headers.authorization=`Bearer ${options.apiKey}`;
  const res=await request(`${options.base}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model:options.model,temperature:options.temperature,messages:[{role:'user',content:options.prompt}]}),signal:AbortSignal.timeout(options.timeout)});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json:any=await res.json(); const response=json?.choices?.[0]?.message?.content;
  if (typeof response!=='string'||!response.trim()) throw new Error('Provider returned empty or unsupported response');
  return response;
}

/** Select an endpoint without accidentally sending a provider key to another service. */
export function gatewayConfig(provider:string, options:{baseUrl?:string; envBaseUrl?:string; apiKey?:string; openRouterKey?:string}) {
  if(provider==='openrouter') {
    if(options.baseUrl) throw new Error('--base-url is not supported for the openrouter provider; use --provider openai for custom endpoints');
    const apiKey=options.openRouterKey || options.apiKey;
    if(!apiKey) throw new Error('Set OPENROUTER_API_KEY or ALICEBENCH_API_KEY for OpenRouter');
    return {base:'https://openrouter.ai/api/v1',apiKey};
  }
  if(provider!=='openai') throw new Error('Unsupported gateway');
  const base=(options.baseUrl??options.envBaseUrl??'').replace(/\/$/,'');
  if(!base) throw new Error('Set --base-url or ALICEBENCH_BASE_URL');
  const url=new URL(base); if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Base URL must be HTTP(S) without credentials, query or fragment');
  return {base,apiKey:options.apiKey};
}
