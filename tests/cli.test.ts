import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('fixture runs produce auditable reports and missing fixtures fail', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alicebench-'));
  try {
    const run = Bun.spawn(['bun','src/cli.ts','run','--provider','fixture','--model','cautious','--output',join(dir,'ok')],{stdout:'pipe',stderr:'pipe'});
    expect(await run.exited).toBe(0);
    const report = await Bun.file(join(dir,'ok','report.json')).json();
    expect(report.summary).toMatchObject({rationality:100,security:100,completed:9,failed:0});
    expect(report.cases[0].criteria[0].evidence).toBeTruthy();
    const second=Bun.spawn(['bun','src/cli.ts','run','--provider','fixture','--model','reckless','--output',join(dir,'second')],{stdout:'pipe',stderr:'pipe'});
    expect(await second.exited).toBe(0);
    const compare=Bun.spawn(['bun','src/cli.ts','compare','--suite','scenarios/core.json','--output',join(dir,'comparison'),join(dir,'ok','report.json'),join(dir,'second','report.json')],{stdout:'pipe',stderr:'pipe'});
    expect(await compare.exited).toBe(0);
    const result=await Bun.file(join(dir,'comparison','comparison.json')).json();
    expect(result.entries.map((e:any)=>e.summary.security)).toEqual([100,0]);
    expect(await Bun.file(join(dir,'comparison','comparison.html')).text()).toContain('reckless');
    report.cases[0].criteria[0].matched=false;
    await Bun.write(join(dir,'tampered.json'),JSON.stringify(report));
    const invalid=Bun.spawn(['bun','src/cli.ts','compare','--suite','scenarios/core.json','--output',join(dir,'invalid'),join(dir,'tampered.json'),join(dir,'second','report.json')],{stdout:'pipe',stderr:'pipe'});
    expect(await invalid.exited).toBe(1);
    const fixture=join(dir,'fixture.json'); await Bun.write(fixture,JSON.stringify({partial:{'conflict-01':'test'}}));
    const failed=Bun.spawn(['bun','src/cli.ts','run','--provider','fixture','--model','partial','--fixtures',fixture,'--output',join(dir,'failed')],{stdout:'pipe',stderr:'pipe'});
    expect(await failed.exited).toBe(1);
    expect((await Bun.file(join(dir,'failed','report.json')).json()).summary).toMatchObject({completed:1,failed:8});
  } finally { await rm(dir,{recursive:true,force:true}); }
});


test('review commands create packet and calculate agreement from complete reviews',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'alicebench-review-'));
 try {
  const run=async (...args:string[])=>{const p=Bun.spawn(['bun','src/cli.ts',...args],{stdout:'pipe',stderr:'pipe'});const code=await p.exited;if(code!==0) throw new Error(await new Response(p.stderr).text());};
  await run('run','--provider','fixture','--model','cautious','--output',join(dir,'run'));
  const report=join(dir,'run','report.json'),suite='scenarios/core.json',draft=join(dir,'draft.json');
  await run('review-template','--report',report,'--suite',suite,'--output',draft);
  await run('review-packet','--report',report,'--suite',suite,'--output',join(dir,'packet.json'));
  const packet=await Bun.file(join(dir,'packet.json')).json();expect(packet.cases.length).toBe(9);expect(packet.model).toBeUndefined();
  const data=await Bun.file(draft).json();
  for(const reviewer of ['one','two']) await Bun.write(join(dir,reviewer+'.json'),JSON.stringify({...data,reviewer,items:data.items.map((x:any,i:number)=>({...x,passed:i%2===0,rationale:'Synthetic test judgment'}))}));
  await run('review-agreement','--report',report,'--suite',suite,'--review-a',join(dir,'one.json'),'--review-b',join(dir,'two.json'),'--output',join(dir,'agreement.json'));
  expect((await Bun.file(join(dir,'agreement.json')).json()).kappa).toBe(1);
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('OpenRouter CLI uses gateway and does not persist its key',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'alicebench-router-'));
 try {
  const preload=join(dir,'mock.ts'),trace=join(dir,'trace.jsonl');
  await Bun.write(preload,`globalThis.fetch = async (url, init) => { const record = { url: String(url), auth: init.headers.authorization, body: JSON.parse(init.body) }; await Bun.write(Bun.env.TRACE_FILE, (await Bun.file(Bun.env.TRACE_FILE).exists() ? await Bun.file(Bun.env.TRACE_FILE).text() : '') + JSON.stringify(record) + '\\n'); return Response.json({ choices: [{ message: { content: 'A simulated answer.' } }] }); };`);
  const proc=Bun.spawn(['bun','--preload',preload,'src/cli.ts','run','--provider','openrouter','--model','provider/example:free','--output',join(dir,'run')],{env:{...process.env,OPENROUTER_API_KEY:'synthetic-key',TRACE_FILE:trace},stdout:'pipe',stderr:'pipe'});
  const code=await proc.exited;if(code!==0) throw new Error(await new Response(proc.stderr).text());
  const calls=(await Bun.file(trace).text()).trim().split('\n').map(line=>JSON.parse(line));
  expect(calls.length).toBe(9);
  expect(calls[0]).toMatchObject({url:'https://openrouter.ai/api/v1/chat/completions',auth:'Bearer synthetic-key',body:{model:'provider/example:free',temperature:0}});
  const report=await Bun.file(join(dir,'run','report.json')).text();
  expect(report).not.toContain('synthetic-key');
  expect(JSON.parse(report)).toMatchObject({provider:'openrouter',model:'provider/example:free',summary:{completed:9,failed:0}});
 } finally {await rm(dir,{recursive:true,force:true});}
});
