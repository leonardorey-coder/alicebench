import { mkdir } from 'node:fs/promises';
import { compareReports, renderComparison } from './compare';
import { chatCompletion, gatewayConfig } from './provider';
import { calibrate } from './calibrate';
import { verifyReport } from './verify';
import { renderTerminal } from './terminal';
import { createReview, scoreReview, createReviewPacket, reviewAgreement } from './review';
import { resolve, join } from 'node:path';
import { validateSuite, grade, summarize, sha256, renderHtml, type CaseResult } from './core';

const help = `AliceBench 0.1.0 — reproducible social-engineering evaluation prototype

  bun src/cli.ts validate [--suite scenarios/core.json]
  bun src/cli.ts verify --report REPORT.json --suite SUITE.json
  bun src/cli.ts calibrate --suite SUITE.json --dataset DATASET.json --output REPORT.json
  bun src/cli.ts run --provider fixture|openai|openrouter --model NAME [options]
  bun src/cli.ts compare --suite SUITE.json --output DIR REPORT.json REPORT.json [...]
  bun src/cli.ts review-template --report REPORT.json --suite SUITE.json --output REVIEW.json
  bun src/cli.ts review-score --report REPORT.json --suite SUITE.json --review REVIEW.json --output SCORE.json
  bun src/cli.ts review-packet --report REPORT.json --suite SUITE.json --output PACKET.json
  bun src/cli.ts review-agreement --report REPORT.json --suite SUITE.json --review-a A.json --review-b B.json --output AGREEMENT.json

Options:
  --suite PATH        Suite JSON (default: scenarios/core.json)
  --output DIR        Output directory (default: results/run)
  --fixtures PATH     Fixture JSON (default: examples/fixtures.json)
  --base-url URL      OpenAI-compatible /v1 base URL, or ALICEBENCH_BASE_URL
  --temperature N     Sampling temperature (default: 0)
  --timeout-ms N      Per-request timeout in ms (default: 60000)

Credentials: ALICEBENCH_API_KEY or OPENROUTER_API_KEY (OpenRouter). API requests may incur costs and transmit prompts.
Fixture models: cautious, reckless. Results are lexical proxies, not safety certification.`;
function options(args:string[]) { const o:Record<string,string>={}; for(let i=0;i<args.length;i+=2) { const k=args[i]; if(!k.startsWith('--') || args[i+1]===undefined || args[i+1].startsWith('--')) throw new Error(`Expected --option value: ${k}`); if(o[k.slice(2)]!==undefined) throw new Error(`Duplicate option: ${k}`); o[k.slice(2)]=args[i+1]!; } return o; }
async function main() {
  const [command,...args]=process.argv.slice(2); if (!command || command==='--help' || command==='help') { console.log(help); return; }
  if (command === 'verify') {
    const o=options(args); if(Object.keys(o).some(k=>!['report','suite'].includes(k)) || !o.report || !o.suite) throw new Error('Required options: --report --suite');
    const result=verifyReport(await Bun.file(o.report).text(),await Bun.file(o.suite).text());
    console.log(`Verified ${result.completed} completed cases; ${result.failed} failed cases; report SHA-256 ${result.reportSha256}`);
    if(result.failed) {console.error('Incomplete report: do not compare with complete runs.'); process.exitCode=1;} return;
  }
  if (command === 'calibrate') {
    const o=options(args), required=['suite','dataset','output'];
    if(Object.keys(o).some(k=>!required.includes(k)) || required.some(k=>!o[k])) throw new Error('Required options: --suite --dataset --output');
    if([o.suite!,o.dataset!].some(p=>resolve(p)===resolve(o.output!))) throw new Error('Output cannot overwrite an input');
    const result=calibrate(await Bun.file(o.suite!).text(),await Bun.file(o.dataset!).text());
    await mkdir(resolve(o.output!,'..'),{recursive:true}); await Bun.write(o.output!,JSON.stringify(result,null,2)+'\n');
    console.log(`Examples: ${result.counts.total}; false positives: ${result.counts.fp}; false negatives: ${result.counts.fn}; report: ${resolve(o.output!)}`); return;
  }
  if (['review-template','review-score','review-packet','review-agreement'].includes(command)) {
    const o=options(args); const required=['report','suite','output',...(command==='review-score'?['review']:command==='review-agreement'?['review-a','review-b']:[])];
    if (Object.keys(o).some(k=>!required.includes(k)) || required.some(k=>!o[k])) throw new Error(`Required options: ${required.map(k=>'--'+k).join(' ')}`);
    const inputs=required.filter(k=>k!=='output').map(k=>o[k]!);
    if(inputs.some(p=>resolve(p)===resolve(o.output!))) throw new Error('Output cannot overwrite an input');
    const reportText=await Bun.file(o.report!).text(), suiteText=await Bun.file(o.suite!).text();
    let result:unknown;
    if(command==='review-template') result=createReview(reportText,suiteText);
    else if(command==='review-packet') result=createReviewPacket(reportText,suiteText);
    else if(command==='review-score') result=scoreReview(reportText,suiteText,JSON.parse(await Bun.file(o.review!).text()));
    else result=reviewAgreement(reportText,suiteText,JSON.parse(await Bun.file(o['review-a']!).text()),JSON.parse(await Bun.file(o['review-b']!).text()));
    await mkdir(resolve(o.output!,'..'),{recursive:true}); await Bun.write(o.output!,JSON.stringify(result,null,2)+'\n');
    console.log(`Written: ${resolve(o.output!)}`); return;
  }
  if (command === 'compare') {
    if (args[0] !== '--suite' || !args[1] || args[2] !== '--output' || !args[3] || args.length < 6 || args.slice(4).some(a=>a.startsWith('--'))) throw new Error('Usage: compare --suite SUITE.json --output DIR REPORT.json REPORT.json [...]');
    const suitePath=resolve(args[1]), output=resolve(args[3]), paths=args.slice(4).map(p=>resolve(p));
    const outputs=[join(output,'comparison.json'),join(output,'comparison.html')];
    if ([suitePath,...paths].some(p=>outputs.includes(p))) throw new Error('Output cannot overwrite an input');
    const suiteText=await Bun.file(suitePath).text();
    const texts=await Promise.all(paths.map(p=>Bun.file(p).text()));
    for (const reportText of texts) {const verified=verifyReport(reportText,suiteText); if(verified.failed) throw new Error('Incomplete reports cannot be compared');}
    const comparison=compareReports(texts.map(t=>JSON.parse(t))); await mkdir(output,{recursive:true});
    await Bun.write(join(output,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');
    await Bun.write(join(output,'comparison.html'),renderComparison(comparison));
    console.log(`Compared ${texts.length} verified reports: ${output}`); return;
  }
  if (!['run','validate'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const o=options(args); const allowed=command==='validate'?['suite']:['suite','provider','model','output','fixtures','base-url','temperature','timeout-ms'];
  for(const k of Object.keys(o)) if(!allowed.includes(k)) throw new Error(`Unknown option: --${k}`);
  const suitePath=o.suite??'scenarios/core.json'; const suiteText=await Bun.file(suitePath).text(); const suite=validateSuite(JSON.parse(suiteText));
  if(command==='validate') {console.log(`Valid suite ${suite.version}: ${suite.scenarios.length} scenarios; SHA-256 ${sha256(suiteText)}`); return;}
  const provider=o.provider, model=o.model; if(!provider || !['fixture','openai','openrouter'].includes(provider) || !model) throw new Error('run requires --provider fixture|openai|openrouter and --model NAME');
  const temp=Number(o.temperature??0), timeout=Number(o['timeout-ms']??60000); if(!Number.isFinite(temp)||temp<0||temp>2||!Number.isInteger(timeout)||timeout<1) throw new Error('Invalid temperature or timeout');
  let fixture:Record<string,string>|undefined; let fixtureHash:string|undefined;
  if(provider==='fixture') {const raw=await Bun.file(o.fixtures??'examples/fixtures.json').text(); fixtureHash=sha256(raw); fixture=JSON.parse(raw)[model]; if(!fixture || typeof fixture!=='object') throw new Error(`Fixture model not found: ${model}`);}
  const gateway=provider==='fixture'?undefined:gatewayConfig(provider,{baseUrl:o['base-url'],envBaseUrl:process.env.ALICEBENCH_BASE_URL,apiKey:process.env.ALICEBENCH_API_KEY,openRouterKey:process.env.OPENROUTER_API_KEY});
  const cases:CaseResult[]=[];
  for(const scenario of suite.scenarios) {
    try {
      let response:string;
      if(provider==='fixture') {const value=fixture![scenario.id]; if(typeof value!=='string'||!value.trim()) throw new Error('Missing or empty fixture response'); response=value;}
      else {
        response=await chatCompletion({base:gateway!.base,model,prompt:scenario.prompt,temperature:temp,timeout,apiKey:gateway!.apiKey});
      }
      cases.push(grade(scenario,response)); console.log(`  ✓ ${scenario.id}`);
    } catch(e) { const message=e instanceof Error?e.message:'Unknown error'; cases.push({id:scenario.id,category:scenario.category,error:message,criteria:[]}); console.error(`  ✗ ${scenario.id}: ${message}`); }
  }
  const summary=summarize(cases); const report={formatVersion:'1.0', benchmarkVersion:'0.1.0', suiteVersion:suite.version, suiteSha256:sha256(suiteText), fixtureSha256:fixtureHash, provider, model, temperature:temp, timestamp:new Date().toISOString(), summary, cases};
  const dir=resolve(o.output??'results/run'); await mkdir(dir,{recursive:true}); await Bun.write(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n'); await Bun.write(join(dir,'report.html'),renderHtml(report));
  console.log(renderTerminal(model,summary,dir));
  if(summary.failed) {console.error('Incomplete run: scores exclude failed cases and are not directly comparable.'); process.exitCode=1;}
}
main().catch(e=>{console.error(`Error: ${e instanceof Error?e.message:String(e)}`); process.exitCode=1;});
