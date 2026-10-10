import {createWorld as create71,migrate as migrate71,dispatch as dispatch71,validate as validate71,reports as reports71,INDUSTRIES,NAMES,CITY,specs,route,sectorStages,OPERATIONS} from './v71.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages,OPERATIONS};
const init=w=>{w.version=33;w.workOrders72??=[];w.npcReviews72??=[];w.lifeReviews72??=[];return w};
export const createWorld=(seed=42)=>init(create71(seed));
export function migrate(raw){if(!raw)throw Error('保存データなし');const w=structuredClone(raw);if(w.version===33)w.version=32;return init(migrate71(w))}
export const reports=(w,id)=>({...reports71(w,id),workOrders72:w.workOrders72.filter(x=>x.companyId===id).slice(-10)});
export function validate(w){validate71({...w,version:32});for(const o of w.workOrders72){if(!INDUSTRIES.includes(o.industry)||o.nextStep<0||o.nextStep>3)throw Error('工程進捗不正');if(o.status==='delivered'&&o.nextStep!==3)throw Error('納品進捗不正')}return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='stageWork72'){const company=world.companies.find(x=>x.id===cid);if(!company)throw Error('会社なし');const step=cmd.step;if(!Number.isInteger(step)||step<0||step>2)throw Error('工程番号が不正');
const current=world.workOrders72.find(x=>x.companyId===cid&&x.status==='working');if(current){if(step!==current.nextStep)throw Error('前工程の完了が必要');if(world.tick<current.nextTick)throw Error('次工程まで日数経過が必要')}else if(step!==0)throw Error('最初の工程から開始してください');
let w=init(dispatch71({...world,version:32},{...cmd,kind:'production71'}));let order=w.workOrders72.find(x=>x.companyId===cid&&x.status==='working');if(!order){order={id:'W72-'+(++w.counter),companyId:cid,industry:company.industry,createdTick:w.tick,nextStep:0,nextTick:w.tick,status:'working',cost:0,quality:null,revenue:0};w.workOrders72.push(order)}
const last=w.productionCosts71.at(-1);order.cost+=last.cost;order.nextStep=step+1;order.nextTick=w.tick+1;
if(step===2){const c=w.companies.find(x=>x.id===cid),staff=w.staff.filter(x=>x.companyId===cid),average=Math.floor(staff.reduce((n,x)=>n+(x.skill??50),0)/staff.length);order.quality=Math.min(100,Math.max(0,average+10));if(order.quality>=50){const amount=specs[c.industry].price;c.cash+=amount;c.revenue+=amount;c.profit+=amount;w.ledger.push({id:'W72J-'+(++w.counter),tick:w.tick,companyId:cid,memo:'完成・検品・即時納品',debit:{cash:amount},credit:{revenue:amount}});order.revenue=amount;order.status='delivered';c.completed+=1}else{order.status='quality_hold'}}
validate(w);return w}
if(cmd.kind==='npcReview72'){const w=init(dispatch71({...world,version:32},{...cmd,kind:'npcProduction71'}));w.npcReviews72.push({tick:w.tick,cash:w.npcAccounts.reduce((n,x)=>n+x.cash,0)});validate(w);return w}
if(cmd.kind==='lifeReview72'){const w=init(dispatch71({...world,version:32},{...cmd,kind:'lifePayment71'}));w.lifeReviews72.push({tick:w.tick,cash:w.playerCash,rent:w.housing.rent});validate(w);return w}
const w=init(dispatch71({...world,version:32},cmd));validate(w);return w}
