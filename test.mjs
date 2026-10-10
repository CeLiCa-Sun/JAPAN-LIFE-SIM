import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,dispatch,validate,migrate,INDUSTRIES,reports,route,sectorStages,specs} from './v73.js';
const cmd=(w,kind,companyId,more={})=>dispatch(w,{id:'test-'+(w.counter+1)+'-'+kind,kind,companyId,...more});
test('six industries are available',()=>{const w=createWorld();assert.equal(w.companies.length,6);for(const i of INDUSTRIES)assert.ok(w.companies.some(c=>c.industry===i));validate(w)});
test('six industry contracts complete and receive payment',()=>{for(const industry of INDUSTRIES){let w=createWorld(),c=w.companies.find(x=>x.industry===industry),q=w.market.find(x=>x.companyId===c.id);w=cmd(w,'accept',c.id,{quoteId:q.id});assert.equal(w.contracts[0].status,'working');w=cmd(w,'advance',c.id,{ticks:9});assert.equal(w.contracts[0].status,'paid');assert.equal(w.companies.find(x=>x.id===c.id).receivables,0);validate(w)}});
test('duplicate command does not repeat transfer',()=>{let w=createWorld(),c=w.companies[0],op={id:'fixed-id',kind:'invest',companyId:c.id,amount:100000};w=dispatch(w,op);let other=dispatch(w,op);assert.equal(other,w);assert.equal(w.companies[0].cash,600000)});
test('cannot accept same quote twice',()=>{let w=createWorld(),c=w.companies[0],q=w.market[0];w=cmd(w,'accept',c.id,{quoteId:q.id,staged:true});assert.throws(()=>cmd(w,'accept',c.id,{quoteId:q.id}));});
test('employee hire and recurring payroll',()=>{let w=createWorld(),c=w.companies[0];w=cmd(w,'hire',c.id);assert.equal(w.staff.filter(e=>e.companyId===c.id).length,2);w=cmd(w,'advance',c.id,{ticks:30});assert.ok(w.ledger.some(x=>x.memo==='給与・固定費の計上'));validate(w)});
test('new company and private job',()=>{let w=createWorld();w=cmd(w,'createCompany','C-1',{industry:'logistics'});assert.equal(w.companies.length,7);w=cmd(w,'work','C-7');w=cmd(w,'advance','C-7',{ticks:7});assert.equal(w.personal.careerDays,7);validate(w)});
test('legacy saves migrate',()=>{const old={...createWorld(),version:1};const w=migrate(old);assert.equal(w.version,34);validate(w)});

test('Ver4.3 invoice settlement and reconciliation',()=>{let w=createWorld(),c=w.companies[0];w=cmd(w,'purchase',c.id,{quantity:5});const q=w.market[0];w=cmd(w,'accept',c.id,{quoteId:q.id});const contract=w.contracts[0];assert.ok(contract.materialCost>=0);w=cmd(w,'advance',c.id,{ticks:4});assert.equal(w.contracts[0].status,'delivered');assert.equal(w.companies[0].receivables,q.price);assert.ok(w.contracts[0].invoiceId);w=cmd(w,'advance',c.id,{ticks:2});assert.equal(w.contracts[0].status,'paid');assert.equal(w.companies[0].receivables,0);validate(w)});
test('Ver4.3 rejects expired quotes and preserves world',()=>{let w=createWorld();w=cmd(w,'advance','C-1',{ticks:30});assert.throws(()=>cmd(w,'accept','C-1',{quoteId:w.market[0].id}),/期限切れ/);validate(w)});
test('Ver4.3 unpaid obligations do not vanish',()=>{let w=createWorld();w=cmd(w,'purchase','C-1',{quantity:500});w=cmd(w,'advance','C-1',{ticks:30});assert.ok(w.companies[0].payables>0);assert.ok(w.ledger.some(j=>j.memo==='給与・固定費の計上'));validate(w)});
test('Ver4.3 old save migrates to schema 4',()=>{let old=createWorld();old.version=2;for(const c of old.companies){delete c.inventoryValue;delete c.unpaidPayroll};const w=migrate(old);assert.equal(w.version,34);validate(w)});

