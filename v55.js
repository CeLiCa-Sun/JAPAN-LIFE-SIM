import {createWorld as create54,migrate as migrate54,dispatch as dispatch54,validate as validate54,reports as reports54,INDUSTRIES,NAMES,CITY,specs,route,sectorStages} from './v54.js';
export {INDUSTRIES,NAMES,CITY,specs,route,sectorStages};
const extend=w=>{w.version=16;w.cityVehicles??=w.vehicleAssets.map((v,i)=>({id:v.id,companyId:v.companyId,node:v.location,heading:i*60}));w.sectorOutput??=[];w.balanceReviews??=[];return w};
export const createWorld=(seed=42)=>extend(create54(seed));
export function migrate(raw){if(!raw)throw Error('セーブデータなし');const w=structuredClone(raw);if(w.version===16)w.version=15;return extend(migrate54(w))}
export const reports=(w,id)=>({...reports54(w,id),output:w.sectorOutput.filter(x=>x.companyId===id)});
export function validate(w){validate54({...w,version:15});for(const v of w.cityVehicles)if(!CITY.some(c=>c.id===v.node))throw Error('車両位置不正');return true}
export function dispatch(world,cmd){if(world.commands[cmd.id])return world;const cid=cmd.companyId||world.companies[0].id;
if(cmd.kind==='inspectSector'){const w=extend(structuredClone(world)),c=w.companies.find(c=>c.id===cid),run=w.operationRuns.find(x=>x.companyId===cid&&x.status==='running');if(!run)throw Error('現場の契約がありません');w.sectorOutput.push({companyId:cid,contractId:run.contractId,industry:c.industry,step:run.step,tick:w.tick,skill:w.staff.find(e=>e.companyId===cid)?.skill??0});w.commands[cmd.id]=true;w.counter++;validate(w);return w}
if(cmd.kind==='balanceReview'){const w=extend(structuredClone(world)),r=reports(w,cid);w.balanceReviews.push({companyId:cid,tick:w.tick,assets:r.bs.totalAssets,liabilitiesEquity:r.bs.totalLiabilitiesEquity,net:r.pl.net});w.commands[cmd.id]=true;w.counter++;validate(w);return w}
const w=extend(dispatch54({...world,version:15},cmd));if(cmd.kind==='fleetTrip'){const fleet=w.vehicleAssets.find(x=>x.companyId===cid),v=w.cityVehicles.find(x=>x.companyId===cid);if(v&&fleet)v.node=fleet.location}validate(w);return w}
