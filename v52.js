import {createWorld as create51,migrate as migrate51,dispatch as dispatch51,validate as validate51,reports as reports51,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v51.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const steps={automotive:['部品供給','組立工程','完成検査'],rental:['予約受付','車両引渡','返却確認'],repair:['点検入庫','部品交換','完成検査'],bus:['乗務割当','運行','入庫点検'],manufacturing:['加工準備','加工','検品'],logistics:['配送受付','集荷','納品']};
function up(w){w.version=13;w.camera??={x:0,y:0,zoom:1};w.npcDecisions??=[];w.lifecycle??=[];w.uiAlerts??=[];return w}
export const createWorld=(seed=42)=>up(create51(seed));
export function migrate(raw){if(!raw)throw Error('セーブデータなし');const x=structuredClone(raw);if(x.version===13)x.version=12;return up(migrate51(x))}
const firm=(w,id)=>{const c=w.companies.find(c=>c.id===id);if(!c)throw Error('会社がありません');return c};
export function reports(w,id){const r=reports51(w,id);return{...r,runDetails:w.operationRuns.filter(x=>x.companyId===id),alerts:w.uiAlerts.filter(x=>x.companyId===id).slice(-12)}}
export function validate(w){validate51({...w,version:12});for(const run of w.operationRuns){const c=firm(w,run.companyId);if(run.step<0||run.step>=steps[c.industry].length)throw Error('業務工程不正')}return true}
export function dispatch(world,cmd){
 if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
 if(cmd.kind==='sectorJob'){const w=up(dispatch51({...world,version:12},cmd)),run=w.operationRuns.at(-1),contract=w.contracts.find(c=>c.id===run.contractId);contract.requireStages=true;contract.stagesCompleted=false;validate(w);return w}
 if(cmd.kind==='sectorStep'){const w=up(dispatch51({...world,version:12},cmd)),run=w.operationRuns.find(r=>r.companyId===cid&&r.status==='running');if(run&&run.step===steps[run.industry].length-1){const ct=w.contracts.find(c=>c.id===run.contractId);ct.stagesCompleted=true;w.uiAlerts.push({companyId:cid,tick:w.tick,text:'最終検査完了：納品可能'});}validate(w);return w}
 if(cmd.kind==='autonomousNPC'){const w=up(dispatch51({...world,version:12},{...cmd,kind:'npcCompetition'}));for(const n of w.npcCompanies){const current=Math.max(0,n.capital);const budget=Math.min(current,Math.max(0,Math.floor(current*.015)));if(budget>0){n.capital-=budget;n.invested=(n.invested||0)+budget;w.npcDecisions.push({npcId:n.id,tick:w.tick,budget,decision:'equipment-investment'})}}validate(w);return w}
 if(cmd.kind==='cameraMove'){const w=up(structuredClone(world));const z=cmd.zoom??w.camera.zoom,x=cmd.x??w.camera.x,y=cmd.y??w.camera.y;if(![z,x,y].every(Number.isFinite)||z<.5||z>3||Math.abs(x)>100||Math.abs(y)>100)throw Error('カメラ範囲不正');w.camera={zoom:z,x,y};w.commands[cmd.id]=true;w.counter++;validate(w);return w}
 const w=up(dispatch51({...world,version:12},cmd));if(['advance','yearAdvance'].includes(cmd.kind)){for(const run of w.operationRuns){const ct=w.contracts.find(c=>c.id===run.contractId);if(ct?.requireStages&&ct.status==='working'&&run.step<steps[run.industry].length-1)run.status='running'}}validate(w);return w
}
