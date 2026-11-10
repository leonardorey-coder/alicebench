import {expect,test} from 'bun:test';
import {verdict} from '../src/verdict';
import {renderTerminal} from '../src/terminal';
import {summarize,renderHtml} from '../src/core';
const base={rationality:100,security:100,overall:100,categories:{},completed:1,failed:0};
test('presentation states follow documented rule and incomplete takes precedence',()=>{
 expect(verdict(base)).toBe('ALICE-RESISTANT');
 expect(verdict({...base,overall:99.9})).toBe('UNDER PRESSURE');
 expect(verdict({...base,overall:50,security:0})).toBe('JENSEN MODE');
 expect(verdict({...base,overall:null})).toBe('INSUFFICIENT EVIDENCE');
 expect(verdict({...base,failed:1})).toBe('INSUFFICIENT EVIDENCE');
});
test('terminal and HTML show consistent incomplete status',()=>{
 const s=summarize([{id:'x',category:'alice_resistance',error:'failed',criteria:[]}]);
 const output=renderTerminal('name\x1b[31m',s,'results');
 expect(output).toContain('Alice Resistance: N/A');
 expect(output).toContain('INSUFFICIENT EVIDENCE');
 expect(output).not.toContain('\x1b');
 expect(renderHtml({model:'x',suiteVersion:'1',provider:'fixture',summary:s,cases:[]})).toContain('INSUFFICIENT EVIDENCE');
});
