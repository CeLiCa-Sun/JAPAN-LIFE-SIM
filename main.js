import {createWorld,dispatch,INDUSTRIES,NAMES,stableHash,validate} from './sim.js';
import {save,load,recoverBackup} from './storage.js';
let world=createWorld(),selected='automotive',serial=0,speed=1;
const root=document.getElementById('app');
const yen=n=>'¥'+n.toLocaleString('ja-JP');
function render(){
 const c=world.companies.find(x=>x.industry===selected);
 const job=world.jobs.find(x=>x.companyId===c.id&&x.status==='running');
 root.innerHTML=`<header><h1>経済人生シミュレーター <small>Ver.4.1 α</small></h1><div>ゲーム内 ${world.tick}日目・個人資金 ${yen(world.playerCash)}・Hash ${stableHash(world)}</div></header>
 <nav>${INDUSTRIES.map(i=>`<button data-industry="${i}" class="${i===selected?'active':''}">${NAMES[i]}</button>`).join('')}</nav>
 <main><section class="stats"><article><h2>${c.name}</h2><p>法人現預金 <strong>${yen(c.cash)}</strong></p><p>累積収支（簡易） ${yen(c.profit)}</p><p>完了した仕事 ${c.completed}件</p></article><article><h2>業務</h2><p>${job?job.label+'：残り'+job.remaining+'日':'着手可能'}</p><p>在庫 ${Object.entries(c.inventory).map(([k,v])=>k+' '+v).join(' / ')}</p><p>記録資産 ${Object.entries(c.assets).map(([k,v])=>k+' '+v).join(' / ')||'なし'}</p></article></section>
 <section><h2>経営操作</h2><div class="buttons"><button id="job">仕事を受注・開始</button><button id="buy">素材・部品を5個仕入れる</button><button id="invest">個人から10万円出資</button></div><h2>時間</h2><div class="buttons"><button id="next">1日進める</button><button id="week">7日進める</button><label>倍率 <select id="speed">${[1,5,20,100].map(n=>`<option value="${n}" ${n===speed?'selected':''}>×${n}</option>`).join('')}</select></label><button id="run">指定倍率で進める</button></div><h2>保存</h2><div class="buttons"><button id="save">保存</button><button id="load">読込</button><button id="recover">前回バックアップ</button><button id="reset">新規ワールド</button></div></section>
 <section><h2>直近イベント</h2><div class="scroll">${world.events.slice(-18).reverse().map(e=>`<p><small>${e.tick}日目・${e.type}</small> ${e.detail}</p>`).join('')||'<p>まだイベントはありません。</p>'}</div></section><section><h2>会計・仕訳</h2><p>総仕訳数 ${world.ledger.length}件。貸借一致 ${validate(world)?'確認済み':'不一致'}</p><div class="scroll">${world.ledger.filter(j=>j.companyId===c.id).slice(-6).reverse().map(j=>`<p><small>${j.tick}日目</small> ${j.memo}</p>`).join('')}</div></section></main><footer>6業種共通基盤の試作です。全国地図・詳細契約・詳細物理等は未実装です。</footer>`;
 root.querySelectorAll('[data-industry]').forEach(b=>b.onclick=()=>{selected=b.dataset.industry;render()});
 const act=(id,fn)=>{root.querySelector('#'+id).onclick=async()=>{try{await fn();render()}catch(e){alert(e.message||String(e))}}};
 const send=(kind,extra={})=>{world=dispatch(world,{id:'UI-'+(++serial),kind,companyId:c.id,...extra})};
 act('job',()=>send('start'));act('buy',()=>send('purchase',{quantity:5}));act('invest',()=>send('invest',{amount:100000}));
 act('next',()=>send('advance',{ticks:1}));act('week',()=>send('advance',{ticks:7}));act('run',()=>send('advance',{ticks:speed}));
 act('save',async()=>{await save(world);alert('保存しました')});
 act('load',async()=>{const w=await load();if(!w)throw Error('保存データがありません');validate(w);world=w;serial=Object.keys(world.commands).length});
 act('recover',async()=>{const w=await recoverBackup();if(!w)throw Error('バックアップがありません');validate(w);world=w;serial=Object.keys(world.commands).length});
 act('reset',()=>{if(confirm('ゲームを初期化しますか？')){world=createWorld();serial=0}});
 root.querySelector('#speed').onchange=e=>speed=Number(e.target.value);
}
render();