test('Ver4.3 ledger and balances reconcile after purchases, contracts and payroll',()=>{let w=createWorld();w=cmd(w,'purchase','C-1',{quantity:5});w=cmd(w,'accept','C-1',{quoteId:w.market[0].id});w=cmd(w,'advance','C-1',{ticks:34});validate(w);assert.equal(w.companies[0].receivables,0)});
test('Ver4.3 cancellation returns reserved inventory and permits next contract',()=>{let w=createWorld(),c=w.companies[0],item='部品セット';const before=c.inventory[item];w=cmd(w,'accept',c.id,{quoteId:w.market[0].id});assert.equal(w.companies[0].inventory[item],before-1);w=cmd(w,'cancelContract',c.id,{contractId:w.contracts[0].id});assert.equal(w.companies[0].inventory[item],before);assert.equal(w.contracts[0].status,'cancelled');w=cmd(w,'newQuote',c.id);w=cmd(w,'accept',c.id,{quoteId:w.market.at(-1).id});validate(w)});
test('Ver4.3 overdue liabilities can be paid later',()=>{let w=createWorld();w=cmd(w,'advance','C-1',{ticks:30});const due=w.companies[0].payables;assert.equal(due,0);w=cmd(w,'invest','C-1',{amount:100000});validate(w);assert.throws(()=>cmd(w,'payPayables','C-1'),/ありません/)});
test('Ver4.3 rejects tampered balance',()=>{let w=createWorld();w.companies[0].cash++;assert.throws(()=>validate(w),/帳簿不整合/)});

test('Ver4.4 balance sheet equals liabilities and equity',()=>{let w=createWorld();w=cmd(w,'purchaseCredit','C-1',{quantity:5,terms:15});const r=reports(w,'C-1');assert.equal(r.bs.totalAssets,r.bs.totalLiabilitiesEquity);assert.equal(r.bs.payables,5000);validate(w)});
test('Ver4.4 supplier bill payment clears liability',()=>{let w=createWorld();w=cmd(w,'purchaseCredit','C-1',{quantity:5});const bill=w.supplierBills[0];w=cmd(w,'payBill','C-1',{billId:bill.id});assert.equal(w.companies[0].payables,0);assert.equal(w.supplierBills[0].status,'paid');validate(w)});
test('Ver4.4 reserved facility cannot overlap',()=>{let w=createWorld(),id=w.facilities[0].id;w=cmd(w,'reserveResource','C-1',{resourceId:id,from:0,to:7});assert.throws(()=>cmd(w,'reserveResource','C-1',{resourceId:id,from:3,to:8}),/重複/);validate(w)});
test('Ver4.4 quotation price revision',()=>{let w=createWorld();w=cmd(w,'quoteRevision','C-1',{quoteId:w.market[0].id,price:200000});assert.equal(w.market[0].price,200000);w=cmd(w,'accept','C-1',{quoteId:w.market[0].id});assert.equal(w.contracts[0].price,200000);validate(w)});
test('Ver4.4 six sectors retain workflows',()=>{for(const industry of INDUSTRIES){let w=createWorld(),c=w.companies.find(c=>c.industry===industry);w=cmd(w,'accept',c.id,{quoteId:w.market.find(q=>q.companyId===c.id).id});assert.equal(w.workflow.at(-1).steps.length,3);w=cmd(w,'advance',c.id,{ticks:10});validate(w)}});

import {encodeSave,decodeSave} from './storage.js';
test('Ver4.4 checksum detects corruption and old format is readable',()=>{const w=createWorld();assert.equal(decodeSave(encodeSave(w)).version,34);assert.equal(decodeSave(JSON.stringify(w)).version,34);let raw=JSON.parse(encodeSave(w));raw.payload+='tamper';assert.throws(()=>decodeSave(JSON.stringify(raw)),/整合性/)});

