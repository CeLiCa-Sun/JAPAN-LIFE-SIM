import {createWorld as baseCreate,migrate as baseMigrate,dispatch as baseDispatch,validate as baseValidate,reports as baseReports,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v60.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const ext=w=>{w.version=22;w.roadJourneys??=[];w.npcStrategy??=[];w.sectorChecks??=[];w.housingHistory??=[];return w};
export const createWorld=(seed=42)=>ext(baseCreate(seed));
export function migrate(raw){if(!raw)throw Error('保存なし');const w=structuredClone(raw);if(w.version===22)w.version=21;return ext(baseMigrate(w))}
export const reports=(w,id)=>({...baseReports(w,id),roadJourneys:w.roadJourneys.filter(j=>j.companyId===id),sectorChecks:w.sectorChecks.filter(j=>j.companyId===id)});
export function validate(w){baseValidate({...w,version:21});for(const j of w.roadJourneys)if(!Array.isArray(j.path)||!j.path.length)throw Error('輸送経路不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='roadTrip'){const vehicle=world.vehicleAssets.find(v=>v.companyId===cid);if(!vehicle)throw Error('車両なし');const to=cmd.to||'depot',r=route(vehicle.location,to);if(r.path.length<2)throw Error('別の地点を選択');const w=ext(baseDispatch({...world,version:21},{...cmd,kind:'driveRoute',to}));w.roadJourneys.push({companyId:cid,tick:w.tick,path:r.path,distance:r.distance});validate(w);return w}
if(cmd.kind==='npcStrategyCycle'){let w=ext(baseDispatch({...world,version:21},{...cmd,kind:'npcMarketCycle'}));for(const n of w.npcCompanies){const account=w.npcAccounts.find(a=>a.id===n.id);const target=Math.max(0,Math.round(specs[n.industry].price*(w.economy.priceIndex/100)*(account.cash<100000?1.06:1)));w.npcPrices[n.id]=target;w.npcStrategy.push({tick:w.tick,npcId:n.id,price:target,cash:account.cash});}validate(w);return w}
if(cmd.kind==='sectorSnapshot'){const w=ext(baseDispatch({...world,version:21},{...cmd,kind:'sectorKpi'}));const k=w.sectorKpis[cid];w.sectorChecks.push({tick:w.tick,companyId:cid,...k});validate(w);return w}
if(cmd.kind==='housingStatement'){const w=ext(structuredClone(world));w.housingHistory.push({tick:w.tick,rent:w.housing.rent,paid:w.rentPayments.reduce((s,x)=>s+x.amount,0),cash:w.playerCash});w.counter++;w.commands[cmd.id]=true;validate(w);return w}
const w=ext(baseDispatch({...world,version:21},cmd));validate(w);return w}
