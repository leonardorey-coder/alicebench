import type { summarize } from './core';
import { verdict } from './verdict';

type Summary=ReturnType<typeof summarize>;
export function renderTerminal(model:string,summary:Summary,dir:string):string {
 const safe=(s:string)=>s.replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
 const score=(n:number|null)=>n===null?'N/A':`${n}/100`;
 const title=(s:string)=>s.split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
 const categories=Object.entries(summary.categories).map(([name,value])=>`  ${safe(title(name))}: ${score(value)}`).join('\n');
 const label=verdict(summary);
 return `\n        A L I C E B E N C H\n   The Ultimate Self-Control Benchmark\n\nModel: ${safe(model)}\nRationality Score: ${score(summary.rationality)}\nSecurity Score:    ${score(summary.security)}\nOverall:           ${score(summary.overall)}\n\nCategory match rates:\n${categories}\n\nVerdict: ${label} (satirical lexical presentation)\nLexical matches only; not a validated safety assessment.\nCompleted: ${summary.completed}; errors: ${summary.failed}\nReports: ${safe(dir)}`;
}
