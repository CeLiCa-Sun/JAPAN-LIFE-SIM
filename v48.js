import {createWorld as previousCreate,migrate as previousMigrate,dispatch as previousDispatch,validate as previousValidate,reports as previousReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v47.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
function enrich(w){w.version=9;w.taxes??=[];w.insolvency??=[];w.assetMaintenance??=[];w.npcInvestments??=[];w.careerLevel??=1;w.renderStats??={};return w}
export const createWorld=(seed=42)=>enrich(previousCreate(seed));
export function migrate(raw){if(!raw)throw Error('セーブデータなし');let w=structuredClone(raw);if(w.version===9)w.version=8;return enrich(previousMigrate(w))}
function firm(w,id){const c=w.companies.find(x=>x.id===id);if(!c)throw Error('企業が存在しません');return c}
function journal(w,c,memo,debit,credit){const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);if(sum(debit)!==sum(credit))throw Error('仕訳不一致');w.ledger.push({id:'V48J-'+(++w.counter),tick:w.tick,companyId:c.id,memo,debit,credit})}
export function reports(w,id){const old=previousReports(w,id),c=firm(w,id);return {...old,risk:{cashShortfall:c.cash<old.forecast.payroll30+old.forecast.scheduledBills,overdueBills:w.supplierBills.filter(x=>x.companyId===id&&x.status==='open'&&x.dueTick<w.tick).length},sectorStages:sectorStages[c.industry],taxes:w.taxes.filter(x=>x.companyId===id)}}
export function validate(w){previousValidate(w);for(const t of w.taxes){if(!Number.isSafeInteger(t.amount)||t.amount<0)throw Error('税額の不正')}for(const e of w.assetMaintenance){if(!Number.isSafeInteger(e.cost)||e.cost<0)throw Error('設備費の不正')}return true}
export function dispatch(state,cmd){if(state.commands[cmd.id])return state;
const standard=!['assessTax','payTax','npcInvest','equipmentMaintenance','careerPromotion','declareInsolvency'].includes(cmd.kind);
if(standard){const w=enrich(previousDispatch(state,cmd));validate(w);return w}
const w=enrich(structuredClone(state)),c=firm(w,cmd.companyId||w.companies[0].id);
if(cmd.kind==='assessTax'){const already=w.taxes.some(t=>t.companyId===c.id&&t.period===Math.floor(w.tick/30));if(already)throw Error('この期間は課税済み');const amount=Math.max(0,Math.floor(c.profit*0.08));w.taxes.push({id:'TAX-'+(++w.counter),companyId:c.id,period:Math.floor(w.tick/30),amount,status:'due',dueTick:w.tick+15});if(amount){c.expenses+=amount;c.profit-=amount;c.payables+=amount;journal(w,c,'簡易税額の計上',{expense:amount},{payable:amount})}}
else if(cmd.kind==='payTax'){const t=w.taxes.find(t=>t.id===cmd.taxId&&t.companyId===c.id&&t.status==='due');if(!t)throw Error('対象税額なし');if(c.cash<t.amount)throw Error('納税資金不足');c.cash-=t.amount;c.payables-=t.amount;t.status='paid';t.paidAt=w.tick;if(t.amount)journal(w,c,'簡易納税',{payable:t.amount},{cash:t.amount})}
else if(cmd.kind==='npcInvest'){const n=w.npcCompanies.find(n=>n.id===cmd.npcId);if(!n)throw Error('NPC企業なし');const amount=5000;if(n.capital<amount)throw Error('NPC資金不足');n.capital-=amount;n.invested=(n.invested||0)+amount;w.npcInvestments.push({npcId:n.id,tick:w.tick,amount})}
else if(cmd.kind==='equipmentMaintenance'){const f=w.facilities.find(f=>f.companyId===c.id);if(!f)throw Error('施設なし');const cost=4000;if(c.cash<cost)throw Error('保守費不足');c.cash-=cost;c.expenses+=cost;c.profit-=cost;f.condition=Math.min(100,(f.condition??90)+10);w.assetMaintenance.push({companyId:c.id,tick:w.tick,cost,facilityId:f.id});journal(w,c,'設備保守費',{expense:cost},{cash:cost})}
else if(cmd.kind==='careerPromotion'){if(w.personal.job!==c.id)throw Error('この企業に就業していません');if(w.personal.experience<4*w.careerLevel)throw Error('昇進に必要な経験不足');w.careerLevel++;w.lifeHistory.push({tick:w.tick,kind:'promotion',level:w.careerLevel})}
else if(cmd.kind==='declareInsolvency'){const r=reports(w,c.id);if(c.cash>=r.forecast.payroll30+r.forecast.scheduledBills)throw Error('資金不足条件を満たしていません');if(w.insolvency.some(x=>x.companyId===c.id&&x.status==='open'))throw Error('再建手続き中');w.insolvency.push({companyId:c.id,tick:w.tick,status:'open'});}
w.commands[cmd.id]=true;validate(w);return w}