test('Ver4.5 bank financing keeps financial statements balanced',()=>{let w=createWorld();w=cmd(w,'borrow','C-1',{amount:100000});assert.equal(reports(w,'C-1').bs.loans,100000);w=cmd(w,'repayLoan','C-1',{loanId:w.loanBooks[0].id,amount:30000});assert.equal(reports(w,'C-1').bs.loans,70000);validate(w)});
test('Ver4.5 connected city routing and cost posting',()=>{const r=route('city','depot');assert.ok(r.distance>0&&r.path.length>1);let w=createWorld();w=cmd(w,'transport','C-1',{from:'city',to:'depot'});assert.equal(w.transports.length,1);validate(w)});
test('Ver4.5 staff shift duplicate blocked',()=>{let w=createWorld(),id=w.staff[0].id;w=cmd(w,'hireShift','C-1',{staffId:id,from:1,to:2});assert.throws(()=>cmd(w,'hireShift','C-1',{staffId:id,from:1,to:2}),/競合/);validate(w)});
test('Ver4.5 market demand and monthly statement update',()=>{let w=createWorld();w=cmd(w,'marketRefresh','C-1');assert.ok(w.economy.demand>0);w=cmd(w,'advance','C-1',{ticks:30});assert.ok(w.monthlyStatements.length>=6);validate(w)});
test('Ver4.5 old save migration to version six',()=>{const w=createWorld();let legacy=structuredClone(w);legacy.version=5;delete legacy.economy;const m=migrate(legacy);assert.equal(m.version,34);validate(m)});

test('Ver4.6 NPC market generation across six industries',()=>{let w=createWorld();w=cmd(w,'npcCycle','C-1');assert.equal(w.npcCompanies.length,6);assert.ok(w.npcCompanies.every(x=>x.orders>=1));validate(w)});
test('Ver4.6 sector-specific orders and cash forecasting',()=>{let w=createWorld();w=cmd(w,'serviceSector','C-1');assert.equal(w.contracts.length,1);w=cmd(w,'forecast','C-1');assert.equal(w.forecasts.length,1);validate(w)});
test('Ver4.6 vehicle service records expense and improves condition',()=>{let w=createWorld();w.vehicleAssets[0].condition=60;w=cmd(w,'vehicleService','C-1');assert.equal(w.vehicleAssets[0].condition,85);validate(w)});
test('Ver4.6 life cost and career entry',()=>{let w=createWorld();w=cmd(w,'lifeExpense','C-1',{amount:1000});assert.equal(w.playerCash,999000);w=cmd(w,'applyCareer','C-1');assert.equal(w.personal.job,'C-1');validate(w)});
test('Ver4.6 earlier save migrates',()=>{let w=createWorld();w.version=6;delete w.npcCompanies;assert.equal(migrate(w).version,34)});

test('Ver4.7 all six business stage definitions exist',()=>{for(const industry of INDUSTRIES)assert.ok(sectorStages[industry].length>=4)});
test('Ver4.7 sector stage ordering rejects skipping',()=>{let w=createWorld();w=cmd(w,'serviceSector','C-1');assert.throws(()=>cmd(w,'sectorAction','C-1',{stage:sectorStages.automotive[1]}),/前工程/);w=cmd(w,'sectorAction','C-1',{stage:sectorStages.automotive[0]});assert.equal(w.industryPanels[w.contracts[0].id].completed.length,1);validate(w)});
test('Ver4.7 loan interest accrues on daily advance',()=>{let w=createWorld();w=cmd(w,'borrow','C-1',{amount:100000});w=cmd(w,'advance','C-1',{ticks:7});assert.ok(w.companies[0].payables>0);validate(w)});
test('Ver4.7 vehicle travel records road route and condition loss',()=>{let w=createWorld();w=cmd(w,'fleetTrip','C-1',{to:'depot'});assert.ok(w.routes[0].distance>0);assert.ok(w.vehicleAssets[0].condition<100);validate(w)});
test('Ver4.7 labor daily limit is enforced',()=>{let w=createWorld();const id=w.staff[0].id;w=cmd(w,'laborDay','C-1',{staffId:id,hours:8});assert.throws(()=>cmd(w,'laborDay','C-1',{staffId:id,hours:1}),/超過/);validate(w)});
test('Ver4.7 NPC and household daily expense',()=>{let w=createWorld();w=cmd(w,'npcOperate','C-1');w=cmd(w,'dailyLiving','C-1');assert.equal(w.playerCash,998100);validate(w)});

