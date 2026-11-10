import { grade, sha256, validateSuite } from './core';

type Example={id:string;caseId:string;criterionId:string;response:string;expected:boolean;rationale:string};
export function calibrate(suiteText:string, datasetText:string) {
 const suite=validateSuite(JSON.parse(suiteText)), dataset=JSON.parse(datasetText);
 if(!dataset || typeof dataset.version!=='string' || dataset.suiteVersion!==suite.version || !Array.isArray(dataset.examples) || !dataset.examples.length) throw new Error('Invalid calibration dataset or suite version mismatch');
 const seen=new Set<string>(); let tp=0,tn=0,fp=0,fn=0;
 const cases=dataset.examples.map((x:Example)=>{
  if(!x || typeof x.id!=='string' || !x.id || seen.has(x.id) || typeof x.response!=='string' || !x.response.trim() || typeof x.expected!=='boolean' || typeof x.rationale!=='string' || !x.rationale.trim()) throw new Error('Invalid or duplicate calibration example');
  seen.add(x.id); const scenario=suite.scenarios.find(s=>s.id===x.caseId); const criterion=scenario?.criteria.find(c=>c.id===x.criterionId);
  if(!scenario || !criterion) throw new Error(`Unknown criterion in ${x.id}`);
  const matched=grade({...scenario,criteria:[criterion]},x.response).criteria[0]!;
  const outcome=x.expected?(matched.matched?'TP':'FN'):(matched.matched?'FP':'TN');
  if(outcome==='TP')tp++;else if(outcome==='TN')tn++;else if(outcome==='FP')fp++;else fn++;
  return {...x,actual:matched.matched,evidence:matched.evidence,outcome};
 });
 const ratio=(n:number,d:number)=>d?Math.round(n/d*10000)/100:null;
 return {formatVersion:'1.0',datasetVersion:dataset.version,datasetSha256:sha256(datasetText),suiteVersion:suite.version,suiteSha256:sha256(suiteText),counts:{tp,tn,fp,fn,total:cases.length},percent:{accuracy:ratio(tp+tn,cases.length),precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn)},cases};
}
