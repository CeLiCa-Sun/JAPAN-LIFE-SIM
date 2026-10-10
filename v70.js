import {createWorld as oldCreate,migrate as oldMigrate,dispatch as oldDispatch,validate as oldValidate,reports as oldReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v69.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
export const OPERATIONS={automotive:['部品組立','完成検査','出荷確認'],rental:['車両貸出','返却点検','清掃整備'],repair:['故障診断','交換作業','引渡検査'],bus:['運行点呼','営業運行','車両点検'],manufacturing:['材料投入','製造加工','品質検査'],logistics:['荷物積込','配送運行','納品確認']};
const update=w=>{w.version=31;w.sectorTasks70??=[];w.npcCycles70??=[];w.financialStatements70??=[];w.householdStatements70??=[];return w};
export const createWorld=(seed=42)=>update(oldCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const w=structuredClone(raw);if(w.version===31)w.version=30;return update(oldMigrate(w))}
export const reports=(w,id)=>({...oldReports(w,id),sectorTasks70:w.sectorTasks70.filter(x=>x.companyId===id).slice(-12)});
export function validate(w){oldValidate({...w,version:30});for(const x of w.sectorTasks70)if(!OPERATIONS[x.industry]?.includes(x.task))throw Error('業種工程不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='sectorTask70'){const c=world.companies.find(x=>x.id===cid);if(!c)throw Error('会社なし');const tasks=OPERATIONS[c.industry],step=cmd.step??0;if(!Number.isInteger(step)||step<0||step>=tasks.length)throw Error('工程不正');const w=update(structuredClone(world));w.sectorTasks70.push({tick:w.tick,companyId:cid,industry:c.industry,task:tasks[step],staff:w.staff.filter(x=>x.companyId===cid).length,facility:w.facilities.filter(x=>x.companyId===cid).length});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcCycle70'){const w=update(oldDispatch({...world,version:30},{...cmd,kind:'npcTrade69'}));w.npcCycles70.push({tick:w.tick,companyCount:w.npcAccounts.length,cash:w.npcAccounts.reduce((n,x)=>n+x.cash,0)});validate(w);return w}
if(cmd.kind==='finance70'){const w=update(oldDispatch({...world,version:30},{...cmd,kind:'financeAudit69'}));const c=w.companies.find(x=>x.id===cid);w.financialStatements70.push({tick:w.tick,companyId:cid,cash:c.cash,receivables:c.receivables,payables:c.payables});validate(w);return w}
if(cmd.kind==='household70'){const w=update(oldDispatch({...world,version:30},{...cmd,kind:'lifeAudit69'}));w.householdStatements70.push({tick:w.tick,liquid:w.playerCash+w.household.savings,rent:w.housing.rent});validate(w);return w}
const w=update(oldDispatch({...world,version:30},cmd));validate(w);return w}
