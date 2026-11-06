import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { harness } from './browser-support.mjs';
import { mockApi } from './fixtures.mjs';
const require=createRequire(import.meta.url);
const axe=await readFile(process.env.PLANNER_AXE ?? require.resolve('axe-core/axe.min.js'),'utf8');
const h=await harness();
let count=0;
try{
 const context=await h.browser.newContext({viewport:{width:390,height:844}});await mockApi(context);const p=await context.newPage();await p.goto(h.url);
 async function audit(name){await p.evaluate(axe);const result=await p.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}}));if(result.violations.length){console.log(JSON.stringify(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),null,2));throw Error(name+' accessibility violations')}count++;console.log('PASS axe '+name+' ('+result.passes.length+' rules)')}
 await p.getByRole('heading',{name:'Wallet overview'}).waitFor();await audit('empty wallet');
 await p.getByRole('button',{name:'Connect',exact:true}).click();await audit('connect dialog');await p.keyboard.press('Escape');
 await p.getByRole('button',{name:'View public reserve'}).click();await p.getByRole('heading',{name:'Squeek #8990',exact:true}).waitFor();await audit('loaded wallet');
 await p.getByRole('link',{name:'Simulator',exact:true}).click();await audit('deposit planner');
 await p.getByRole('button',{name:'Merge',exact:true}).click();await p.getByLabel('Survivor',{exact:true}).selectOption('8990');await p.getByLabel('Donor',{exact:true}).selectOption('8991');await audit('merge planner');
 await p.getByRole('button',{name:'Unstake',exact:true}).click();await p.getByLabel('Amount in SQK').fill('4000');await audit('invalid unstake');
 await p.getByRole('link',{name:'Network',exact:true}).click();await audit('network');
 await p.getByRole('link',{name:'About',exact:true}).click();await audit('about');
 console.log(count+' accessibility states checked. Automated scan only, not a screen-reader session.');
}finally{await h.close()}
