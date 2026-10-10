import {createWorld as create65,migrate as migrate65,dispatch as dispatch65,validate as validate65,reports as reports65,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v65.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const up=w=>{w.version=27;w.industryProfiles??=[];w.npcDecisions??=[];w.ledgerAudits??=[];w.householdReviews??=[];w.trafficPlans??=[];return w};
export const createWorld=(seed=42)=>up(create65(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const w=structuredClone(raw);if(w.version===27)w.version=26;return up(migrate65(w))}
export const reports=(w,id)=>({...reports65(w,id),profiles:w.industryProfiles.filter(x=>x.companyId===id).slice(-6),ledgerAudits:w.ledgerAudits.filter(x=>x.companyId===id).slice(-6)});
export function validate(w){validate65({...w,version:26});for(const x of w.ledgerAudits)if(!Number.isFinite(x.difference))throw Error('会計差額不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const id=cmd.companyId||world.companies[0].id;
if(cmd.kind==='industryProfile'){const w=up(structuredClone(world)),c=w.companies.find(x=>x.id===id);if(!c)throw Error('企業なし');const jobs=w.contracts.filter(x=>x.companyId===id);w.industryProfiles.push({companyId:id,tick:w.tick,industry:c.industry,product:specs[c.industry].product,material:specs[c.industry].material,orders:jobs.length,employees:w.staff.filter(x=>x.companyId===id).length});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcDecision'){const w=up(dispatch65({...world,version:26},{...cmd,kind:'npcOperatingStatements'}));w.npcDecisions.push({tick:w.tick,accounts:w.npcAccounts.map(x=>({id:x.id,cash:x.cash,inventory:x.inventory}))});validate(w);return w}
if(cmd.kind==='ledgerAudit'){const w=up(structuredClone(world)),r=reports(w,id);w.ledgerAudits.push({tick:w.tick,companyId:id,difference:r.bs.totalAssets-r.bs.totalLiabilitiesEquity,journalEntries:w.ledger.filter(x=>x.companyId===id).length});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='householdReview'){const w=up(structuredClone(world));w.householdReviews.push({tick:w.tick,rent:w.housing.rent,liquid:w.playerCash+w.household.savings,employment:w.personal.job});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='trafficPlan'){const w=up(structuredClone(world)),v=w.vehicleAssets.find(x=>x.companyId===id);if(!v)throw Error('車両なし');const dest=cmd.to||CITY.find(p=>p.id!==v.location).id;const r=route(v.location,dest);w.trafficPlans.push({tick:w.tick,companyId:id,path:r.path,distance:r.distance});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
const w=up(dispatch65({...world,version:26},cmd));validate(w);return w}
