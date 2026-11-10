import {expect,test} from 'bun:test';
import {chatCompletion} from '../src/provider';
const options={base:'http://localhost/v1',model:'example',prompt:'Test?',temperature:0,timeout:1000,apiKey:'fake-key'};
test('adapter sends expected request and extracts text',async()=>{
 let actual:any;
 const request=async (url:any, init:any)=>{actual={url,init};return Response.json({choices:[{message:{content:'answer'}}]});};
 expect(await chatCompletion(options,request as typeof fetch)).toBe('answer');
 expect(actual.url).toBe('http://localhost/v1/chat/completions');
 expect(actual.init.headers.authorization).toBe('Bearer fake-key');
 expect(JSON.parse(actual.init.body)).toEqual({model:'example',temperature:0,messages:[{role:'user',content:'Test?'}]});
});
test('adapter surfaces provider errors and unsupported content',async()=>{
 await expect(chatCompletion(options,(async()=>new Response('',{status:429})) as typeof fetch)).rejects.toThrow('HTTP 429');
 await expect(chatCompletion(options,(async()=>Response.json({choices:[{message:{content:null}}]})) as typeof fetch)).rejects.toThrow('empty or unsupported');
});

test('gateway pins OpenRouter endpoint and isolates its credential',async()=>{
 const {gatewayConfig}=await import('../src/provider');
 expect(gatewayConfig('openrouter',{openRouterKey:'router-key',envBaseUrl:'http://localhost/v1'})).toEqual({base:'https://openrouter.ai/api/v1',apiKey:'router-key'});
 expect(()=>gatewayConfig('openrouter',{baseUrl:'https://other.example/v1',openRouterKey:'key'})).toThrow();
 expect(()=>gatewayConfig('openrouter',{})).toThrow();
 expect(gatewayConfig('openai',{baseUrl:'http://localhost:11434/v1/',openRouterKey:'router-key'})).toEqual({base:'http://localhost:11434/v1',apiKey:undefined});
 expect(()=>gatewayConfig('openai',{baseUrl:'https://name:pass@example.com/v1'})).toThrow();
});
