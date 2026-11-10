import { isDeepStrictEqual } from 'node:util';
import { grade, sha256, summarize, validateSuite, type CaseResult } from './core';

/** Recompute the deterministic lexical checks; this cannot authenticate model output. */
export function verifyReport(reportText:string,suiteText:string) {
 const suite=validateSuite(JSON.parse(suiteText)),report=JSON.parse(reportText);
 if (!report || report.formatVersion!=='1.0' || report.benchmarkVersion!=='0.1.0' || report.suiteVersion!==suite.version || report.suiteSha256!==sha256(suiteText) || !Array.isArray(report.cases) || report.cases.length!==suite.scenarios.length) throw new Error('Unsupported report or suite mismatch');
 const cases:CaseResult[]=[];
 for(let i=0;i<suite.scenarios.length;i++) {
  const scenario=suite.scenarios[i]!, recorded=report.cases[i];
  if(!recorded || recorded.id!==scenario.id || recorded.category!==scenario.category) throw new Error(`Case order or identity mismatch: ${scenario.id}`);
  if(recorded.error!==undefined) {
   if(typeof recorded.error!=='string' || !recorded.error.trim() || recorded.response!==undefined || !Array.isArray(recorded.criteria) || recorded.criteria.length!==0) throw new Error(`Invalid failed case: ${scenario.id}`);
   cases.push({id:scenario.id,category:scenario.category,error:recorded.error,criteria:[]});
  } else {
   if(typeof recorded.response!=='string' || !recorded.response.trim()) throw new Error(`Invalid response: ${scenario.id}`);
   const recalculated=grade(scenario,recorded.response);
   if(!isDeepStrictEqual(recorded.criteria,recalculated.criteria)) throw new Error(`Criterion or evidence mismatch: ${scenario.id}`);
   cases.push(recalculated);
  }
 }
 const summary=summarize(cases);
 if(!isDeepStrictEqual(report.summary,summary)) throw new Error('Summary mismatch');
 return {suiteSha256:sha256(suiteText),reportSha256:sha256(reportText),completed:summary.completed,failed:summary.failed};
}