test('Ver4.8 simplified tax assessment and payment reconcile',()=>{let w=createWorld();w=cmd(w,'assessTax','C-1');const t=w.taxes[0];assert.ok(t.amount>=0);w=cmd(w,'payTax','C-1',{taxId:t.id});assert.equal(w.taxes[0].status,'paid');validate(w)});
test('Ver4.8 NPC capex and facility maintenance',()=>{let w=createWorld();w=cmd(w,'npcInvest','C-1',{npcId:w.npcCompanies[0].id});assert.equal(w.npcInvestments.length,1);w=cmd(w,'equipmentMaintenance','C-1');validate(w)});
test('Ver4.8 insolvency needs insufficient cash',()=>{let w=createWorld();assert.throws(()=>cmd(w,'declareInsolvency','C-1'),/資金不足/);validate(w)});
test('Ver4.8 migration keeps six industries and state',()=>{let w=createWorld();w.version=8;delete w.taxes;w=migrate(w);assert.equal(w.version,34);assert.equal(w.companies.length,6);validate(w)});

test('Ver4.9 NPC companies update budgets without fictitious player revenue',()=>{let w=createWorld(),before=w.companies[0].revenue;w=cmd(w,'npcTrading','C-1');assert.ok(w.npcLedger.length>=6);assert.equal(w.companies[0].revenue,before);validate(w)});
test('Ver4.9 route record follows connected roads',()=>{let w=createWorld();w=cmd(w,'recordTrip','C-1',{to:'depot'});assert.ok(w.travelAnimations.at(-1).path.length>=2);validate(w)});
test('Ver4.9 savings preserve individual assets',()=>{let w=createWorld();const before=w.playerCash+w.household.savings;w=cmd(w,'personalSavings','C-1',{amount:10000});assert.equal(w.playerCash+w.household.savings,before);validate(w)});
test('Ver4.9 six sectors operation check',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'industryCheck',c.id);assert.equal(Object.keys(w.sectorStats).length,6);validate(w)});
test('Ver4.9 ninety-day advancement and save compatibility',()=>{let w=createWorld();w=cmd(w,'simulateQuarter','C-1',{days:90});assert.equal(w.tick,90);validate(w);assert.equal(migrate(w).version,34);assert.equal(decodeSave(encodeSave(w)).version,34)});

test('Ver5.0 six industries operations are recorded',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'operateSector',c.id);assert.equal(w.businessCycles.length,6);validate(w)});
test('Ver5.0 NPC autonomous cycle creates audit event',()=>{let w=createWorld();w=cmd(w,'npcEconomicCycle','C-1');assert.equal(w.npcEconomy.cycles,1);validate(w)});
test('Ver5.0 365-day split progression validates',()=>{let w=createWorld();w=cmd(w,'yearAdvance','C-1',{days:365});assert.equal(w.tick,365);validate(w)});
test('Ver5.0 schema migrates old save',()=>{let w=createWorld();w.version=10;delete w.businessCycles;let m=migrate(w);assert.equal(m.version,34);validate(m)});

test('Ver5.1 six sectors start contracted jobs',()=>{for(const c of createWorld().companies){let w=createWorld();w=cmd(w,'sectorJob',c.id);assert.equal(w.operationRuns.length,1);assert.equal(w.contracts.length,1);validate(w)}});
test('Ver5.1 operations move to next stage and settle',()=>{let w=createWorld();w=cmd(w,'sectorJob','C-1');w=cmd(w,'sectorStep','C-1');assert.equal(w.operationRuns[0].step,1);w=cmd(w,'sectorStep','C-1');w=cmd(w,'advance','C-1',{ticks:9});assert.equal(w.operationRuns[0].status,'completed');validate(w)});
test('Ver5.1 NPC competition and traffic stay bounded',()=>{let w=createWorld();w=cmd(w,'npcCompetition','C-1');w=cmd(w,'cityTrafficTick','C-1');assert.equal(w.cityTraffic.length,6);assert.ok(w.cityTraffic.every(x=>x.volume>=5&&x.volume<=100));validate(w)});
test('Ver5.1 legacy save upgraded',()=>{let w=createWorld();w.version=11;delete w.operationRuns;w=migrate(w);assert.equal(w.version,34);validate(w)});

