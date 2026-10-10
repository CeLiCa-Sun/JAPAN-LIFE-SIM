const DB='keizai-sim-v41', STORE='saves';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)})}
export function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
export function encodeSave(state){const payload=JSON.stringify(state);return JSON.stringify({format:2,checksum:checksum(payload),payload})}
export function decodeSave(raw){if(!raw)return null;const v=JSON.parse(raw);if(v&&v.format===2){if(typeof v.payload!=='string'||checksum(v.payload)!==v.checksum)throw Error('セーブデータの整合性検査に失敗しました。バックアップから復元してください');return JSON.parse(v.payload)}return v}
export async function save(w){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);const prev=store.get('current');prev.onsuccess=()=>{if(prev.result)store.put(prev.result,'backup');store.put(encodeSave(w),'current')};prev.onerror=()=>tx.abort();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存が中断されました'))})}finally{db.close()}}
async function read(key){const db=await open();try{const raw=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return decodeSave(raw)}finally{db.close()}}
export const load=()=>read('current');
export const recoverBackup=()=>read('backup');
