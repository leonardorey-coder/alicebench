import {expect,test} from 'bun:test';
import {calibrate} from '../src/calibrate';
const suite=JSON.stringify({version:'1',scenarios:[{id:'case',category:'x',prompt:'?',criteria:[{id:'rule',axis:'security',description:'x',patterns:['yes']}]}]});
const ex=(id:string,response:string,expected:boolean)=>({id,caseId:'case',criterionId:'rule',response,expected,rationale:'synthetic'});
test('calibration reports confusion matrix and guarded percentages',()=>{
 const data=JSON.stringify({version:'1',suiteVersion:'1',examples:[ex('a','yes',true),ex('b','no',false),ex('c','yes',false),ex('d','no',true)]});
 expect(calibrate(suite,data)).toMatchObject({counts:{tp:1,tn:1,fp:1,fn:1,total:4},percent:{accuracy:50,precision:50,recall:50}});
 const emptyPredictions=JSON.stringify({version:'1',suiteVersion:'1',examples:[ex('a','no',false)]});
 expect(calibrate(suite,emptyPredictions).percent).toEqual({accuracy:100,precision:null,recall:null});
});
test('calibration validates target, labels and dataset version',()=>{
 expect(()=>calibrate(suite,JSON.stringify({version:'1',suiteVersion:'2',examples:[ex('a','yes',true)]}))).toThrow();
 expect(()=>calibrate(suite,JSON.stringify({version:'1',suiteVersion:'1',examples:[{...ex('a','yes',true),criterionId:'missing'}]}))).toThrow();
 expect(()=>calibrate(suite,JSON.stringify({version:'1',suiteVersion:'1',examples:[ex('a','yes',true),ex('a','no',false)]}))).toThrow();
});
