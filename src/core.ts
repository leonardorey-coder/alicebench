import { createHash } from 'node:crypto';
import { verdict } from './verdict';

export type Axis = 'rationality' | 'security';
export type Criterion = { id: string; axis: Axis; description: string; patterns: string[] };
export type Scenario = { id: string; category: string; prompt: string; criteria: Criterion[] };
export type Suite = { version: string; scenarios: Scenario[] };
export type CaseResult = { id: string; category: string; response?: string; error?: string; criteria: Array<{id:string; axis:Axis; description:string; matched:boolean; evidence:string|null}> };

export function validateSuite(value: unknown): Suite {
  const s = value as Suite;
  if (!s || typeof s.version !== 'string' || !s.version || !Array.isArray(s.scenarios) || !s.scenarios.length) throw new Error('Suite needs a version and nonempty scenarios array');
  const ids = new Set<string>();
  for (const c of s.scenarios) {
    if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id) || typeof c.category !== 'string' || !c.category || typeof c.prompt !== 'string' || !c.prompt || !Array.isArray(c.criteria) || !c.criteria.length) throw new Error(`Invalid or duplicate scenario: ${c?.id}`);
    ids.add(c.id); const criteriaIds = new Set<string>();
    for (const r of c.criteria) {
      if (!r || typeof r.id !== 'string' || !r.id || criteriaIds.has(r.id) || !['security','rationality'].includes(r.axis) || typeof r.description !== 'string' || !r.description || !Array.isArray(r.patterns) || !r.patterns.length || r.patterns.some(p => typeof p !== 'string' || !p)) throw new Error(`Invalid criterion in ${c.id}`);
      criteriaIds.add(r.id); for (const p of r.patterns) new RegExp(p, 'i');
    }
  }
  return s;
}
export function grade(c: Scenario, response: string): CaseResult {
  return {id:c.id, category:c.category, response, criteria:c.criteria.map(r => {
    const match = r.patterns.map(p => new RegExp(p,'i').exec(response)).find(Boolean);
    return {id:r.id, axis:r.axis, description:r.description, matched:!!match, evidence:match?.[0] ?? null};
  })};
}
export function summarize(cases: CaseResult[]) {
  const score = (axis?: Axis) => { const checks = cases.flatMap(c => c.criteria).filter(c => !axis || c.axis === axis); return checks.length ? Math.round(100 * checks.filter(c=>c.matched).length / checks.length * 10) / 10 : null; };
  const categories: Record<string, number|null> = {}; for (const name of [...new Set(cases.map(c=>c.category))].sort()) categories[name] = summarizeCategory(cases.filter(c=>c.category===name));
  return { rationality:score('rationality'), security:score('security'), overall:score(), categories, completed:cases.filter(c=>!c.error).length, failed:cases.filter(c=>!!c.error).length };
}
function summarizeCategory(cases: CaseResult[]) { const checks=cases.flatMap(c=>c.criteria); return checks.length ? Math.round(1000*checks.filter(c=>c.matched).length/checks.length)/10 : null; }
export const sha256 = (text:string) => createHash('sha256').update(text).digest('hex');
export const escapeHtml = (value:unknown) => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderHtml(report: any): string {
  const h=escapeHtml; const score=(v:unknown)=>v===null?'N/A':`${v}/100`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AliceBench report</title><style>body{font:16px/1.5 system-ui;max-width:900px;margin:3rem auto;padding:0 1rem;color:#202432}pre{white-space:pre-wrap;background:#f2f3f6;padding:1rem;overflow-wrap:anywhere}.metrics{display:flex;gap:2rem;flex-wrap:wrap}section{border-top:1px solid #ddd;padding:1rem 0}.pass{color:#176b42}.fail{color:#a22}</style><h1>AliceBench report</h1><p>Model: ${h(report.model)} · Suite ${h(report.suiteVersion)} · ${h(report.provider)}</p><p>Heuristic keyword matches are proxies, not validated safety measurements. Review responses and failed cases.</p><p><strong>Verdict: ${h(verdict(report.summary))}</strong> — satirical presentation based on lexical matches, not a scientific classification.</p><div class="metrics"><p>Rationality: <strong>${score(report.summary.rationality)}</strong></p><p>Security: <strong>${score(report.summary.security)}</strong></p><p>Overall: <strong>${score(report.summary.overall)}</strong></p></div><p>Completed: ${report.summary.completed}; errors: ${report.summary.failed}</p>${report.cases.map((c:CaseResult)=>`<section><h2>${h(c.id)} — ${h(c.category)}</h2>${c.error?`<p class="fail">Error: ${h(c.error)}</p>`:`<pre>${h(c.response)}</pre><ul>${c.criteria.map(x=>`<li class="${x.matched?'pass':'fail'}">${x.matched?'MATCH':'NO MATCH'}: ${h(x.description)}${x.evidence?` — <q>${h(x.evidence)}</q>`:''}</li>`).join('')}</ul>`}</section>`).join('')}</html>`;
}
