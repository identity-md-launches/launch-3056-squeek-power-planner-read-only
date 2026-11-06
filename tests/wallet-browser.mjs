import assert from 'node:assert/strict';
import { harness, assertReflow } from './browser-support.mjs';
import { mockApi, address } from './fixtures.mjs';
const h=await harness();
try {
 const context=await h.browser.newContext({viewport:{width:390,height:844}});await mockApi(context);
 await context.addInitScript(({address})=>{
   window.__walletRequests=[];window.__walletReject=true;
   function provider(){let chain='0x1',authorized=false;const handlers={};return{
     on:(name,fn)=>{(handlers[name]??=[]).push(fn)},removeListener:(name,fn)=>{handlers[name]=(handlers[name]??[]).filter(x=>x!==fn)},
     request:async({method,params})=>{window.__walletRequests.push(method);
       if(method==='eth_accounts')return authorized?[address]:[];
       if(method==='eth_requestAccounts'){if(window.__walletReject)throw Object.assign(new Error('User rejected'),{code:4001});authorized=true;return[address]}
       if(method==='eth_chainId')return chain;
       if(method==='wallet_switchEthereumChain'){if(!window.__chainAdded)throw Object.assign(new Error('Unknown chain'),{code:4902});chain=params[0].chainId;(handlers.chainChanged??[]).forEach(fn=>fn(chain));return null}
       if(method==='wallet_addEthereumChain'){window.__chainAdded=true;window.__addedChain=params[0];chain=params[0].chainId;(handlers.chainChanged??[]).forEach(fn=>fn(chain));return null}
       if(method==='wallet_revokePermissions'){authorized=false;return null}
       if(method==='wallet_requestPermissions')return[{parentCapability:'eth_accounts'}];
       return[];
     }
   }}
   const wallets=[{provider:provider(),info:{uuid:'74d23f0c-ffb1-40ac-87e9-e11c9ac86411',name:'Test Rabby',rdns:'io.rabby.test',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}},{provider:provider(),info:{uuid:'74d23f0c-ffb1-40ac-87e9-e11c9ac86412',name:'Test MetaMask',rdns:'io.metamask.test',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}}];
   const announce=()=>wallets.forEach(detail=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail})));
   addEventListener('eip6963:requestProvider',announce);announce();
 },{address});
 const p=await context.newPage();await p.goto(h.url);await p.getByRole('button',{name:'Connect',exact:true}).click();
 await p.getByRole('button',{name:'Test Rabby',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Browser wallet',exact:true}).count(),0);await p.getByRole('button',{name:'Test MetaMask',exact:true}).waitFor();
 console.log('PASS EIP-6963 discovers both named providers and hides generic injected row');
 await p.getByRole('button',{name:'Test Rabby',exact:true}).click();await p.getByRole('alert').filter({hasText:'declined'}).waitFor();console.log('PASS rejection is recoverable in the sheet');
 await p.evaluate(()=>{window.__walletReject=false});await p.getByRole('button',{name:'Test Rabby',exact:true}).click();
 await p.locator('header').getByRole('button',{name:'Switch to Sepolia',exact:true}).waitFor();await p.locator('dialog').waitFor({state:'hidden'});
 await assertReflow(p,'connected wrong chain',[320,390,1440]);
 await p.locator('header').getByRole('button',{name:'Switch to Sepolia',exact:true}).click();
 await p.getByRole('dialog').getByRole('button',{name:'Switch to Sepolia',exact:true}).click();
 await p.waitForFunction(()=>window.__chainAdded === true);
 const added=await p.evaluate(()=>window.__addedChain);assert.equal(added.chainId,'0xaa36a7');assert.equal(added.chainName,'Sepolia');
 console.log('PASS wrong-network state switches and adds Sepolia after 4902');
 await p.getByRole('button',{name:'Disconnect wallet',exact:true}).click();await p.getByRole('button',{name:'Connect',exact:true}).waitFor();
 const methods=await p.evaluate(()=>window.__walletRequests);assert(!methods.some(m=>/sendTransaction|sendCalls|sign/.test(m)));console.log('PASS disconnect; no signing or send methods requested');
 console.log('4 connector interaction checks passed (mock EIP-1193 providers; no real wallet).');
}finally{await h.close()}