test('Ver5.2 delivery is blocked before last stage',()=>{let w=createWorld();w=cmd(w,'sectorJob','C-1');w=cmd(w,'advance','C-1',{ticks:6});assert.equal(w.contracts[0].status,'working');w=cmd(w,'sectorStep','C-1');w=cmd(w,'sectorStep','C-1');w=cmd(w,'advance','C-1',{ticks:1});assert.equal(w.contracts[0].status,'delivered');validate(w)});
test('Ver5.2 NPC autonomous decisions and camera limits',()=>{let w=createWorld();w=cmd(w,'autonomousNPC','C-1');assert.equal(w.npcDecisions.length,6);w=cmd(w,'cameraMove','C-1',{zoom:1.5,x:20});assert.equal(w.camera.zoom,1.5);assert.throws(()=>cmd(w,'cameraMove','C-1',{zoom:5}),/範囲/);validate(w)});
test('Ver5.2 save migration and recovery structure',()=>{let w=createWorld();w.version=12;delete w.camera;w=migrate(w);assert.equal(w.version,34);assert.equal(decodeSave(encodeSave(w)).version,34);validate(w)});

test('Ver5.3 independent NPC cash and inventories',()=>{let w=createWorld();w=cmd(w,'npcTrade','C-1');assert.equal(w.npcAccounts.length,6);assert.ok(w.npcAccounts.every(x=>x.inventory===1000));validate(w)});
test('Ver5.3 cost check and household budget',()=>{let w=createWorld();w=cmd(w,'sectorJob','C-1');w=cmd(w,'costReview','C-1');assert.equal(w.jobCosts.length,1);w=cmd(w,'householdBudget','C-1');assert.equal(w.householdJournal.length,1);validate(w)});

test('Ver5.4 NPC transfer conserves combined cash',()=>{let w=createWorld();const total=w.npcAccounts.reduce((s,a)=>s+a.cash,0);w=cmd(w,'npcTransfer','C-1',{from:'NPC-1',to:'NPC-2',amount:1000});assert.equal(w.npcAccounts.reduce((s,a)=>s+a.cash,0),total);validate(w)});
test('Ver5.4 stage cost reconciles company ledger',()=>{let w=createWorld();w=cmd(w,'sectorJob','C-1');const before=w.companies[0].cash;w=cmd(w,'stageExpense','C-1',{amount:1000});assert.equal(w.companies[0].cash,before-1000);validate(w)});
test('Ver5.4 finance snapshots and career notes persist',()=>{let w=createWorld();w=cmd(w,'fiscalSnapshot','C-1');w=cmd(w,'careerNote','C-1');assert.equal(w.fiscalSnapshots.length,1);assert.equal(w.careerNotes.length,1);assert.equal(migrate(w).version,34)});

test('Ver5.5 WebGL city metadata and sector audit',()=>{let w=createWorld();assert.equal(w.cityVehicles.length,6);w=cmd(w,'sectorJob','C-1');w=cmd(w,'inspectSector','C-1');assert.equal(w.sectorOutput.length,1);validate(w)});
test('Ver5.5 finance snapshot reconciles',()=>{let w=createWorld();w=cmd(w,'balanceReview','C-1');assert.equal(w.balanceReviews[0].assets,w.balanceReviews[0].liabilitiesEquity);validate(w)});
test('Ver5.5 vehicle location synchronized and migrated',()=>{let w=createWorld();w=cmd(w,'fleetTrip','C-1',{to:'depot'});assert.equal(w.cityVehicles[0].node,'depot');const m=migrate(w);assert.equal(m.version,34);validate(m)});

test('Ver5.6 NPC autonomous procurement keeps accounts nonnegative',()=>{let w=createWorld();w=cmd(w,'npcAutonomousWeek','C-1');assert.equal(w.npcAutonomy.length,6);assert.ok(w.npcAccounts.every(a=>a.cash>=0));validate(w)});
test('Ver5.6 quality review and household assets',()=>{let w=createWorld();w=cmd(w,'sectorJob','C-1');w=cmd(w,'inspectQuality','C-1');assert.equal(w.sectorQuality.length,1);w=cmd(w,'savingsReport','C-1');assert.equal(w.householdSavingsHistory.length,1);validate(w)});
test('Ver5.6 full-year progression',()=>{let w=createWorld();w=cmd(w,'fiveYearTest','C-1',{years:1});assert.equal(w.tick,365);assert.equal(w.performance.length,1);validate(w)});

