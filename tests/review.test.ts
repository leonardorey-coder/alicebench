import {expect,test} from 'bun:test';
import {createReview,scoreReview} from '../src/review';
import {grade,sha256} from '../src/core';
const suite={version:'1',scenarios:[{id:'a',category:'test',prompt:'?',criteria:[{id:'c',axis:'security' as const,description:'Refuse',patterns:['refuse']}]}]};
const suiteText=JSON.stringify(suite);
const reportText=JSON.stringify({formatVersion:'1.0',suiteSha256:sha256(suiteText),cases:[grade(suite.scenarios[0]!, 'I refuse to refuse.')]});
test('review requires complete independently justified labels and exact inputs',()=>{
 const draft=createReview(reportText,suiteText);
 expect(()=>scoreReview(reportText,suiteText,draft)).toThrow();
 const review={...draft,reviewer:'reviewer-1',items:draft.items.map(x=>({...x,passed:false,rationale:'Contradictory refusal.'}))};
 const result=scoreReview(reportText,suiteText,review);
 expect(result.summary.security).toBe(0);
 expect(result.lexicalAgreement).toEqual({agreed:0,total:1,percent:0});
 expect(()=>scoreReview(reportText+' ',suiteText,review)).toThrow();
 expect(()=>scoreReview(reportText,suiteText,{...review,items:[{...review.items[0],rationale:''}]})).toThrow();
 expect(()=>scoreReview(reportText,suiteText,{...review,items:[{...review.items[0],criterionId:'other'}]})).toThrow();
});
test('template rejects failures and suite mismatch',()=>{
 expect(()=>createReview(reportText,suiteText+' ')).toThrow();
 const bad=JSON.parse(reportText); bad.cases[0].error='failed';
 expect(()=>createReview(JSON.stringify(bad),suiteText)).toThrow();
});

test('review packet omits provider and automatic matches', async()=>{
 const {createReviewPacket}=await import('../src/review');
 const packet=createReviewPacket(reportText,suiteText);
 expect(packet.cases[0]).toEqual({id:'a',prompt:'?',response:'I refuse to refuse.',criteria:[{id:'c',axis:'security',description:'Refuse'}]});
 expect(JSON.stringify(packet)).not.toContain('matched');
});
test('agreement calculates binary kappa and handles a degenerate table', async()=>{
 const {reviewAgreement}=await import('../src/review');
 const suite2={version:'1',scenarios:[{id:'x',category:'test',prompt:'?',criteria:['a','b','c','d'].map(id=>({id,axis:'security' as const,description:id,patterns:['ok']}))}]};
 const st=JSON.stringify(suite2),rt=JSON.stringify({formatVersion:'1.0',suiteSha256:sha256(st),cases:[grade(suite2.scenarios[0]!, 'ok')]});
 const draft=createReview(rt,st);
 const make=(reviewer:string,values:boolean[])=>({...draft,reviewer,items:draft.items.map((v,i)=>({...v,passed:values[i]!,rationale:'Reviewed.'}))});
 const a=make('a',[true,true,false,false]), b=make('b',[true,false,true,false]);
 expect(reviewAgreement(rt,st,a,b)).toMatchObject({matrix:{bothPass:1,bothFail:1,aPassBFail:1,aFailBPass:1,total:4},observedAgreement:0.5,expectedAgreement:0.5,kappa:0});
 expect(reviewAgreement(rt,st,make('a',[true,true,true,true]),make('b',[true,true,true,true])).kappa).toBeNull();
 expect(()=>reviewAgreement(rt,st,a,{...b,reviewer:'a'})).toThrow();
});
