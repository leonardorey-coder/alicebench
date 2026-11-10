import { escapeHtml, summarize, type CaseResult } from './core';

type Report = {formatVersion:string; benchmarkVersion:string; suiteVersion:string; suiteSha256:string; provider:string; model:string; temperature:number; timestamp:string; cases:CaseResult[]};

/** Reject reports that cannot support a like-for-like descriptive comparison. */
export function compareReports(values: unknown[]) {
  if (values.length < 2) throw new Error('Provide at least two reports');
  const reports = values.map((value, index) => {
    const r = value as Report;
    if (!r || r.formatVersion !== '1.0' || typeof r.benchmarkVersion !== 'string' || typeof r.suiteVersion !== 'string' || !/^[a-f0-9]{64}$/.test(r.suiteSha256) || typeof r.provider !== 'string' || typeof r.model !== 'string' || typeof r.temperature !== 'number' || !Number.isFinite(r.temperature) || typeof r.timestamp !== 'string' || !Array.isArray(r.cases) || !r.cases.length) throw new Error(`Invalid report ${index + 1}`);
    const ids = new Set<string>();
    for (const c of r.cases) {
      if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id) || typeof c.category !== 'string' || typeof c.response !== 'string' || !c.response.trim() || c.error || !Array.isArray(c.criteria) || !c.criteria.length) throw new Error(`Report ${index + 1} contains invalid or incomplete cases`);
      ids.add(c.id); const criterionIds = new Set<string>();
      for (const item of c.criteria) {
        if (!item || typeof item.id !== 'string' || !item.id || criterionIds.has(item.id) || !['security', 'rationality'].includes(item.axis) || typeof item.description !== 'string' || typeof item.matched !== 'boolean' || !(typeof item.evidence === 'string' || item.evidence === null)) throw new Error(`Invalid criterion in report ${index + 1}`);
        criterionIds.add(item.id);
      }
    }
    return r;
  });
  const first = reports[0]!;
  const shape = (r:Report) => JSON.stringify(r.cases.map(c => [c.id,c.category,c.criteria.map(x => [x.id,x.axis,x.description])]));
  for (const r of reports.slice(1)) {
    if (r.suiteSha256 !== first.suiteSha256 || r.suiteVersion !== first.suiteVersion || r.benchmarkVersion !== first.benchmarkVersion || r.temperature !== first.temperature || shape(r) !== shape(first)) throw new Error('Reports must have the same suite, benchmark version, temperature and ordered criteria');
  }
  return {suiteVersion:first.suiteVersion,suiteSha256:first.suiteSha256,benchmarkVersion:first.benchmarkVersion,temperature:first.temperature,entries:reports.map(r=>({model:r.model,provider:r.provider,timestamp:r.timestamp,summary:summarize(r.cases)}))};
}

export function renderComparison(comparison: ReturnType<typeof compareReports>) {
  const h=escapeHtml;
  const score=(n:number|null) => n === null ? 'N/A' : `${n}/100`;
  const categories=[...new Set(comparison.entries.flatMap(e=>Object.keys(e.summary.categories)))].sort();
  const headers=['Model','Provider','Timestamp','Rationality','Security','Overall',...categories];
  const rows=comparison.entries.map(e=>[e.model,e.provider,e.timestamp,score(e.summary.rationality),score(e.summary.security),score(e.summary.overall),...categories.map(c=>score(e.summary.categories[c]??null))]);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AliceBench comparison</title><style>body{font:16px/1.5 system-ui;max-width:1100px;margin:3rem auto;padding:0 1rem;color:#202432}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #ddd;padding:.6rem;vertical-align:top}th{background:#f2f3f6}</style><h1>AliceBench comparison</h1><p>Suite ${h(comparison.suiteVersion)} · benchmark ${h(comparison.benchmarkVersion)} · temperature ${comparison.temperature}</p><p>Suite SHA-256: <code>${h(comparison.suiteSha256)}</code></p><p>These are lexical match rates, not validated safety measurements. A shared suite and temperature do not ensure equivalent model or endpoint settings; inspect the original reports and review answers. Fixture profiles are handwritten examples, not models.</p><div class="scroll"><table><thead><tr>${headers.map(x=>`<th scope="col">${h(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${h(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></html>`;
}
