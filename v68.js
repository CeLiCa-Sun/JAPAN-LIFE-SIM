import {createWorld as previousCreate,migrate as previousMigrate,dispatch as previousDispatch,validate as previousValidate,reports as previousReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v67.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const expand=w=>{w.version=29;w.productionReviews??=[];w.npcRounds68??=[];w.financialReviews68??=[];w.householdReviews68??=[];return w};
export const createWorld=(seed=42)=>expand(previousCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const w=structuredClone(raw);if(w.version===29)w.version=28;return expand(previousMigrate(w))}
export function reports(w,id){return {...previousReports(w,id),production:w.productionReviews.filter(x=>x.companyId===id).slice(-10),finances68:w.financialReviews68.filter(x=>x.companyId===id).slice(-10)}}
export function validate(w){previousValidate({...w,version:28});for(const x of w.productionReviews)if(!INDUSTRIES.includes(x.industry))throw Error('業種不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='productionReview'){const w=expand(structuredClone(world)),c=w.companies.find(x=>x.id===cid);if(!c)throw Error('会社なし');const jobs=w.contracts.filter(x=>x.companyId===cid);w.productionReviews.push({tick:w.tick,companyId:cid,industry:c.industry,materials:specs[c.industry].materials,requiredMaterial:specs[c.industry].material,working:jobs.filter(x=>x.status==='working').length,employees:w.staff.filter(x=>x.companyId===cid).length,cash:c.cash});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcCycle68'){const w=expand(previousDispatch({...world,version:28},{...cmd,kind:'npcMarketRun'}));w.npcRounds68.push({tick:w.tick,totalCash:w.npcAccounts.reduce((a,b)=>a+b.cash,0),totalInventory:w.npcAccounts.reduce((a,b)=>a+b.inventory,0)});validate(w);return w}
if(cmd.kind==='financeReview68'){const w=expand(previousDispatch({...world,version:28},{...cmd,kind:'financialCheck'}));w.financialReviews68.push({tick:w.tick,companyId:cid,cash:w.companies.find(x=>x.id===cid).cash});validate(w);return w}
if(cmd.kind==='householdReview68'){const w=expand(previousDispatch({...world,version:28},{...cmd,kind:'lifeCheck'}));w.householdReviews68.push({tick:w.tick,liquid:w.playerCash+w.household.savings,rent:w.housing.rent});validate(w);return w}
const w=expand(previousDispatch({...world,version:28},cmd));validate(w);return w}
