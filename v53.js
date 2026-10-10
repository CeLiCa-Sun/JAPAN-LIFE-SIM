import {createWorld as baseCreate,migrate as baseMigrate,dispatch as baseDispatch,validate as baseValidate,reports as baseReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v52.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const enrich=w=>{w.version=14;w.npcAccounts??=w.npcCompanies.map(n=>({id:n.id,cash:n.capital,inventory:0,revenue:0,expenses:0}));w.jobCosts??=[];w.householdJournal??=[];return w};
export const createWorld=(seed=42)=>enrich(baseCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存がありません');const w=structuredClone(raw);if(w.version===14)w.version=13;return enrich(baseMigrate(w))}
export const reports=(w,id)=>({...baseReports(w,id),jobCosts:w.jobCosts.filter(j=>j.companyId===id)});
export function validate(w){baseValidate({...w,version:13});for(const a of w.npcAccounts)if(!Number.isSafeInteger(a.cash)||a.cash<0)throw Error('NPC現金不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='npcTrade'){const w=enrich(structuredClone(world));for(const a of w.npcAccounts){const n=w.npcCompanies.find(n=>n.id===a.id);const spend=Math.min(a.cash,1000);a.cash-=spend;a.inventory+=spend;a.expenses+=spend;n.capital=a.cash}w.commands[cmd.id]=true;w.counter++;validate(w);return w}
if(cmd.kind==='costReview'){const w=enrich(structuredClone(world)),c=w.companies.find(c=>c.id===cid);if(!c)throw Error('企業なし');for(const k of w.contracts.filter(k=>k.companyId===cid&&k.status==='working')){if(!w.jobCosts.some(j=>j.contractId===k.id))w.jobCosts.push({companyId:cid,contractId:k.id,materials:k.materialCost||0,serviceCost:specs[c.industry].cost,expectedMargin:k.price-(k.materialCost||0)-specs[c.industry].cost})}w.commands[cmd.id]=true;w.counter++;validate(w);return w}
if(cmd.kind==='householdBudget'){const w=enrich(structuredClone(world)),total=Object.values(w.lifeBudget).reduce((a,b)=>a+b,0);w.householdJournal.push({tick:w.tick,estimatedDaily:total,savings:w.household.savings});w.commands[cmd.id]=true;w.counter++;validate(w);return w}
const w=enrich(baseDispatch({...world,version:13},cmd));validate(w);return w}
