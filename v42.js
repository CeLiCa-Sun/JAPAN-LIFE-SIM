import {createWorld as baseWorld,dispatch as baseDispatch,validate as baseValidate,INDUSTRIES,NAMES} from './sim.js';
export {INDUSTRIES,NAMES};
const descriptions={
 automotive:{product:'小型商用車',materials:1,material:'部品セット',days:4,price:155000,cost:40000},
 rental:{product:'レンタカー貸渡',materials:0,material:'貸出可能車両',days:3,price:19000,cost:5000},
 repair:{product:'整備・部品交換',materials:1,material:'補修部品',days:2,price:35000,cost:9000},
 bus:{product:'路線バス運行',materials:0,material:'営業車両',days:2,price:26000,cost:15000},
 manufacturing:{product:'精密部品加工',materials:2,material:'素材',days:3,price:42000,cost:12000},
 logistics:{product:'地域貨物輸送',materials:0,material:'トラック',days:2,price:32000,cost:11000}
};
export const CITY=[{id:'city',name:'中央駅',x:48,y:43},{id:'factory',name:'工業団地',x:80,y:31},{id:'garage',name:'整備・車両基地',x:22,y:72},{id:'depot',name:'物流倉庫',x:71,y:78},{id:'residential',name:'住宅街',x:18,y:20},{id:'port',name:'商業地区',x:49,y:77}];
const locations=['factory','city','garage','city','factory','depot'];
function event(w,kind,companyId,text){w.events.push({id:'V42E-'+(++w.counter),tick:w.tick,type:kind,companyId,detail:text})}
function entry(w,c,text,debit,credit){const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);if(sum(debit)!==sum(credit))throw Error('仕訳不一致');w.ledger.push({id:'V42J-'+(++w.counter),tick:w.tick,companyId:c.id,memo:text,debit,credit})}
function find(w,id){const c=w.companies.find(c=>c.id===id);if(!c)throw Error('企業が存在しません');return c}
const assertMoney=(x)=>{if(!Number.isSafeInteger(x)||x<0)throw Error('金額が不正')};
function init(w){
 w.version=4;w.market=[];w.contracts=[];w.staff=[];w.facilities=[];w.personal={residence:'residential',job:null,careerDays:0,monthlyRent:62000,qualifications:['普通免許'],experience:0};w.nextPaymentDay=30;
 w.companies.forEach((c,i)=>{const s=descriptions[c.industry];c.location=locations[i];c.employees=0;c.receivables=0;c.payables=0;c.materialCost=1000;c.revenue=0;c.expenses=0;c.fixedExpense=6000;c.customerRating=70;c.fleet=(c.industry==='rental'||c.industry==='bus'||c.industry==='logistics')?2:0;
 c.inventoryValue=0;c.unpaidPayroll=0;
 w.facilities.push({id:'F-'+c.id,companyId:c.id,location:c.location,capacity:1,type:NAMES[c.industry]+'営業拠点'});
 w.staff.push({id:'STAFF-'+c.id,companyId:c.id,name:'NPC社員 '+(i+1),salary:9000,skill:55,qualified:true,available:true});c.employees=1;
 w.market.push({id:'RFQ-'+(i+1),companyId:c.id,buyer:'NPC顧客 '+(i+1),product:s.product,price:s.price,deadline:15+i*2,status:'open',quantity:1});
 });
 return w
}
export function createWorld(seed=42){return init(baseWorld(seed))}
export function migrate(old){if(!old)throw Error('セーブデータなし');if(old.version===4)return old;if(old.version===1)return upgrade(init(structuredClone(old)));if(old.version===2||old.version===3)return upgrade(structuredClone(old));throw Error('対応していないセーブ形式')}
function upgrade(w){w.version=4;for(const c of w.companies){c.inventoryValue=c.inventoryValue??0;c.payables=c.payables??0;c.unpaidPayroll=c.unpaidPayroll??0;}for(const ct of w.contracts){ct.materialCost=ct.materialCost??0;ct.invoiceId=ct.invoiceId??(ct.status==='working'?null:'INV-'+ct.id)}return w}
function settle(w,c,contract){
 if(contract.status!=='working')return false;
 const s=descriptions[c.industry],cost=s.cost,price=contract.price,materials=contract.materialCost||0;
 if(c.cash<cost){event(w,'work.blocked',c.id,'費用不足により作業保留');return false}
 c.cash-=cost;c.inventoryValue-=materials;c.expenses+=cost+materials;c.revenue+=price;c.receivables+=price;c.profit+=price-cost-materials;
 entry(w,c,'契約 '+contract.id+' 履行・売上',{receivable:price,expense:cost+materials},{revenue:price,cash:cost,inventory:materials});
 contract.invoiceId='INV-'+contract.id;
 contract.status='delivered';contract.deliveredAt=w.tick;
 const job=w.jobs.find(j=>j.contractId===contract.id);if(job)job.status='done';
 c.completed++;c.customerRating=Math.min(100,c.customerRating+1);
 event(w,'contract.delivered',c.id,contract.product+'を納品・請求 '+price+'円');
 return true
}
function progress(w,days){
 for(let t=0;t<days;t++){w.tick++;
 for(const con of w.contracts.filter(x=>x.status==='working')){if(con.dueTick<=w.tick)settle(w,find(w,con.companyId),con)}
 for(const con of w.contracts.filter(x=>x.status==='delivered')){if(con.deliveredAt+2>w.tick)continue;const c=find(w,con.companyId);if(c.receivables<con.price)throw Error('売掛金台帳の残高不一致');c.cash+=con.price;c.receivables-=con.price;entry(w,c,'売掛金回収 '+con.id,{cash:con.price},{receivable:con.price});con.status='paid';event(w,'invoice.paid',c.id,con.price+'円入金')}
 if(w.tick%30===0){for(const c of w.companies){const wages=w.staff.filter(e=>e.companyId===c.id).reduce((n,e)=>n+e.salary,0);const cost=wages+c.fixedExpense;c.expenses+=cost;c.profit-=cost;c.payables+=cost;c.unpaidPayroll+=cost;entry(w,c,'給与・固定費の計上',{expense:cost},{payable:cost});const due=c.payables;if(c.cash>=due){c.cash-=due;c.payables=0;c.unpaidPayroll=0;entry(w,c,'未払給与・費用の支払',{payable:due},{cash:due});event(w,'payroll.paid',c.id,'給与・未払費用 '+due+'円を支払')}else event(w,'payroll.overdue',c.id,'未払給与・固定費 '+due+'円')}} 
 if(w.personal.job){w.personal.careerDays++;if(w.tick%7===0){w.playerCash+=12500;w.personal.experience+=2;event(w,'career.paid',w.personal.job,'就労所得 12,500円')}}
 if(w.tick%30===0){w.playerCash-=w.personal.monthlyRent;event(w,'life.rent',w.companies[0].id,'家賃の支払い '+w.personal.monthlyRent+'円')}
 }
}
export function dispatch(world,cmd){
 if(world.commands[cmd.id])return world;
 const w=structuredClone(world);const c=find(w,cmd.companyId||w.companies[0].id);const s=descriptions[c.industry];
 if(cmd.kind==='advance'){const days=cmd.ticks??1;if(!Number.isSafeInteger(days)||days<1||days>1000)throw Error('日数が不正');progress(w,days);event(w,'time.advanced',c.id,days+'日経過')}
 else if(cmd.kind==='accept'){const q=w.market.find(x=>x.id===cmd.quoteId);if(!q||q.status!=='open'||q.companyId!==c.id)throw Error('見積依頼がありません');if(q.deadline<w.tick)throw Error('見積期限切れ');if(w.contracts.some(x=>x.companyId===c.id&&x.status==='working'))throw Error('すでに進行中の作業があります');if((c.inventory[s.material]||0)<s.materials)throw Error('必要材料がありません');if(c.cash<s.cost)throw Error('運転資金不足');if(!w.staff.some(x=>x.companyId===c.id&&x.qualified))throw Error('担当従業員がいません');const materialCost=s.materials*c.materialCost;const capitalized=Math.min(c.inventoryValue,materialCost);c.inventory[s.material]-=s.materials;const con={id:'CT-'+(++w.counter),companyId:c.id,quoteId:q.id,buyer:q.buyer,product:q.product,price:q.price,materialCost:capitalized,status:'working',createdAt:w.tick,dueTick:w.tick+s.days};w.contracts.push(con);q.status='accepted';w.jobs.push({id:'WORK-'+(++w.counter),companyId:c.id,contractId:con.id,label:s.product,status:'running',remaining:s.days});event(w,'contract.accepted',c.id,q.product+'の契約成立');}
 else if(cmd.kind==='cancelContract'){const ct=w.contracts.find(x=>x.id===cmd.contractId&&x.companyId===c.id);if(!ct||ct.status!=='working')throw Error('取消可能な契約がありません');if(ct.dueTick<=w.tick)throw Error('履行期限到来後は取消できません');const qty=s.materials;c.inventory[s.material]=(c.inventory[s.material]||0)+qty;ct.status='cancelled';ct.cancelledAt=w.tick;const work=w.jobs.find(x=>x.contractId===ct.id);if(work)work.status='cancelled';event(w,'contract.cancelled',c.id,ct.id+'を取消し、引当材料を返却');}
 else if(cmd.kind==='payPayables'){const due=c.payables;if(!Number.isSafeInteger(due)||due<=0)throw Error('未払債務はありません');if(c.cash<due)throw Error('未払債務の支払資金不足');c.cash-=due;c.payables=0;c.unpaidPayroll=0;entry(w,c,'未払費用の後日支払',{payable:due},{cash:due});event(w,'payables.paid',c.id,due+'円の未払費用を支払');}
 else if(cmd.kind==='purchase'){const qty=cmd.quantity??5;if(!Number.isSafeInteger(qty)||qty<=0||qty>1000)throw Error('仕入数量が不正');const cost=qty*c.materialCost;if(c.cash<cost)throw Error('仕入資金不足');c.cash-=cost;c.inventory[s.material]=(c.inventory[s.material]||0)+qty;c.inventoryValue=(c.inventoryValue||0)+cost;entry(w,c,'材料仕入',{inventory:cost},{cash:cost});event(w,'inventory.purchased',c.id,s.material+' '+qty+'個を仕入')}
 else if(cmd.kind==='invest'){const amount=cmd.amount??100000;assertMoney(amount);if(!amount||w.playerCash<amount)throw Error('個人資金が不足');w.playerCash-=amount;c.cash+=amount;c.equity+=amount;entry(w,c,'資本金追加',{cash:amount},{equity:amount});event(w,'capital.invested',c.id,'追加出資 '+amount+'円')}
 else if(cmd.kind==='hire'){if(c.cash<60000)throw Error('採用資金不足');const n=w.staff.filter(x=>x.companyId===c.id).length+1;w.staff.push({id:'STAFF-'+(++w.counter),companyId:c.id,name:'社員 '+n,salary:9000,skill:40+n,qualified:true,available:true});c.employees++;event(w,'employee.hired',c.id,'社員 '+n+'を採用')}
 else if(cmd.kind==='train'){const e=w.staff.find(x=>x.companyId===c.id);if(!e||c.cash<5000)throw Error('研修費用・社員が不足');c.cash-=5000;c.expenses+=5000;c.profit-=5000;e.skill=Math.min(100,e.skill+5);entry(w,c,'技能研修',{expense:5000},{cash:5000});event(w,'employee.trained',c.id,e.name+'の技能を向上')}
 else if(cmd.kind==='newQuote'){if(w.market.filter(x=>x.companyId===c.id&&x.status==='open').length>=5)throw Error('未処理の見積依頼が多すぎます');w.market.push({id:'RFQ-'+(++w.counter),companyId:c.id,buyer:'地域取引先 '+w.counter,product:s.product,price:s.price,deadline:w.tick+20,status:'open',quantity:1});event(w,'market.rfq',c.id,'新しい見積依頼')}
 else if(cmd.kind==='work'){w.personal.job=c.id;event(w,'career.started',c.id,c.name+'へ就職')}
 else if(cmd.kind==='resign'){w.personal.job=null;event(w,'career.resigned',c.id,'離職')}
 else if(cmd.kind==='rent'){const amt=cmd.amount??62000;assertMoney(amt);if(amt<30000||amt>200000)throw Error('家賃は3万〜20万円で指定');w.personal.monthlyRent=amt;event(w,'life.moved',c.id,'家賃 '+amt+'円の住居へ転居')}
 else if(cmd.kind==='createCompany'){const industry=cmd.industry;if(!INDUSTRIES.includes(industry))throw Error('業種が不正');if(w.playerCash<250000)throw Error('設立資金が不足');const number=w.companies.length+1,firm={id:'C-'+number,name:NAMES[industry]+' 新規'+number,industry,cash:250000,equity:250000,profit:0,inventory:{[descriptions[industry].material]:3},assets:{},completed:0,location:'city',employees:0,receivables:0,payables:0,materialCost:1000,revenue:0,expenses:0,fixedExpense:6000,customerRating:50,fleet:0,inventoryValue:0,unpaidPayroll:0};w.playerCash-=250000;w.companies.push(firm);w.facilities.push({id:'F-'+firm.id,companyId:firm.id,location:'city',capacity:1,type:'新設営業所'});w.market.push({id:'RFQ-'+(++w.counter),companyId:firm.id,buyer:'開業初期顧客',product:descriptions[industry].product,price:descriptions[industry].price,deadline:w.tick+20,status:'open',quantity:1});entry(w,firm,'会社設立出資',{cash:250000},{equity:250000});event(w,'company.founded',firm.id,'会社を設立')}
 else throw Error('未対応の操作: '+cmd.kind);
 w.commands[cmd.id]=true;validate(w);return w;
}
export function validate(w){baseValidate(w);for(const c of w.companies){for(const n of [c.receivables,c.payables,c.inventoryValue,c.cash])if(!Number.isSafeInteger(n)||n<0)throw Error('会計残高の不整合');if(!Number.isSafeInteger(c.profit))throw Error('利益が不正');const outstanding=w.contracts.filter(k=>k.companyId===c.id&&k.status==='delivered').reduce((a,k)=>a+k.price,0);if(outstanding!==c.receivables)throw Error('売掛金と請求状態が一致しません')}for(const j of w.ledger){const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);if(sum(j.debit)!==sum(j.credit))throw Error('仕訳不一致')}
for(const c of w.companies){const b={};for(const j of w.ledger.filter(j=>j.companyId===c.id)){for(const [k,v]of Object.entries(j.debit))b[k]=(b[k]||0)+v;for(const [k,v]of Object.entries(j.credit))b[k]=(b[k]||0)-v}const expected={cash:c.cash,receivable:c.receivables,inventory:c.inventoryValue,payable:-c.payables,equity:-c.equity,revenue:-c.revenue,expense:c.expenses};for(const [k,v]of Object.entries(expected)){if((b[k]||0)!==v)throw Error(c.name+'の帳簿不整合: '+k+' '+(b[k]||0)+' != '+v)}if(c.profit!==c.revenue-c.expenses)throw Error('損益の不一致');}
return true}
export const specs=descriptions;
