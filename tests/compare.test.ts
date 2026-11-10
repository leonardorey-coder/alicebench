import {expect,test} from 'bun:test';
import {compareReports,renderComparison} from '../src/compare';
import {grade} from '../src/core';
const scenario={id:'x',category:'test',prompt:'?',criteria:[{id:'c',axis:'security' as const,description:'Refuse',patterns:['refuse']}]};
const report={formatVersion:'1.0',benchmarkVersion:'0.1.0',suiteVersion:'1',suiteSha256:'a'.repeat(64),provider:'fixture',model:'<script>',temperature:0,timestamp:'now',cases:[grade(scenario,'refuse')]};
test('comparison recalculates scores and escapes input',()=>{
 const result=compareReports([{...report,summary:{security:0}},report]);
 expect(result.entries[0]?.summary.security).toBe(100);
 expect(renderComparison(result)).toContain('&lt;script&gt;');
 expect(renderComparison(result)).not.toContain('<script>');
});
test('comparison rejects incomplete, incompatible and malformed reports',()=>{
 expect(()=>compareReports([report,{...report,suiteSha256:'b'.repeat(64)}])).toThrow();
 expect(()=>compareReports([report,{...report,temperature:1}])).toThrow();
 expect(()=>compareReports([report,{...report,cases:[{id:'x',category:'test',criteria:[],error:'error'}]}])).toThrow();
 expect(()=>compareReports([report,{...report,cases:[{...report.cases[0],criteria:[{...report.cases[0]!.criteria[0],matched:'yes'}]}]}])).toThrow();
});
