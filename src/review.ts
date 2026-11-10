import { sha256, summarize, validateSuite, type CaseResult } from './core';

type ReviewItem = {caseId:string; criterionId:string; axis:'security'|'rationality'; description:string; passed:boolean|null; rationale:string};
type Review = {formatVersion:string; reportSha256:string; suiteSha256:string; reviewer:string; items:ReviewItem[]};

/** Create an editable review bound to the exact report and suite bytes. */
export function createReview(reportText:string, suiteText:string):Review {
  const suite=validateSuite(JSON.parse(suiteText));
  const report=JSON.parse(reportText);
  if (report.formatVersion!=='1.0' || report.suiteSha256!==sha256(suiteText) || !Array.isArray(report.cases) || report.cases.length!==suite.scenarios.length) throw new Error('Report and suite do not match');
  const items:ReviewItem[]=[];
  for (let i=0;i<suite.scenarios.length;i++) {
    const scenario=suite.scenarios[i]!, result=report.cases[i];
    if (!result || result.id!==scenario.id || result.category!==scenario.category || result.error || typeof result.response!=='string' || !result.response.trim() || !Array.isArray(result.criteria) || result.criteria.length!==scenario.criteria.length) throw new Error(`Incomplete or mismatched case: ${scenario.id}`);
    for (let j=0;j<scenario.criteria.length;j++) {
      const criterion=scenario.criteria[j]!, recorded=result.criteria[j];
      if (!recorded || recorded.id!==criterion.id || recorded.axis!==criterion.axis || recorded.description!==criterion.description || typeof recorded.matched!=='boolean') throw new Error(`Mismatched criterion: ${scenario.id}/${criterion.id}`);
      items.push({caseId:scenario.id,criterionId:criterion.id,axis:criterion.axis,description:criterion.description,passed:null,rationale:''});
    }
  }
  return {formatVersion:'1.0',reportSha256:sha256(reportText),suiteSha256:sha256(suiteText),reviewer:'',items};
}

/** Score only complete, independently supplied judgments for the exact original inputs. */
export function scoreReview(reportText:string, suiteText:string, value:unknown) {
  const template=createReview(reportText,suiteText), review=value as Review;
  if (!review || review.formatVersion!=='1.0' || review.reportSha256!==template.reportSha256 || review.suiteSha256!==template.suiteSha256 || typeof review.reviewer!=='string' || !review.reviewer.trim() || !Array.isArray(review.items) || review.items.length!==template.items.length) throw new Error('Invalid review, missing reviewer, or input hash mismatch');
  const report=JSON.parse(reportText); const judged:CaseResult[]=[]; let index=0, agree=0;
  for (const source of report.cases) {
    const criteria=[];
    for (const original of source.criteria) {
      const item=review.items[index], expected=template.items[index];
      if (!item || !expected || item.caseId!==expected.caseId || item.criterionId!==expected.criterionId || item.axis!==expected.axis || item.description!==expected.description || typeof item.passed!=='boolean' || typeof item.rationale!=='string' || !item.rationale.trim()) throw new Error(`Incomplete or mismatched review item ${index+1}`);
      if(item.passed===original.matched) agree++;
      criteria.push({id:item.criterionId,axis:item.axis,description:item.description,matched:item.passed,evidence:null}); index++;
    }
    judged.push({id:source.id,category:source.category,criteria});
  }
  return {formatVersion:'1.0',method:'human-review',reviewer:review.reviewer,reportSha256:template.reportSha256,suiteSha256:template.suiteSha256,reviewSha256:sha256(JSON.stringify(review)),summary:summarize(judged),lexicalAgreement:{agreed:agree,total:index,percent:Math.round(1000*agree/index)/10}};
}

/** Excludes provider, model identity and heuristic labels; response content can still reveal identity. */
export function createReviewPacket(reportText:string, suiteText:string) {
  const template=createReview(reportText,suiteText), report=JSON.parse(reportText), suite=validateSuite(JSON.parse(suiteText));
  return {formatVersion:'1.0',reportSha256:template.reportSha256,suiteSha256:template.suiteSha256,cases:suite.scenarios.map((s,i)=>({id:s.id,prompt:s.prompt,response:report.cases[i].response,criteria:s.criteria.map(c=>({id:c.id,axis:c.axis,description:c.description}))}))};
}

/** Pairwise unweighted Cohen's kappa for two complete independent binary reviews. */
export function reviewAgreement(reportText:string,suiteText:string,a:unknown,b:unknown) {
  const scoreA=scoreReview(reportText,suiteText,a),scoreB=scoreReview(reportText,suiteText,b);
  if(scoreA.reviewer.trim()===scoreB.reviewer.trim()) throw new Error('Reviewer IDs must be distinct');
  const reviewA=a as Review,reviewB=b as Review;
  let bothPass=0,bothFail=0,aPassBFail=0,aFailBPass=0;
  for(let i=0;i<reviewA.items.length;i++) {
    const x=reviewA.items[i]!.passed,y=reviewB.items[i]!.passed;
    if(x&&y)bothPass++; else if(!x&&!y)bothFail++; else if(x)aPassBFail++; else aFailBPass++;
  }
  const total=bothPass+bothFail+aPassBFail+aFailBPass;
  const observed=(bothPass+bothFail)/total;
  const pA=(bothPass+aPassBFail)/total,pB=(bothPass+aFailBPass)/total;
  const expected=pA*pB+(1-pA)*(1-pB);
  const kappa=1-expected<1e-12?null:Math.round((observed-expected)/(1-expected)*10000)/10000;
  return {formatVersion:'1.0',method:'binary-cohen-kappa',reportSha256:scoreA.reportSha256,suiteSha256:scoreA.suiteSha256,reviewers:[scoreA.reviewer,scoreB.reviewer],reviewSha256:[scoreA.reviewSha256,scoreB.reviewSha256],matrix:{bothPass,bothFail,aPassBFail,aFailBPass,total},observedAgreement:Math.round(observed*10000)/10000,expectedAgreement:Math.round(expected*10000)/10000,kappa};
}
