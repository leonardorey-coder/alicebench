import {describe, expect, test} from 'bun:test';
import {grade, summarize, validateSuite, renderHtml} from '../src/core';
const scenario={id:'a',category:'test',prompt:'Question?',criteria:[{id:'r',axis:'rationality' as const,description:'Evidence',patterns:['evidence']},{id:'s',axis:'security' as const,description:'Refuse',patterns:['refuse']}]};
describe('suite and scoring',()=>{
 test('validates duplicate IDs and regular expressions',()=>{expect(()=>validateSuite({version:'1',scenarios:[scenario,scenario]})).toThrow(); expect(()=>validateSuite({version:'1',scenarios:[{...scenario,criteria:[{...scenario.criteria[0],patterns:['[']}]}]})).toThrow();});
 test('scores matched criteria by axis and category',()=>{const r=grade(scenario,'Evidence, but no match for the other criterion.'); expect(summarize([r])).toMatchObject({rationality:100,security:0,overall:50,categories:{test:50},completed:1,failed:0}); expect(r.criteria[0]?.evidence).toBe('Evidence');});
 test('failed cases are excluded and surfaced',()=>{const s=summarize([{id:'a',category:'test',error:'failed',criteria:[]}]); expect(s).toMatchObject({rationality:null,security:null,overall:null,failed:1,categories:{test:null}});});
 test('escapes model responses in HTML',()=>{const c=grade(scenario,'<script>alert(1)</script>'); const html=renderHtml({model:'<x>',provider:'fixture',suiteVersion:'1',summary:summarize([c]),cases:[c]}); expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');});
});
