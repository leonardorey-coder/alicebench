import {expect,test} from 'bun:test';
import {grade,sha256,summarize} from '../src/core';
import {verifyReport} from '../src/verify';
const scenario={id:'x',category:'test',prompt:'?',criteria:[{id:'c',axis:'security' as const,description:'Refuse',patterns:['refuse']}]};
const suite=JSON.stringify({version:'1',scenarios:[scenario]});
const make=()=>{const cases=[grade(scenario,'I refuse.')];return {formatVersion:'1.0',benchmarkVersion:'0.1.0',suiteVersion:'1',suiteSha256:sha256(suite),cases,summary:summarize(cases)};};
test('verification recomputes evidence and scores from exact suite',()=>{
 const report=make();expect(verifyReport(JSON.stringify(report),suite).completed).toBe(1);
 const changed=make();changed.cases[0]!.criteria[0]!.matched=false;expect(()=>verifyReport(JSON.stringify(changed),suite)).toThrow('Criterion');
 const summary=make();summary.summary.security=0;expect(()=>verifyReport(JSON.stringify(summary),suite)).toThrow('Summary');
 expect(()=>verifyReport(JSON.stringify(report),suite+' ')).toThrow('suite mismatch');
 const response=make();response.cases[0]!.response='yes';expect(()=>verifyReport(JSON.stringify(response),suite)).toThrow('Criterion');
});
test('verification checks failed case and marks it incomplete',()=>{
 const cases=[{id:'x',category:'test',error:'HTTP 500',criteria:[]}];
 const report={formatVersion:'1.0',benchmarkVersion:'0.1.0',suiteVersion:'1',suiteSha256:sha256(suite),cases,summary:summarize(cases)};
 expect(verifyReport(JSON.stringify(report),suite)).toMatchObject({completed:0,failed:1});
});
