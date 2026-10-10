import {createWorld as oldCreate,migrate as oldMigrate,dispatch as oldDispatch,validate as oldValidate,reports as oldReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v68.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const update=w=>{w.version=30;w.industryWorkflows??=[];w.npcOrders69??=[];w.financeAudits69??=[];w.lifeAudits69??=[];return w};
export const createWorld=(seed=42)=>update(oldCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const r=structuredClone(raw);if(r.version===30)r.version=29;return update(oldMigrate(r))}
export const reports=(w,id)=>({...oldReports(w,id),workflows:w.industryWorkflows.filter(x=>x.companyId===id).slice(-10)});
export function validate(w){oldValidate({...w,version:29});for(const x of w.industryWorkflows)if(!INDUSTRIES.includes(x.industry))throw Error('無効な業種');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='industryWorkflow'){const w=update(structuredClone(world)),c=w.companies.find(x=>x.id===cid);if(!c)throw Error('会社が存在しません');const jobs=w.contracts.filter(x=>x.companyId===cid);w.industryWorkflows.push({tick:w.tick,companyId:cid,industry:c.industry,product:specs[c.industry].product,material:specs[c.industry].material,staff:w.staff.filter(x=>x.companyId===cid).length,facilities:w.facilities.filter(x=>x.companyId===cid).length,working:jobs.filter(x=>x.status==='working').length});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcTrade69'){const w=update(oldDispatch({...world,version:29},{...cmd,kind:'npcCycle68'}));w.npcOrders69.push({tick:w.tick,transactions:w.npcSales.length,cash:w.npcAccounts.reduce((s,x)=>s+x.cash,0)});validate(w);return w}
if(cmd.kind==='financeAudit69'){const w=update(oldDispatch({...world,version:29},{...cmd,kind:'financeReview68'}));w.financeAudits69.push({tick:w.tick,companyId:cid,entries:w.ledger.filter(x=>x.companyId===cid).length});validate(w);return w}
if(cmd.kind==='lifeAudit69'){const w=update(oldDispatch({...world,version:29},{...cmd,kind:'householdReview68'}));w.lifeAudits69.push({tick:w.tick,cash:w.playerCash,savings:w.household.savings,rent:w.housing.rent});validate(w);return w}
const w=update(oldDispatch({...world,version:29},cmd));validate(w);return w}