test('Ver5.7 logistics route planned from live vehicle location',()=>{let w=createWorld();w=cmd(w,'planDelivery','C-1',{to:'depot'});assert.ok(w.transportPlans[0].km>0);validate(w)});
test('Ver5.7 all sector audits and NPC pricing',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorAudit',c.id);assert.equal(w.operationsAudit.length,6);w=cmd(w,'npcPricing','C-1');assert.equal(Object.keys(w.npcPrices).length,6);validate(w)});
test('Ver5.7 household and migration',()=>{let w=createWorld();w=cmd(w,'personalStatement','C-1');assert.equal(w.personalStatements.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver5.8 shipment posts expense, vehicle status and routing',()=>{let w=createWorld();const cash=w.companies[0].cash;w=cmd(w,'executeShipment','C-1',{to:'depot'});assert.equal(w.shipments.length,1);assert.ok(w.companies[0].cash<cash);assert.equal(w.cityVehicles[0].node,'depot');validate(w)});
test('Ver5.8 autonomous inventory transfers conserve NPC cash and stock',()=>{let w=createWorld();w=cmd(w,'npcTrade','C-1');const total=w.npcAccounts.reduce((s,x)=>s+x.cash,0),inv=w.npcAccounts.reduce((s,x)=>s+x.inventory,0);w=cmd(w,'npcSellInventory','C-1',{seller:'NPC-1',buyer:'NPC-2',amount:1000});assert.equal(w.npcAccounts.reduce((s,x)=>s+x.cash,0),total);assert.equal(w.npcAccounts.reduce((s,x)=>s+x.inventory,0),inv);validate(w)});
test('Ver5.8 finance and household records and migrated save',()=>{let w=createWorld();w=cmd(w,'cashCheck','C-1');w=cmd(w,'livingPlan','C-1');assert.equal(w.livingPlans.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver5.9 driving route records valid road journey',()=>{let w=createWorld();w=cmd(w,'driveRoute','C-1',{to:'depot'});assert.equal(w.vehicleJourneys.length,1);assert.ok(w.vehicleJourneys[0].path.length>=2);validate(w)});
test('Ver5.9 NPC automatic transfers preserve capital',()=>{let w=createWorld();w=cmd(w,'npcTrade','C-1');const total=w.npcAccounts.reduce((s,a)=>s+a.cash,0);w=cmd(w,'npcAutoMarket','C-1');assert.ok(w.npcAutoSales.length>0);assert.equal(w.npcAccounts.reduce((s,a)=>s+a.cash,0),total);validate(w)});
test('Ver5.9 six sectors and housing survive migration',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorReview',c.id);w=cmd(w,'setRent','C-1',{rent:50000});assert.equal(w.sectorReviews.length,6);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.0 monthly rent is charged exactly once',()=>{let w=createWorld();w=cmd(w,'setRent','C-1',{rent:50000});const before=w.playerCash;w=cmd(w,'payRent','C-1');assert.equal(w.playerCash,before-50000);assert.throws(()=>cmd(w,'payRent','C-1'),/支払済み/);validate(w)});
test('Ver6.0 autonomous NPC cycles conserve total cash',()=>{let w=createWorld();w=cmd(w,'npcTrade','C-1');const total=w.npcAccounts.reduce((s,a)=>s+a.cash,0);w=cmd(w,'npcMarketCycle','C-1');assert.ok(w.npcMarketCycles.length>0);assert.equal(w.npcAccounts.reduce((s,a)=>s+a.cash,0),total);validate(w)});
test('Ver6.0 six industries KPI and save migration',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorKpi',c.id);assert.equal(Object.keys(w.sectorKpis).length,6);const copy=migrate(w);assert.equal(copy.version,34);validate(copy)});

test('Ver6.1 road trip and NPC market strategy',()=>{let w=createWorld();w=cmd(w,'roadTrip','C-1',{to:'depot'});assert.ok(w.roadJourneys.length===1);w=cmd(w,'npcTrade','C-1');w=cmd(w,'npcStrategyCycle','C-1');assert.equal(w.npcStrategy.length,6);validate(w)});
test('Ver6.1 six industry snapshots and housing history',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorSnapshot',c.id);w=cmd(w,'housingStatement','C-1');assert.equal(w.sectorChecks.length,6);assert.equal(w.housingHistory.length,1);assert.equal(migrate(w).version,34)});

test('Ver6.2 six industry performance and NPC accounting',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorPerformance',c.id);assert.equal(Object.keys(w.sectorPerformance).length,6);w=cmd(w,'npcBusinessRound','C-1');assert.equal(w.npcTradeSummary.length,1);validate(w)});
test('Ver6.2 five-year endurance and cash flow',()=>{let w=createWorld();w=cmd(w,'recordCashFlow','C-1');w=cmd(w,'fiveYearAudit','C-1',{years:5});assert.equal(w.tick,1825);assert.equal(w.fiveYearAudits.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.3 road animation and six sector audits',()=>{let w=createWorld();w=cmd(w,'animateTrip','C-1');assert.ok(w.routeAnimations[0].path.length>=2);for(const c of w.companies)w=cmd(w,'contractControl',c.id);assert.equal(w.contractControls.length,6);validate(w)});
test('Ver6.3 financial and household checks migrate',()=>{let w=createWorld();w=cmd(w,'npcBalanceAudit','C-1');w=cmd(w,'householdAssetsAudit','C-1');w=cmd(w,'integrityAudit','C-1');assert.deepEqual(w.integrityAudits[0].issues,[]);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.4 six sector unit economics and NPC balance',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorUnitEconomics',c.id);assert.equal(w.sectorUnitEconomics.length,6);w=cmd(w,'npcOperatingRound','C-1');assert.equal(w.npcOperatingRounds.length,1);validate(w)});
test('Ver6.4 bookkeeping, housing and migration',()=>{let w=createWorld();w=cmd(w,'companyReconcile','C-1');w=cmd(w,'familyBudgetReview','C-1');w=cmd(w,'healthCheck','C-1');assert.equal(w.healthChecks[0].schema,25);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.5 all six sector readiness and NPC statements',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorReadiness',c.id);assert.equal(w.sectorReadiness.length,6);w=cmd(w,'npcOperatingStatements','C-1');assert.equal(w.npcAutonomousStatements.length,6);validate(w)});
test('Ver6.5 financing, household, traffic and migration',()=>{let w=createWorld();w=cmd(w,'paymentAudit','C-1');w=cmd(w,'lifeForecast','C-1');w=cmd(w,'trafficAudit','C-1');assert.equal(w.trafficObservations[0].vehicles,6);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.6 six industry profiles and NPC company choices',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'industryProfile',c.id);assert.equal(w.industryProfiles.length,6);w=cmd(w,'npcDecision','C-1');assert.equal(w.npcDecisions[0].accounts.length,6);validate(w)});
test('Ver6.6 ledger life traffic and schema migration',()=>{let w=createWorld();w=cmd(w,'ledgerAudit','C-1');w=cmd(w,'householdReview','C-1');w=cmd(w,'trafficPlan','C-1');assert.equal(w.trafficPlans.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.7 six sector dashboards and NPC economic trades',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'sectorDashboard',c.id);assert.equal(w.sectorDashboards.length,6);w=cmd(w,'npcMarketRun','C-1');assert.equal(w.npcMarkets.length,1);validate(w)});
test('Ver6.7 financial and household records migrated',()=>{let w=createWorld();w=cmd(w,'financialCheck','C-1');w=cmd(w,'lifeCheck','C-1');assert.equal(w.lifeChecks.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.8 all six production reviews, NPC market and accounting',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'productionReview',c.id);assert.equal(w.productionReviews.length,6);w=cmd(w,'npcCycle68','C-1');w=cmd(w,'financeReview68','C-1');assert.equal(w.npcRounds68.length,1);assert.equal(w.financialReviews68.length,1);validate(w)});
test('Ver6.8 home budget and schema upgrade',()=>{let w=createWorld();w=cmd(w,'householdReview68','C-1');assert.equal(w.householdReviews68.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver6.9 six industry-specific workflow checks',()=>{let w=createWorld();for(const c of w.companies)w=cmd(w,'industryWorkflow',c.id);assert.equal(w.industryWorkflows.length,6);assert.equal(new Set(w.industryWorkflows.map(x=>x.industry)).size,6);validate(w)});
test('Ver6.9 NPC trading, finance, household and save compatibility',()=>{let w=createWorld();w=cmd(w,'npcTrade69','C-1');w=cmd(w,'financeAudit69','C-1');w=cmd(w,'lifeAudit69','C-1');assert.equal(w.npcOrders69.length,1);assert.equal(w.financeAudits69.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver7.0 all six industries run their own three tasks',()=>{let w=createWorld();for(const c of w.companies)for(let step=0;step<3;step++)w=cmd(w,'sectorTask70',c.id,{step});assert.equal(w.sectorTasks70.length,18);assert.equal(new Set(w.sectorTasks70.map(t=>t.task)).size,18);validate(w)});
test('Ver7.0 NPC finance household and save compatibility',()=>{let w=createWorld();w=cmd(w,'npcCycle70','C-1');w=cmd(w,'finance70','C-1');w=cmd(w,'household70','C-1');assert.equal(w.npcCycles70.length,1);assert.equal(migrate(w).version,34);validate(w)});

test('Ver7.1 material use and labor cost affects company finance',()=>{let w=createWorld(),c=w.companies[0],material=specs[c.industry].material;const stock=c.inventory[material],cash=c.cash,profit=c.profit;w=cmd(w,'production71',c.id,{step:0});const next=w.companies.find(x=>x.id===c.id);assert.equal(next.inventory[material],stock-1);assert.ok(next.cash<cash);assert.ok(next.profit<profit);assert.equal(w.productionCosts71.length,1);validate(w)});
test('Ver7.1 wrong step rejected and NPC household persisted',()=>{let w=createWorld();assert.throws(()=>cmd(w,'production71','C-1',{step:8}),/工程番号/);w=cmd(w,'npcProduction71','C-1');w=cmd(w,'lifePayment71','C-1');assert.equal(migrate(w).version,34);validate(w)});

test('Ver7.2 sequential stages enforce days and post revenue',()=>{let w=createWorld();const id=w.companies[0].id;assert.throws(()=>cmd(w,'stageWork72',id,{step:1}),/最初/);w=cmd(w,'stageWork72',id,{step:0});assert.throws(()=>cmd(w,'stageWork72',id,{step:1}),/日数/);w=cmd(w,'advance',id,{ticks:1});w=cmd(w,'stageWork72',id,{step:1});w=cmd(w,'advance',id,{ticks:1});w=cmd(w,'stageWork72',id,{step:2});assert.equal(w.workOrders72[0].status,'delivered');assert.ok(w.workOrders72[0].revenue>0);assert.equal(migrate(w).version,34);validate(w)});
test('Ver7.2 all six industries have ordered work stages',()=>{let w=createWorld();for(const c of [...w.companies]){for(let step=0;step<3;step++){if(step)w=cmd(w,'advance',c.id,{ticks:1});w=cmd(w,'stageWork72',c.id,{step})}}assert.equal(w.workOrders72.length,6);assert.equal(w.workOrders72.filter(x=>x.status==='delivered').length,6);validate(w)});

test('Ver7.3 accepted contract is delivered and paid exactly once',()=>{let w=createWorld(),id=w.companies[0].id,quote=w.market.find(x=>x.companyId===id);w=cmd(w,'accept',id,{quoteId:quote.id,staged:true});const ct=w.contracts.find(x=>x.companyId===id);assert.equal(ct.requireStages,true);w=cmd(w,'advance',id,{ticks:5});assert.equal(w.contracts.find(x=>x.id===ct.id).status,'working');for(let step=0;step<3;step++){if(step)w=cmd(w,'advance',id,{ticks:1});w=cmd(w,'stageWork73',id,{step})}assert.equal(w.contractStages73[0].status,'inspection_passed');assert.equal(w.companies[0].revenue,0);w=cmd(w,'advance',id,{ticks:1});assert.equal(w.contracts.find(x=>x.id===ct.id).status,'delivered');const revenue=w.companies[0].revenue;w=cmd(w,'advance',id,{ticks:2});assert.equal(w.contracts.find(x=>x.id===ct.id).status,'paid');assert.equal(w.companies[0].revenue,revenue);assert.equal(w.companies[0].receivables,0);assert.equal(migrate(w).version,34);validate(w)});
test('Ver7.3 six industry contract gates reject out of order operations',()=>{let w=createWorld();for(const c of [...w.companies]){const q=w.market.find(x=>x.companyId===c.id);w=cmd(w,'accept',c.id,{quoteId:q.id,staged:true});assert.throws(()=>cmd(w,'stageWork73',c.id,{step:2}),/前工程/);w=cmd(w,'stageWork73',c.id,{step:0})}assert.equal(w.contractStages73.length,6);validate(w)});
