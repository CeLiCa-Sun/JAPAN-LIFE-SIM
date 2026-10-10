import {createWorld as oldCreate,migrate as oldMigrate,dispatch as oldDispatch,validate as oldValidate,reports as oldReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v49.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const phases={automotive:['調達','組立','検査'],rental:['点検','貸出','返却'],repair:['診断','整備','納車'],bus:['出庫','運行','帰庫'],manufacturing:['切削','検査','出荷'],logistics:['集荷','配車','配送']};
function upgrade(w){w.version=11;w.businessCycles??=[];w.npcEconomy??={cycles:0};w.districtStructures??=CITY.map((x,i)=>({id:'B-'+x.id,x:x.x,y:x.y,height:10+i*3}));w.gameMetrics??={};return w}
export function createWorld(seed=42){return upgrade(oldCreate(seed))}
export function migrate(raw){if(!raw)throw Error('保存データがありません');const w=structuredClone(raw);if(w.version===11)w.version=10;return upgrade(oldMigrate(w))}
const find=(w,id)=>{const c=w.companies.find(x=>x.id===id);if(!c)throw Error('企業がありません');return c};
export function reports(w,id){const r=oldReports(w,id);return {...r,businessCycles:w.businessCycles.filter(x=>x.companyId===id).slice(-12),npcEconomy:w.npcEconomy}}
export function validate(w){oldValidate({...w,version:10});for(const x of w.businessCycles)if(!phases[x.industry]||!phases[x.industry].includes(x.phase))throw Error('業種工程が不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;
if(cmd.kind==='operateSector'){const c=find(world,cmd.companyId||world.companies[0].id);const stages=phases[c.industry];const phase=cmd.phase||stages[0];if(!stages.includes(phase))throw Error('工程が不正');const w=upgrade(structuredClone(world));w.businessCycles.push({id:'OP-'+(++w.counter),companyId:c.id,industry:c.industry,phase,tick:w.tick});w.commands[cmd.id]=true;validate(w);return w}
if(cmd.kind==='npcEconomicCycle'){const w=upgrade(structuredClone(world));const x=oldDispatch({...w,version:10},{...cmd,kind:'npcTrading'});upgrade(x);x.npcEconomy.cycles++;validate(x);return x}
if(cmd.kind==='yearAdvance'){const days=cmd.days??365;if(!Number.isSafeInteger(days)||days<1||days>365)throw Error('期間が不正');let w=world;for(let i=0;i<days;i+=30){const n=Math.min(30,days-i);w=oldDispatch({...w,version:10},{id:cmd.id+'-part-'+i,kind:'advance',companyId:cmd.companyId,ticks:n});upgrade(w)}w.commands[cmd.id]=true;w.gameMetrics.lastLongRunDays=days;validate(w);return w}
const w=upgrade(oldDispatch({...world,version:10},cmd));validate(w);return w
}
