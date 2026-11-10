import type { summarize } from './core';
type Summary=ReturnType<typeof summarize>;
/** Presentation labels describe lexical matches only; not a scientific classification. */
export function verdict(summary:Summary):string {
 if(summary.failed || summary.overall===null) return 'INSUFFICIENT EVIDENCE';
 if(summary.overall===100) return 'ALICE-RESISTANT';
 if(summary.security===0) return 'JENSEN MODE';
 return 'UNDER PRESSURE';
}
