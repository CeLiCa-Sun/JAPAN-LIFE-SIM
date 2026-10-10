import {createWorld as create66,migrate as migrate66,dispatch as dispatch66,validate as validate66,reports as reports66,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v66.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const up=w=>{w.version=28;w.sectorDashboards??=[];w.npcMarkets??=[];w.financialChecks??=[];w.lifeChecks??=[];return w};
export const createWorld=(seed=42)=>up(create66(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const w=structuredClone(raw);if(w.version===28)w.version=27;return up(migrate66(w))}
export const reports=(w,id)=>({...reports66(w,id),dashboards:w.sectorDashboards.filter(x=>x.companyId===id).slice(-5),financialChecks:w.financialChecks.filter(x=>x.companyId===id).slice(-5)});
export function validate(w){validate66({...w,version:27});for(const x of w.financialChecks)if(!Number.isSafeInteger(x.cash))throw Error('資金データ不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const id=cmd.companyId||world.companies[0].id;
if(cmd.kind==='sectorDashboard'){const w=up(structuredClone(world)),c=w.companies.find(x=>x.id===id);if(!c)throw Error('会社なし');w.sectorDashboards.push({companyId:id,tick:w.tick,industry:c.industry,active:w.contracts.filter(x=>x.companyId===id&&x.status==='working').length,staff:w.staff.filter(x=>x.companyId===id).length,facilities:w.facilities.filter(x=>x.companyId===id).length,cash:c.cash});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcMarketRun'){const w=up(dispatch66({...world,version:27},{...cmd,kind:'npcDecision'}));w.npcMarkets.push({tick:w.tick,companies:w.npcAccounts.length,cash:w.npcAccounts.reduce((s,x)=>s+x.cash,0)});validate(w);return w}
if(cmd.kind==='financialCheck'){const w=up(structuredClone(world)),c=w.companies.find(x=>x.id===id);if(!c)throw Error('会社なし');const bs=reports(w,id).bs;w.financialChecks.push({companyId:id,tick:w.tick,cash:c.cash,imbalance:bs.totalAssets-bs.totalLiabilitiesEquity});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='lifeCheck'){const w=up(structuredClone(world));w.lifeChecks.push({tick:w.tick,rent:w.housing.rent,liquid:w.playerCash+w.household.savings,employer:w.personal.job});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
const w=up(dispatch66({...world,version:27},cmd));validate(w);return w}
