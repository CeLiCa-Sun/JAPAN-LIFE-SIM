import {createWorld as baseCreate,migrate as baseMigrate,dispatch as baseDispatch,validate as baseValidate,reports as baseReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v61.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
function enrich(w){w.version=23;w.npcTradeSummary??=[];w.sectorPerformance??={};w.fiveYearAudits??=[];w.cashFlowHistory??=[];return w}
export const createWorld=(seed=42)=>enrich(baseCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存データがありません');const w=structuredClone(raw);if(w.version===23)w.version=22;return enrich(baseMigrate(w))}
export function reports(w,id){return {...baseReports(w,id),performance:w.sectorPerformance[id]||null,cashHistory:w.cashFlowHistory.filter(x=>x.companyId===id).slice(-12)}}
export function validate(w){baseValidate({...w,version:22});for(const x of w.cashFlowHistory)if(!Number.isSafeInteger(x.cash))throw Error('現金残高不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='sectorPerformance'){const w=enrich(baseDispatch({...world,version:22},{...cmd,kind:'sectorSnapshot'}));const c=w.companies.find(x=>x.id===cid),jobs=w.contracts.filter(x=>x.companyId===cid),costs=w.stageExpenses.filter(x=>x.companyId===cid).reduce((s,x)=>s+x.amount,0);w.sectorPerformance[cid]={industry:c.industry,tick:w.tick,contracts:jobs.length,stageCosts:costs,cash:c.cash,profit:c.profit};validate(w);return w}
if(cmd.kind==='npcBusinessRound'){const w=enrich(baseDispatch({...world,version:22},{...cmd,kind:'npcStrategyCycle'}));w.npcTradeSummary.push({tick:w.tick,transactions:w.npcMarketCycles.length,cashTotal:w.npcAccounts.reduce((s,x)=>s+x.cash,0),inventoryTotal:w.npcAccounts.reduce((s,x)=>s+x.inventory,0)});validate(w);return w}
if(cmd.kind==='recordCashFlow'){const w=enrich(structuredClone(world)),c=w.companies.find(x=>x.id===cid);if(!c)throw Error('企業がありません');w.cashFlowHistory.push({companyId:cid,tick:w.tick,cash:c.cash,payables:c.payables,profit:c.profit});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='fiveYearAudit'){const years=cmd.years??5;if(!Number.isSafeInteger(years)||years<1||years>5)throw Error('年数不正');let w=world;for(let i=0;i<years;i++)w=baseDispatch({...w,version:22},{id:cmd.id+'-year-'+i,companyId:cid,kind:'yearAdvance',days:365});w=enrich(w);w.fiveYearAudits.push({tick:w.tick,years,companies:w.companies.length});w.commands[cmd.id]=true;validate(w);return w}
const w=enrich(baseDispatch({...world,version:22},cmd));validate(w);return w}
