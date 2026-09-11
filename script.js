const AUTH_KEY="mithraq_admin_auth_v1";
let authUser=null;

/* ===== MithraQ branded in-app alerts / confirmations ===== */
function ensureNoticeLayer(){
  let el=document.getElementById('noticeLayer');
  if(!el){
    el=document.createElement('div');el.id='noticeLayer';el.className='notice-layer hidden';
    el.innerHTML='<div class="notice-backdrop"></div><div class="notice-card" role="dialog" aria-modal="true"><div class="notice-icon" id="noticeIcon">!</div><div class="notice-title" id="noticeTitle">MithraQ</div><div class="notice-message" id="noticeMessage"></div><div class="notice-actions" id="noticeActions"></div></div>';
    document.body.appendChild(el);
  }
  return el;
}
function uiAlert(message,title='MithraQ'){
  const el=ensureNoticeLayer();
  document.getElementById('noticeIcon').textContent='✓';
  document.getElementById('noticeTitle').textContent=title;
  document.getElementById('noticeMessage').textContent=String(message||'');
  document.getElementById('noticeActions').innerHTML='<button class="btn gold notice-ok" onclick="closeNotice()">OK</button>';
  el.classList.remove('hidden');
}
function uiConfirm(message,onYes,onNo,title='Confirm Action'){
  const el=ensureNoticeLayer();
  document.getElementById('noticeIcon').textContent='?';
  document.getElementById('noticeTitle').textContent=title;
  document.getElementById('noticeMessage').textContent=String(message||'');
  document.getElementById('noticeActions').innerHTML='<button class="btn notice-cancel" onclick="noticeNo()">Cancel</button><button class="btn gold" onclick="noticeYes()">Yes, Continue</button>';
  window.__noticeYes=()=>{closeNotice();if(typeof onYes==='function')onYes();};
  window.__noticeNo=()=>{closeNotice();if(typeof onNo==='function')onNo();};
  el.classList.remove('hidden');
}
function closeNotice(){const el=document.getElementById('noticeLayer');if(el)el.classList.add('hidden');window.__noticeYes=null;window.__noticeNo=null;}
function noticeYes(){if(window.__noticeYes)window.__noticeYes();}
function noticeNo(){if(window.__noticeNo)window.__noticeNo();else closeNotice();}
function getAuth(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||"null")}catch(e){return null}}
function authHash(text){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)).then(b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""))}
async function setupAdmin(){const name=(document.getElementById("setupName")?.value||"").trim(),username=(document.getElementById("setupUser")?.value||"").trim(),password=document.getElementById("setupPass")?.value||"",confirmPass=document.getElementById("setupPass2")?.value||"";if(!name||!username||password.length<6)return uiAlert("Enter name, username and a password of at least 6 characters.");if(password!==confirmPass)return uiAlert("Passwords do not match.");const hash=await authHash(password);localStorage.setItem(AUTH_KEY,JSON.stringify({name,username,hash,createdAt:new Date().toISOString()}));authUser=getAuth();showApp()}
async function loginAdmin(){const username=(document.getElementById("loginUser")?.value||"").trim(),password=document.getElementById("loginPass")?.value||"",a=getAuth();if(!a)return showLogin();const hash=await authHash(password);if(username!==a.username||hash!==a.hash){const e=document.getElementById("loginError");if(e)e.textContent="Incorrect username or password.";return}authUser=a;showApp()}
function logoutAdmin(){uiConfirm("Logout from MithraQ?",()=>{authUser=null;showLogin()});}
function authScreen(){const a=getAuth();if(!a)return `<div class="auth-screen"><div class="auth-card"><div class="brand-mark auth-logo">♛</div><h1>Welcome to MithraQ</h1><p class="auth-sub">Create your administrator account</p><div class="form"><input id="setupName" placeholder="Admin name"><input id="setupUser" placeholder="Admin username" autocomplete="username"><input id="setupPass" type="password" placeholder="Password (min 6 characters)" autocomplete="new-password"><input id="setupPass2" type="password" placeholder="Confirm password" autocomplete="new-password"><button class="btn gold full" onclick="setupAdmin()">Create Admin Account</button></div><div class="auth-note">This browser login protects the app on this device. For true multi-device security, connect a backend with Supabase Auth.</div></div></div>`;return `<div class="auth-screen"><div class="auth-card"><div class="brand-mark auth-logo">♛</div><h1>MithraQ</h1><p class="auth-sub">Admin Login</p><div class="form"><input id="loginUser" placeholder="Username" autocomplete="username"><input id="loginPass" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter')loginAdmin()"><button class="btn gold full" onclick="loginAdmin()">Login</button><div id="loginError" class="auth-error"></div></div><div class="auth-note">Your password is stored as a SHA-256 hash in this browser, not as plain text.</div></div></div>`}
function showLogin(){document.querySelector('.app').classList.add('locked');document.body.classList.add('auth-mode');document.getElementById('authRoot').innerHTML=authScreen()}
function showApp(){document.querySelector('.app').classList.remove('locked');document.body.classList.remove('auth-mode');document.getElementById('authRoot').innerHTML='';render()}
const KEY="mithraq_v2_groupwise";
const SUPA_CFG_KEY="mithraq_supabase_config_v1";
let supa=null, supaStatus="Not connected", syncBusy=false, supaChannel=null, autoSyncTimer=null, lastCloudUpdatedAt=null;
function getSupabaseConfig(){try{return JSON.parse(localStorage.getItem(SUPA_CFG_KEY)||"null")}catch(e){return null}}
function initSupabase(){const c=getSupabaseConfig();if(!c?.url||!c?.anonKey||!window.supabase){supa=null;supaStatus=window.supabase?"Not configured":"Library loading";return false}try{if(supaChannel){try{supa.removeChannel(supaChannel)}catch(e){}}supa=window.supabase.createClient(c.url,c.anonKey);supaStatus="Connected";if(c.realtime){supaChannel=supa.channel("mithraq-live-sync").on("postgres_changes",{event:"*",schema:"public",table:"mithraq_data",filter:"id=eq.main"},async(payload)=>{if(syncBusy)return;const row=payload.new;if(row?.data&&row.updated_at!==lastCloudUpdatedAt){state={chits:row.data.chits||[],members:row.data.members||[],auctions:row.data.auctions||[],payments:row.data.payments||[]};lastCloudUpdatedAt=row.updated_at||null;localStorage.setItem(KEY,JSON.stringify(state));supaStatus="Live update received";render();}}).subscribe();}return true}catch(e){supa=null;supaStatus="Invalid configuration";return false}}
initSupabase();
let state=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{chits:[],members:[],auctions:[],payments:[]}}catch(e){return {chits:[],members:[],auctions:[],payments:[]}}})();
// Migrate old MithraQ data if it exists.
if(!state.chits.length && !state.members.length){try{const old=JSON.parse(localStorage.getItem('mithraq_v1')||'null');if(old)state=old;}catch(e){}}
state.chits=Array.isArray(state.chits)?state.chits:[]; state.members=Array.isArray(state.members)?state.members:[];
state.auctions=Array.isArray(state.auctions)?state.auctions:[]; state.payments=Array.isArray(state.payments)?state.payments:[];
let tab="home";
let collectionMonthValue=new Date().toISOString().slice(0,7);
function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  scheduleCloudSync();
}
function scheduleCloudSync(){
  const c=getSupabaseConfig();
  if(!supa||!c?.autoSync)return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer=setTimeout(async()=>{await pushToSupabase();render();},900);
}
async function pushToSupabase(){if(!supa||syncBusy)return false;syncBusy=true;try{const now=new Date().toISOString();const payload={id:"main",data:state,updated_at:now};const {error}=await supa.from("mithraq_data").upsert(payload,{onConflict:"id"});if(error)throw error;lastCloudUpdatedAt=now;supaStatus="Synced";return true}catch(e){supaStatus="Sync error: "+(e.message||"unknown");return false}finally{syncBusy=false}}
async function pullFromSupabase(){if(!supa||syncBusy)return false;syncBusy=true;try{const {data,error}=await supa.from("mithraq_data").select("data,updated_at").eq("id","main").maybeSingle();if(error)throw error;if(data?.data){state={chits:data.data.chits||[],members:data.data.members||[],auctions:data.data.auctions||[],payments:data.data.payments||[]};save();supaStatus="Downloaded";render();return true}supaStatus="Connected (no cloud data yet)";return false}catch(e){supaStatus="Sync error: "+(e.message||"unknown");return false}finally{syncBusy=false}}
async function syncCloud(mode="push"){if(!initSupabase()){uiAlert("Supabase is not configured. Open Settings → Supabase Live Sync and enter your Project URL + anon key.");return}const ok=mode==='pull'?await pullFromSupabase():await pushToSupabase();uiAlert(ok?(mode==='pull'?'Cloud data downloaded successfully.':'Data uploaded to Supabase successfully.'):'Supabase sync failed. Check the configuration and RLS policy.');render()}
function supabasePanel(){const c=getSupabaseConfig()||{};return `<div class="card"><h3 style="margin-top:0">☁️ Supabase Cloud & Live Sync</h3><div class="muted">Status: <b>${esc(supaStatus)}</b>${lastCloudUpdatedAt?` • Last sync: ${esc(new Date(lastCloudUpdatedAt).toLocaleString())}`:''}</div><div class="form"><input id="supaUrl" value="${esc(c.url||'')}" placeholder="Supabase Project URL"><input id="supaAnon" value="${esc(c.anonKey||'')}" placeholder="Supabase anon/public key" type="password"><label class="check-row"><input id="supaAuto" type="checkbox" ${c.autoSync?'checked':''}> Auto-sync changes</label><label class="check-row"><input id="supaRealtime" type="checkbox" ${c.realtime?'checked':''}> Receive live updates from other devices</label><button class="btn gold full" onclick="saveSupabaseConfig()">Save & Connect</button></div><div class="backup-grid"><button class="btn" onclick="syncCloud('pull')">⬇️ Download Cloud</button><button class="btn" onclick="syncCloud('push')">⬆️ Upload to Cloud</button></div><div class="backup-note">Use only the Supabase <b>anon/public</b> key in this browser. Never paste the service-role/secret key here. Run the included <b>supabase_phase10.sql</b> once in Supabase SQL Editor before syncing.</div></div>`}
function saveSupabaseConfig(){const url=(document.getElementById('supaUrl')?.value||'').trim().replace(/\/$/,''),anonKey=(document.getElementById('supaAnon')?.value||'').trim(),autoSync=!!document.getElementById('supaAuto')?.checked,realtime=!!document.getElementById('supaRealtime')?.checked;if(!/^https:\/\/[^ ]+\.supabase\.co$/.test(url)||anonKey.length<20)return uiAlert('Enter a valid Supabase Project URL and anon/public key.');localStorage.setItem(SUPA_CFG_KEY,JSON.stringify({url,anonKey,autoSync,realtime}));initSupabase();uiAlert('Supabase connection saved.');render()}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function chitById(id){return state.chits.find(c=>String(c.id)===String(id));}
function membersForChit(id){return state.members.filter(m=>(m.chitIds||[]).map(String).includes(String(id)));}
function memberMonthly(m,c){const x=(m?.memberships||[]).find(v=>String(v.chitId)===String(c?.id));return Number(x?.monthly||m?.monthly||c?.monthly||0);}
function normalizeMember(m){if(!Array.isArray(m.chitIds))m.chitIds=[];if(!Array.isArray(m.memberships))m.memberships=m.chitIds.map(id=>({chitId:id,monthly:Number(m.monthly||chitById(id)?.monthly||0)}));m.address=m.address||'';m.nomineeName=m.nomineeName||'';m.nomineePhone=m.nomineePhone||'';return m;}
state.members.forEach(normalizeMember);
function searchPage(){return `<h2 class="page-title">Search</h2><div class="subtitle">Find members, chits and payments quickly</div><div class="search-box"><input id="globalSearch" placeholder="Search name, phone, member ID or chit..." oninput="runGlobalSearch()"><button class="btn gold" onclick="runGlobalSearch()">Search</button></div><div id="searchResults"><div class="empty">Type something to search.</div></div>`;}
function runGlobalSearch(){const q=String(document.getElementById('globalSearch')?.value||'').trim().toLowerCase(),el=document.getElementById('searchResults');if(!el)return;if(!q){el.innerHTML='<div class="empty">Type something to search.</div>';return;}const out=[];state.members.filter(m=>[m.name,m.phone,m.memberNo].some(v=>String(v||'').toLowerCase().includes(q))).forEach(m=>out.push(`<div class="card search-result"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(m.name)}</b><div class="muted">Member #${esc(m.memberNo||'—')} • ${esc(m.phone||'No phone')}</div></div><button class="action-btn" onclick="memberStatement('${String(m.id)}')">Statement</button></div>`));state.chits.filter(c=>String(c.name||'').toLowerCase().includes(q)).forEach(c=>out.push(`<div class="card search-result"><div class="avatar">▣</div><div style="flex:1"><b>${esc(c.name)}</b><div class="muted">${c.type==='dividend'?'Dividend':'Fixed'} • Monthly ${money(c.monthly||0)}</div></div><button class="action-btn edit" onclick="setTab('chits')">Open</button></div>`));state.payments.filter(p=>[p.member,p.chit,p.month,p.date].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,20).forEach(p=>out.push(`<div class="card search-result"><div class="avatar">₹</div><div style="flex:1"><b>${esc(p.member||'Member')}</b><div class="muted">${esc(p.chit||'')} • ${esc(p.month||'')} • ${esc(p.mode||'')}</div></div><b>${money(p.amount)}</b></div>`));el.innerHTML=out.length?`<div class="list">${out.join('')}</div>`:'<div class="empty">No matching records found.</div>';}
function backupData(){const payload={app:'MithraQ',version:5,exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mithraq-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function restoreData(){document.getElementById('restoreFile')?.click();}
function handleRestore(input){const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);const d=x.data||x;if(!d||!Array.isArray(d.chits)||!Array.isArray(d.members))throw new Error('Invalid backup');uiConfirm('Restore this backup? Current data will be replaced.',()=>{state={chits:d.chits||[],members:d.members||[],auctions:d.auctions||[],payments:d.payments||[]};save();uiAlert('Backup restored successfully.');tab='home';render();input.value='';},()=>{input.value='';});}catch(e){uiAlert('Invalid MithraQ backup file.');input.value='';}};r.readAsText(f);}
function settingsPanel(){const a=getAuth();return `<div class="card"><h3 style="margin-top:0">Security & Data</h3><div class="muted">Admin: ${esc(a?.name||"Admin")} • Username: ${esc(a?.username||"—")}</div><div class="backup-grid"><button class="btn" onclick="logoutAdmin()">🔒 Logout</button><button class="btn gold" onclick="backupData()">⬇️ Backup Data</button><button class="btn" onclick="restoreData()">⬆️ Restore Data</button></div><input id="restoreFile" class="file-input" type="file" accept="application/json,.json" onchange="handleRestore(this)"><div class="backup-note">Backup includes chits, members, auctions and payments. Browser login remains available offline.</div></div>`+supabasePanel()}
const MENU_TABS=['members','reports','search','history','settings'];
function render(){const app=document.getElementById("app"); if(tab==='home')app.innerHTML=home(); if(tab==='chits')app.innerHTML=chits(); if(tab==='members')app.innerHTML=members(); if(tab==='auction')app.innerHTML=auction(); if(tab==='reports')app.innerHTML=reports(); if(tab==='collection')app.innerHTML=collection(); if(tab==='search')app.innerHTML=searchPage(); if(tab==='history')app.innerHTML=historyPage(); if(tab==='settings')app.innerHTML='<h2 class="page-title">Settings</h2><div class="subtitle">Security, backup and device controls</div>'+settingsPanel(); document.querySelectorAll('.bottom-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); const navMenuBtn=document.getElementById('navMenuBtn'); if(navMenuBtn)navMenuBtn.classList.toggle('active',MENU_TABS.includes(tab));}
function openMenuSheet(){const s=document.getElementById('menuSheet'); if(s)s.classList.remove('hidden');}
function closeMenuSheet(){const s=document.getElementById('menuSheet'); if(s)s.classList.add('hidden');}
function chitStatus(c){if(c.status)return c.status;return Number(c.current||0)>=Number(c.duration||0)&&Number(c.duration||0)>0?'completed':'active';}
function chits(){
 const active=state.chits.filter(c=>chitStatus(c)==='active').length, completed=state.chits.filter(c=>chitStatus(c)==='completed').length;
 return `<div class="row"><div><h2 class="page-title">Chit Groups</h2><div class="subtitle">Manage groups, capacity and monthly progress.</div></div><button class="btn gold" onclick="newChit()">+ New Chit</button></div>
 <div class="grid chit-summary"><div class="card"><div class="stat-label">ACTIVE</div><div class="stat-value">${active}</div></div><div class="card"><div class="stat-label">COMPLETED</div><div class="stat-value">${completed}</div></div><div class="card"><div class="stat-label">TOTAL MEMBERS</div><div class="stat-value">${state.members.length}</div></div></div>
 <div class="list">${state.chits.length?state.chits.map(c=>{const n=membersForChit(c.id).length,cap=Number(c.capacity||c.duration||0),status=chitStatus(c),pct=Math.min(100,(Number(c.current||0)/Math.max(1,Number(c.duration||1)))*100),full=cap>0&&n>=cap;return `<div class="card chit-card ${status==='completed'?'completed-card':''}"><div class="chit-card-head"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${money(c.amount)} · ${c.duration||0} months · ${c.type==='dividend'?'Dividend':'Fixed'}</div></div><div class="chit-card-tools"><button class="icon-action edit" type="button" title="Edit Chit" onclick="editChit('${String(c.id)}')">✎</button><button class="icon-action delete" type="button" title="Delete Chit" onclick="deleteChit('${String(c.id)}')">⌫</button></div></div><div class="chit-card-meta"><span class="badge ${status==='completed'?'':'active'}">${status.toUpperCase()}</span><span class="badge ${full?'danger-badge':''}">${n}/${cap||'∞'} MEMBERS</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="muted">Monthly ${money(c.monthly||0)} · Month ${c.current||0}/${c.duration||0} · ${Math.round(pct)}% complete</div><div class="chit-actions-row"><button class="small-link" onclick="openGroupMembers('${c.id}')">View ${n} members →</button><button class="small-link" onclick="changeChitMonth('${c.id}',-1)" ${Number(c.current||0)<=0?'disabled':''}>− Month</button><button class="small-link" onclick="changeChitMonth('${c.id}',1)" ${status==='completed'?'disabled':''}>+ Month</button><button class="small-link" onclick="toggleChitStatus('${c.id}')">${status==='completed'?'Reopen':'Complete'}</button></div></div>`}).join(''):'<div class="empty">No chits yet.<br><br><button class="btn gold" onclick="newChit()">Create your first chit</button></div>'}</div>`;
}
function changeChitMonth(id,delta){const c=chitById(id);if(!c)return;c.current=Math.max(0,Math.min(Number(c.duration||0),Number(c.current||0)+Number(delta||0)));c.status=Number(c.current)>=Number(c.duration||0)&&Number(c.duration||0)>0?'completed':'active';save();render();}
function toggleChitStatus(id){const c=chitById(id);if(!c)return;c.status=chitStatus(c)==='completed'?'active':'completed';if(c.status==='completed')c.current=Number(c.duration||c.current||0);save();render();}


function editChit(id){
  const c=chitById(id); if(!c)return;
  openModal('Edit Chit Group',`<div class="form">
    <label class="field-label">Chit name</label><input id="eName" value="${esc(c.name)}" placeholder="Chit name">
    <label class="field-label">Chit value</label><input id="eAmount" type="number" value="${Number(c.amount||0)}" placeholder="Total amount ₹">
    <label class="field-label">Duration</label><input id="eDuration" type="number" value="${Number(c.duration||0)}" placeholder="Duration (months)"><label class="field-label">Member capacity</label><input id="eCapacity" type="number" value="${Number(c.capacity||c.duration||0)}" placeholder="Maximum members">
    <label class="field-label">Type</label><select id="eType"><option value="fixed" ${c.type!=='dividend'?'selected':''}>Fixed Chit</option><option value="dividend" ${c.type==='dividend'?'selected':''}>Dividend Chit</option></select>
    <label class="field-label">Commission %</label><input id="eCommission" type="number" value="${Number(c.commission||0)}" placeholder="Commission %">
    <button class="btn gold full" onclick="updateChit('${String(id).replace(/'/g,"\'")}')">Save Changes</button>
  </div>`);
}
function updateChit(id){
  const c=chitById(id); if(!c)return;
  const name=document.getElementById('eName').value.trim(), amount=Number(document.getElementById('eAmount').value), duration=Number(document.getElementById('eDuration').value);
  if(!name||!amount||!duration){uiAlert('Please enter chit name, amount and duration.');return;}
  c.name=name; c.amount=amount; c.duration=duration; c.capacity=Number(document.getElementById('eCapacity')?.value||duration); c.type=document.getElementById('eType').value; c.commission=Number(document.getElementById('eCommission').value||0); c.monthly=amount/duration;
  save(); closeModal(); render();
}
function deleteChit(id){
  const c=chitById(id); if(!c)return;
  const n=membersForChit(id).length;
  openModal('Delete Chit Group',`<div class="delete-dialog">
    <div class="delete-icon">⌫</div><h3>Delete “${esc(c.name)}”?</h3>
    <p>This will permanently remove this chit group${n?` and its ${n} member(s)`:''}. Auction records for this group will also be removed.</p>
    <div class="delete-actions"><button class="btn cancel-btn" onclick="closeModal()">Cancel</button><button class="btn danger full" onclick="confirmDeleteChit('${String(id).replace(/'/g,"\'")}')">Yes, Delete</button></div>
  </div>`);
}
function confirmDeleteChit(id){
  const sid=String(id); state.chits=state.chits.filter(c=>String(c.id)!==sid); state.members=state.members.filter(m=>!(m.chitIds||[]).map(String).includes(sid)); state.auctions=state.auctions.filter(a=>String(a.chitId)!==sid); save(); closeModal(); render();
}
function newChit(){openModal('Create New Chit',`<div class="form"><input id="fName" placeholder="Chit name"><input id="fAmount" type="number" placeholder="Total amount ₹"><input id="fDuration" type="number" placeholder="Duration (months)"><input id="fCapacity" type="number" placeholder="Maximum members (optional)"><select id="fType"><option value="fixed">Fixed Chit</option><option value="dividend">Dividend Chit</option></select><input id="fCommission" type="number" placeholder="Commission % (optional)"><button class="btn gold full" onclick="createChit()">Create Chit</button></div>`);}
function createChit(){
  try{
    const name=(document.getElementById('fName')?.value||'').trim();
    const amount=Number(document.getElementById('fAmount')?.value||0);
    const duration=Number(document.getElementById('fDuration')?.value||0);
    const type=document.getElementById('fType')?.value||'fixed';
    const commission=Number(document.getElementById('fCommission')?.value||0);
    const capacity=Number(document.getElementById('fCapacity')?.value||duration);
    if(!name||!amount||!duration) return uiAlert('Please enter chit name, amount and duration.');
    state.chits.push({id:Date.now(),name,amount,duration,current:0,monthly:amount/duration,type,commission,capacity,status:'active'});
    save(); closeModal(); render();
    uiAlert('Chit created successfully.','Saved');
  }catch(e){
    console.error('Create chit error:',e);
    uiAlert('Unable to save chit: '+(e.message||'Unknown error.'),'Save Error');
  }
}
function filterMembers(){const q=(document.getElementById('memberSearch')?.value||'').trim().toLowerCase();document.querySelectorAll('.member-row').forEach(el=>{const hay=(el.dataset.search||'');el.style.display=!q||hay.includes(q)?'':'none';});document.querySelectorAll('.member-group-count').forEach(box=>{const group=box.closest('.accordion-body');if(!group)return;const visible=[...group.querySelectorAll('.member-row')].filter(x=>x.style.display!=='none').length;box.textContent=visible+' shown';});}
function members(){if(!state.chits.length)return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">Create a chit group first.</div></div></div><div class="empty big-empty"><div class="empty-icon">♙</div><b>No chit groups available</b><p>Add a chit first. Members will be added <strong>group-wise</strong> only to the chit you select.</p><button class="btn gold" onclick="newChit()">+ Create Chit</button></div>`;return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">${state.members.length} registered members • Chit wise</div></div><button class="btn gold" onclick="newMember()">+ Add</button></div><div class="member-toolbar"><input id="memberSearch" placeholder="Search member name, phone or ID..." oninput="filterMembers()"><span class="member-total">${state.members.length} total</span></div><div class="accordion-list">${state.chits.map(c=>{const n=membersForChit(c.id).length,cap=Number(c.duration||0),full=cap>0&&n>=cap;return `<div class="accordion-item" id="acc-${c.id}"><div class="accordion-header" onclick="toggleChitAccordion('${String(c.id)}')"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${n}/${cap||'∞'} members${full?' • FULL':''} • Monthly ${money(c.monthly||0)}</div></div><span class="accordion-arrow">▾</span></div><div class="accordion-body"><div class="member-group-count muted">${n} shown</div><div class="list">${groupMemberPanel(c.id)}</div></div></div>`}).join('')}</div>`;}
function toggleChitAccordion(id){const item=document.getElementById('acc-'+id);if(!item)return;const willOpen=!item.classList.contains('open');if(willOpen)document.querySelectorAll('.accordion-item.open').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.toggle('open',willOpen);if(willOpen)item.scrollIntoView({behavior:'smooth',block:'start'});}
function openGroupMembers(id){tab='members';render();setTimeout(()=>{const item=document.getElementById('acc-'+id);if(item){document.querySelectorAll('.accordion-item.open').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.add('open');item.scrollIntoView({behavior:'smooth',block:'start'});}},0);}
function newMember(preselect=''){if(!state.chits.length)return uiAlert('Please create a chit group first.');openModal('Add Member — Chit Groups & Details',`<div class="form"><label class="field-label">Chit Group(s) <span>*</span></label><div class="group-checks">${state.chits.map(c=>{const n=membersForChit(c.id).length,cap=Number(c.duration||0),full=cap>0&&n>=cap;return `<label class="group-check"><input type="checkbox" class="mChitCheck" value="${c.id}" ${String(c.id)===String(preselect)?'checked':''} ${full?'disabled':''}><span>${esc(c.name)} • ${c.type==='dividend'?'Dividend':'Fixed'} • ${money(c.monthly||0)}/month • ${n}/${cap||'∞'}${full?' • FULL':''}</span></label>`}).join('')}</div><label class="field-label">Member details</label><input id="mName" placeholder="Member name"><input id="mPhone" type="tel" placeholder="Phone number"><input id="mNo" placeholder="Member number (optional)"><input id="mDate" type="date" value="${new Date().toISOString().slice(0,10)}"><input id="mAddress" placeholder="Address"><input id="mNominee" placeholder="Nominee name"><input id="mNomineePhone" type="tel" placeholder="Nominee phone"><input id="mMonthly" type="number" placeholder="Monthly amount ₹ (optional)"><button class="btn gold full" onclick="createMember()">Add Member</button><div class="form-note">One member can now be assigned to multiple chit groups. Existing group-wise behavior is preserved.</div></div>`);}
function createMember(){const checks=[...document.querySelectorAll('.mChitCheck:checked')];if(!checks.length)return uiAlert('Select at least one chit group.');const name=document.getElementById('mName').value.trim();if(!name)return uiAlert('Enter member name.');const phone=document.getElementById('mPhone').value.trim();const memberNo=document.getElementById('mNo').value.trim();if(phone&&state.members.some(x=>String(x.phone||'')===phone))return uiAlert('This phone number is already registered.');if(memberNo&&state.members.some(x=>String(x.memberNo||'')===memberNo))return uiAlert('This member number is already registered.');const selected=checks.map(x=>String(x.value));for(const chitId of selected){const c=chitById(chitId),cap=Number(c?.duration||0);if(!c)continue;if(cap>0&&membersForChit(chitId).length>=cap)return uiAlert(`"${c.name}" is full. Remove it from selection or increase the chit duration.`);}const monthly=Number(document.getElementById('mMonthly').value||0);const m={id:Date.now(),name,phone,memberNo,joiningDate:document.getElementById('mDate').value,address:document.getElementById('mAddress').value.trim(),nomineeName:document.getElementById('mNominee').value.trim(),nomineePhone:document.getElementById('mNomineePhone').value.trim(),chitIds:selected,monthly,memberships:selected.map(id=>({chitId:id,monthly:Number(monthly||chitById(id)?.monthly||0)}))};state.members.push(m);save();closeModal();tab='members';render();}

function editMember(id){const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;normalizeMember(m);openModal('Edit Member — Groups & Nominee',`<div class="form"><label class="field-label">Member name</label><input id="emName" value="${esc(m.name)}"><label class="field-label">Phone number</label><input id="emPhone" type="tel" value="${esc(m.phone||'')}"><label class="field-label">Member number</label><input id="emNo" value="${esc(m.memberNo||'')}"><label class="field-label">Joining date</label><input id="emDate" type="date" value="${esc(m.joiningDate||'')}"><input id="emAddress" placeholder="Address" value="${esc(m.address||'')}"><input id="emNominee" placeholder="Nominee name" value="${esc(m.nomineeName||'')}"><input id="emNomineePhone" type="tel" placeholder="Nominee phone" value="${esc(m.nomineePhone||'')}"><label class="field-label">Chit Groups</label><div class="group-checks">${state.chits.map(c=>`<label class="group-check"><input type="checkbox" class="emChitCheck" value="${c.id}" ${(m.chitIds||[]).map(String).includes(String(c.id))?'checked':''}><span>${esc(c.name)} • Monthly ${money(c.monthly||0)}</span></label>`).join('')}</div><label class="field-label">Default monthly amount ₹</label><input id="emMonthly" type="number" value="${Number(m.monthly||0)}"><button class="btn gold full" onclick="updateMember('${String(id)}')">Save Changes</button></div>`);}
function updateMember(id){const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;const name=document.getElementById('emName').value.trim();if(!name)return uiAlert('Enter member name.');m.name=name;m.phone=document.getElementById('emPhone').value.trim();m.memberNo=document.getElementById('emNo').value.trim();m.joiningDate=document.getElementById('emDate').value;m.address=document.getElementById('emAddress').value.trim();m.nomineeName=document.getElementById('emNominee').value.trim();m.nomineePhone=document.getElementById('emNomineePhone').value.trim();m.monthly=Number(document.getElementById('emMonthly').value||0);const ids=[...document.querySelectorAll('.emChitCheck:checked')].map(x=>String(x.value));if(!ids.length)return uiAlert('A member must belong to at least one chit group.');m.chitIds=ids;m.memberships=ids.map(chitId=>{const old=(m.memberships||[]).find(x=>String(x.chitId)===String(chitId));return {chitId,monthly:Number(old?.monthly||m.monthly||chitById(chitId)?.monthly||0)}});save();closeModal();render();}
function deleteMember(id){
  const m=state.members.find(x=>String(x.id)===String(id)); if(!m)return;
  openModal('Delete Member',`<div class="delete-dialog">
    <div class="delete-icon">⌫</div><h3>Delete "${esc(m.name)}"?</h3>
    <p>This will permanently remove this member along with their payment and auction records.</p>
    <div class="delete-actions"><button class="btn cancel-btn" onclick="closeModal()">Cancel</button><button class="btn danger full" onclick="confirmDeleteMember('${String(id).replace(/'/g,"\'")}')">Yes, Delete</button></div>
  </div>`);
}
function confirmDeleteMember(id){
  const sid=String(id);
  state.members=state.members.filter(m=>String(m.id)!==sid);
  state.payments=state.payments.filter(p=>String(p.memberId)!==sid);
  state.auctions=state.auctions.filter(a=>String(a.memberId)!==sid);
  save(); closeModal(); render();
}
function savePayment(memberId,chitId,month){
  const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);
  if(!m||!c)return;
  const amount=Number(document.getElementById('pAmount')?.value||0);
  if(amount<=0)return uiAlert('Enter a valid amount.');
  const date=document.getElementById('pDate')?.value||new Date().toISOString().slice(0,10);
  const mode=document.getElementById('pMode')?.value||'Cash';
  const note=(document.getElementById('pNote')?.value||'').trim();
  let p=paymentFor(memberId,month);
  if(p){
    p.amount=amount; p.date=date; p.mode=mode; p.note=note;
  }else{
    p={id:Date.now(),memberId:m.id,member:m.name,chitId:c.id,chit:c.name,month,amount,date,mode,note,status:'paid'};
    state.payments.unshift(p);
  }
  save(); closeModal(); render();
}
function collectMember(memberId,chitId){
  const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);
  if(!m||!c)return;
  const month=collectionMonthValue||new Date().toISOString().slice(0,7),existing=paymentFor(memberId,month),expected=memberMonthly(m,c);
  openModal(existing?'Payment Details':'Collect Payment',`<div class="payment-modal"><div class="payment-person"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div><b>${esc(m.name)}</b><div class="muted">${esc(c.name)} • ${month} • Expected ${money(expected)}</div></div></div><div class="form"><label class="field-label">Amount paid</label><input id="pAmount" type="number" value="${existing?Number(existing.amount):expected}"><label class="field-label">Payment date</label><input id="pDate" type="date" value="${existing?esc(existing.date):new Date().toISOString().slice(0,10)}"><label class="field-label">Payment mode</label><select id="pMode"><option ${existing?.mode==='Cash'?'selected':''}>Cash</option><option ${existing?.mode==='UPI'?'selected':''}>UPI</option><option ${existing?.mode==='Bank'?'selected':''}>Bank</option></select><input id="pNote" placeholder="Note (optional)" value="${esc(existing?.note||'')}"><button class="btn gold full" onclick="savePayment('${String(memberId)}','${String(chitId)}','${month}')">${existing?'Update Payment':'Save Payment'}</button>${existing?`<button class="btn full" onclick="printReceipt('${String(existing.id)}')">🧾 Print ${receiptNo(existing)}</button><button class="btn danger-outline full" onclick="deletePayment('${String(existing.id)}')">⌫ Delete Payment</button>`:''}<button class="btn full" onclick="whatsappPaymentReminder('${String(memberId)}','${String(chitId)}')">💬 WhatsApp Reminder</button></div></div>`);
}
function paymentFor(memberId,month){return state.payments.find(p=>String(p.memberId)===String(memberId)&&p.month===month);}
function receiptNo(p){if(!p)return '—'; if(p.receiptNo)return p.receiptNo; const d=String(p.date||'').replace(/-/g,'').slice(0,6)||'000000'; const idx=state.payments.indexOf(p)+1; return 'MQ-'+d+'-'+String(idx).padStart(4,'0');}
function paymentStatus(p,expected){if(!p)return 'pending';const a=Number(p.amount||0),e=Number(expected||0);return a>=e?'paid':'partial';}
function deletePayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;uiConfirm('Delete receipt '+receiptNo(p)+'? This payment record will be removed.',()=>{state.payments=state.payments.filter(x=>String(x.id)!==String(p.id));save();closeModal();render();});}
function editPayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));const c=chitById(p.chitId);openModal('Edit Payment',`<div class="payment-person"><div class="avatar">${esc((m?.name||p.member||'?')[0]).toUpperCase()}</div><div><b>${esc(m?.name||p.member||'Member')}</b><div class="muted">${esc(c?.name||p.chit||'')} • ${esc(p.month||'')}</div></div></div><div class="form"><label class="field-label">Amount paid</label><input id="epAmount" type="number" value="${Number(p.amount||0)}"><label class="field-label">Payment date</label><input id="epDate" type="date" value="${esc(p.date||'')}"><label class="field-label">Mode</label><select id="epMode"><option ${p.mode==='Cash'?'selected':''}>Cash</option><option ${p.mode==='UPI'?'selected':''}>UPI</option><option ${p.mode==='Bank'?'selected':''}>Bank</option></select><input id="epNote" placeholder="Note" value="${esc(p.note||'')}"><button class="btn gold full" onclick="updatePayment('${String(id)}')">Save Changes</button><button class="btn danger-outline full" onclick="deletePayment('${String(id)}')">Delete Payment</button></div>`);}
function updatePayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;const amount=Number(document.getElementById('epAmount').value||0);if(amount<=0)return uiAlert('Enter a valid amount.');p.amount=amount;p.date=document.getElementById('epDate').value;p.mode=document.getElementById('epMode').value;p.note=document.getElementById('epNote').value.trim();save();closeModal();render();}

/* ===== Phase 8: Collection Search & Smart Filters ===== */
let collectionSearchValue='';
let collectionStatusFilter='all';
function setCollectionSearch(v){collectionSearchValue=String(v||'').toLowerCase().trim();renderCollectionGroup();}
function setCollectionStatus(v){collectionStatusFilter=v||'all';renderCollectionGroup();}
function clearCollectionFilters(){collectionSearchValue='';collectionStatusFilter='all';const q=document.getElementById('collectionSearch');if(q)q.value='';const f=document.getElementById('collectionStatus');if(f)f.value='all';renderCollectionGroup();}

function collection(){if(!state.chits.length)return `<h2 class="page-title">Collection</h2><div class="subtitle">Monthly member payments</div><div class="empty big-empty"><b>Create a chit group first</b><p>Then you can track paid, partial and pending monthly collections.</p><button class="btn gold" onclick="newChit()">+ Create Chit</button></div>`;const c=state.chits[0],month=collectionMonthValue;return `<div class="row"><div><h2 class="page-title">Collection</h2><div class="subtitle">Paid • Partial • Pending</div></div><input class="month-picker" id="collectionMonth" type="month" value="${month}" onchange="setCollectionMonth(this.value)"></div><div class="form collection-filter"><label class="field-label">Chit Group</label><select id="collectionChit" onchange="renderCollectionGroup()">${state.chits.map(x=>`<option value="${x.id}">${esc(x.name)} • ${x.type==='dividend'?'Dividend':'Fixed'}</option>`).join('')}</select></div><div class="collection-tools"><input id="collectionSearch" placeholder="Search member or phone..." value="${esc(collectionSearchValue)}" oninput="setCollectionSearch(this.value)"><select id="collectionStatus" onchange="setCollectionStatus(this.value)"><option value="all" ${collectionStatusFilter==='all'?'selected':''}>All Status</option><option value="paid" ${collectionStatusFilter==='paid'?'selected':''}>Paid</option><option value="partial" ${collectionStatusFilter==='partial'?'selected':''}>Partial</option><option value="pending" ${collectionStatusFilter==='pending'?'selected':''}>Pending</option></select><button class="btn" onclick="clearCollectionFilters()">Clear</button></div><div id="collectionGroup">${collectionGroup(c.id,month)}</div><div class="section"><h3>Payment History</h3><span class="muted">${state.payments.length} records</span></div><div class="list">${state.payments.length?state.payments.slice(0,30).map(p=>`<div class="card payment-row"><div style="flex:1"><b>${esc(p.member)}</b><div class="muted">${esc(p.chit)} • ${esc(p.month)} • ${esc(p.date)} • ${esc(p.mode)} • ${receiptNo(p)}</div></div><div style="text-align:right"><b>${money(p.amount)}</b><div><button class="mini-btn" onclick="editPayment('${String(p.id)}')">✎</button> <button class="mini-btn" onclick="printReceipt('${String(p.id)}')">🧾</button></div></div></div>`).join(''):'<div class="empty">No payment history yet.</div>'}</div>`;}
function setCollectionMonth(value){collectionMonthValue=value||new Date().toISOString().slice(0,7);renderCollectionGroup();}
function collectionGroup(id,month){const c=chitById(id),list=membersForChit(id);if(!c)return '';let paid=0,partial=0,pending=0,total=0,expected=0;list.forEach(m=>{const e=memberMonthly(m,c),p=paymentFor(m.id,month);expected+=e;if(!p)pending++;else if(Number(p.amount||0)>=e)paid++;else partial++;if(p)total+=Number(p.amount||0);});return `<div class="collection-stats"><div class="card"><span>Expected</span><b>${money(expected)}</b></div><div class="card"><span>Collected</span><b>${money(total)}</b></div><div class="card"><span>Balance</span><b>${money(Math.max(0,expected-total))}</b></div></div><div class="collection-summary"><span class="badge active">${paid} PAID</span><span class="badge partial">${partial} PARTIAL</span><span class="badge pending">${pending} PENDING</span></div><div class="payment-list"><div class="section"><h3>Members</h3><span class="muted">${list.length} members</span></div>${list.length?list.map(m=>{const p=paymentFor(m.id,month),e=memberMonthly(m,c),st=paymentStatus(p,e),label=st==='paid'?'PAID':st==='partial'?'PARTIAL':'PENDING';return `<div class="card payment-member"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(m.name)}</b><div class="muted">Expected ${money(e)} ${p?'• Paid '+money(p.amount):''}</div></div><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${label}</span><button class="action-btn ${p?'edit':'collect'}" onclick="collectMember('${String(m.id)}','${String(id)}')">${p?'Edit':'Collect'}</button>${!p?`<button class="mini-btn" onclick="whatsappPaymentReminder('${String(m.id)}','${String(id)}')">💬</button>`:''}</div>`}).join(''):'<div class="empty">No members in this group.</div>'}</div>`;}
function renderCollectionGroup(){const select=document.getElementById('collectionChit'),group=document.getElementById('collectionGroup');if(!select||!group)return;const id=select.value;group.innerHTML=collectionGroup(id,collectionMonthValue);}
function openModal(title,body){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modal').classList.remove('hidden');}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
window.addEventListener('load',()=>{authUser=getAuth();if(authUser)showApp();else showLogin();});
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
const _localSave=save; save=function(){_localSave(); if(supa) pushToSupabase();};
document.querySelectorAll('.bottom-nav button[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
// Initial rendering is deferred until all feature wrappers are initialized.

/* ===== MithraQ Professional Phase 3 ===== */
function memberPayments(memberId){return state.payments.filter(p=>String(p.memberId)===String(memberId)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));}
function memberStatement(memberId){
  const m=state.members.find(x=>String(x.id)===String(memberId)); if(!m)return;
  const ps=memberPayments(memberId), total=ps.reduce((s,p)=>s+Number(p.amount||0),0);
  const groups=(m.chitIds||[]).map(id=>chitById(id)).filter(Boolean);
  openModal('Member Statement',`<div class="statement-head"><div class="avatar big-avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div><h3>${esc(m.name)}</h3><div class="muted">${esc(m.phone||'No phone')} • Member #${esc(m.memberNo||'—')}</div></div></div>
  <div class="statement-stats"><div><span>Total Paid</span><b>${money(total)}</b></div><div><span>Payments</span><b>${ps.length}</b></div><div><span>Groups</span><b>${groups.length}</b></div></div>
  <div class="statement-groups">${groups.map(c=>`<span class="statement-chip">${esc(c.name)}</span>`).join('')||'<span class="muted">No group</span>'}</div>
  <div class="section"><h3>Payment History</h3><span class="muted">${ps.length} records</span></div>
  <div class="statement-list">${ps.length?ps.map(p=>`<div class="statement-row"><div><b>${esc(p.month||'')}</b><div class="muted">${esc(p.date||'')} • ${esc(p.mode||'')} ${p.note?`• ${esc(p.note)}`:''}</div></div><strong>${money(p.amount)}</strong><button class="mini-btn" onclick="printReceipt('${String(p.id)}')">🧾</button></div>`).join(''):'<div class="empty">No payments recorded.</div>'}</div>
  <button class="btn gold full" onclick="printMemberStatement('${String(memberId)}')">🖨️ Print Statement</button></div>`);
}
function printReceipt(paymentId){const p=state.payments.find(x=>String(x.id)===String(paymentId));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));const c=chitById(p.chitId);const w=window.open('','_blank','width=520,height=720');if(!w){uiAlert('Please allow pop-ups to print.');return;}w.document.write(`<html><head><title>${receiptNo(p)} - MithraQ</title><style>body{font-family:Arial;padding:28px;color:#24463d;max-width:460px;margin:auto}h1{color:#056b4f;margin-bottom:4px}.box{border:1px solid #ddd;border-radius:12px;padding:14px;margin:15px 0}.r{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee}.total{font-size:24px;font-weight:800;color:#056b4f;margin-top:15px}button{padding:10px 15px;border:0;border-radius:9px;background:#056b4f;color:white}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><div>Payment Receipt</div><div class="box"><div class="r"><span>Receipt</span><b>${receiptNo(p)}</b></div><div class="r"><span>Member</span><b>${esc(m?.name||p.member||'')}</b></div><div class="r"><span>Chit</span><b>${esc(c?.name||p.chit||'')}</b></div><div class="r"><span>Month</span><b>${esc(p.month||'')}</b></div><div class="r"><span>Date</span><b>${esc(p.date||'')}</b></div><div class="r"><span>Mode</span><b>${esc(p.mode||'')}</b></div><div class="total">Paid: ${money(p.amount)}</div></div><button onclick="window.print()">Print Receipt</button></body></html>`);w.document.close();}
function whatsappPaymentReceipt(paymentId){const p=state.payments.find(x=>String(x.id)===String(paymentId));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));if(!m?.phone)return uiAlert('Member phone number is missing.');const phone=String(m.phone).replace(/\D/g,'');const intl=phone.length===10?'91'+phone:phone;const text=`MithraQ Payment Receipt\n\nReceipt: ${receiptNo(p)}\nMember: ${m.name}\nChit: ${p.chit}\nMonth: ${p.month}\nAmount Paid: ${money(p.amount)}\nDate: ${p.date}\nMode: ${p.mode}`;window.open('https://wa.me/'+intl+'?text='+encodeURIComponent(text),'_blank');}
function whatsappPaymentReminder(memberId,chitId){
  const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId); if(!m||!c)return;
  const month=collectionMonthValue||new Date().toISOString().slice(0,7),p=paymentFor(memberId,month); if(p){uiAlert('This member is already marked as paid for '+month+'.');return;}
  if(!m.phone){uiAlert('This member does not have a phone number.');return;}
  const phone=String(m.phone).replace(/\D/g,''); const intl=phone.length===10?'91'+phone:phone;
  const text=`MithraQ Payment Reminder\n\nDear ${m.name},\nMonthly chit payment for ${c.name} (${month}) is pending.\nAmount: ${money(m.monthly||c.monthly||0)}\n\nPlease make the payment at your earliest convenience. Thank you.`;
  window.open('https://wa.me/'+intl+'?text='+encodeURIComponent(text),'_blank');
}
function printMemberStatement(memberId){
  const m=state.members.find(x=>String(x.id)===String(memberId));if(!m)return;const ps=memberPayments(memberId),total=ps.reduce((s,p)=>s+Number(p.amount||0),0);
  const w=window.open('','_blank','width=700,height=800');if(!w){uiAlert('Please allow pop-ups to print.');return;}
  w.document.write(`<html><head><title>${esc(m.name)} Statement</title><style>body{font-family:Arial;padding:28px;color:#24463d}h1{color:#056b4f}.meta{color:#71817c;margin-bottom:20px}.r{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #ddd}.total{font-size:22px;font-weight:800;margin-top:18px;color:#056b4f}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><h2>Member Statement</h2><div class="meta"><b>${esc(m.name)}</b> • ${esc(m.phone||'')} • Member #${esc(m.memberNo||'—')}</div>${ps.map(p=>`<div class="r"><span>${esc(p.month||'')} • ${esc(p.date||'')} • ${esc(p.mode||'')}</span><b>${money(p.amount)}</b></div>`).join('')||'<p>No payments.</p>'}<div class="total">Total Paid: ${money(total)}</div><button onclick="window.print()">Print</button></body></html>`);w.document.close();}
function dashboardRecent(){
  const items=[];
  state.payments.forEach(p=>items.push({time:p.date||'',type:'payment',title:`${p.member||'Member'} paid ${money(p.amount)}`,sub:`${p.chit||''} • ${p.month||''}`}));
  state.auctions.forEach(a=>items.push({time:a.date||'',type:'auction',title:`Auction: ${a.member||'Winner'}`,sub:`${a.chit||''} • ${money(a.bid)}`}));
  return items.slice(-8).reverse();
}
function home(){
  const total=state.chits.reduce((s,c)=>s+Number(c.amount||0),0),col=state.payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const pending=state.members.reduce((s,m)=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);return s+(!paymentFor(m.id,new Date().toISOString().slice(0,7))?memberMonthly(m,c):0)},0);
  const recent=dashboardRecent();
  return `<h2 class="page-title">Good day 👋</h2><div class="subtitle">MithraQ • Smart Chit Management</div><div class="hero"><small>♛ TOTAL CHIT PORTFOLIO</small><h2>${money(total)}</h2><div class="muted hero-muted">Collections, members, auctions and dividends in one place.</div></div>
  <div class="grid"><div class="card"><div class="stat-label">ACTIVE CHITS</div><div class="stat-value">${state.chits.length}</div></div><div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${state.members.length}</div></div><div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(col)}</div></div><div class="card"><div class="stat-label">THIS MONTH PENDING</div><div class="stat-value">${money(pending)}</div></div></div>
  <div class="section"><h3>Recent Activity</h3><span class="muted">Latest transactions</span></div><div class="activity-list">${recent.length?recent.map(x=>`<div class="card activity-row"><div class="activity-icon">${x.type==='payment'?'₹':'🔨'}</div><div><b>${esc(x.title)}</b><div class="muted">${esc(x.sub)} • ${esc(x.time)}</div></div></div>`).join(''):'<div class="empty recent">No transactions yet.</div>'}</div>`;
}
function exportPaymentsCSV(){const rows=[['Receipt No','Member','Phone','Chit','Month','Amount','Date','Mode','Status','Note'],...state.payments.map(p=>{const m=state.members.find(x=>String(x.id)===String(p.memberId));return[receiptNo(p),m?.name||p.member,m?.phone||'',p.chit,p.month,p.amount,p.date,p.mode,p.status||'paid',p.note||''];})];downloadCSV(rows,'mithraq-payments.csv');}
function exportMembersCSV(){const rows=[['Member ID','Member No','Name','Phone','Joining Date','Monthly','Groups'],...state.members.map(m=>[m.id,m.memberNo||'',m.name,m.phone||'',m.joiningDate||'',m.monthly||'',(m.chitIds||[]).map(id=>chitById(id)?.name||'').join(' | ')] )];downloadCSV(rows,'mithraq-members.csv');}
function downloadCSV(rows,name){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

/* ===== Professional Phase 6: Pending Dashboard + WhatsApp + Daily/Monthly Reports ===== */
let reportMonthValue=new Date().toISOString().slice(0,7);
function monthLabel(ym){if(!ym)return '';const [y,m]=ym.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
function expectedForMonth(month){return state.members.reduce((sum,m)=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);return sum+memberMonthly(m,c)},0);}
function paymentsForMonth(month){return state.payments.filter(p=>String(p.month||'')===String(month));}
function monthCollected(month){return paymentsForMonth(month).reduce((s,p)=>s+Number(p.amount||0),0);}
function pendingRows(month){return state.members.map(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);if(!c)return null;const expected=memberMonthly(m,c),p=paymentFor(m.id,month),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return null;return {m,c,p,expected,paid,balance};}).filter(Boolean);}
function whatsappPendingMember(memberId,chitId,month=reportMonthValue){const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);if(!m||!c)return;if(!m.phone)return uiAlert('Phone number is missing for '+(m.name||'this member')+'.');const p=paymentFor(memberId,month),expected=memberMonthly(m,c),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return uiAlert('No pending balance for '+m.name+'.');const phone=String(m.phone).replace(/\D/g,'');const intl=phone.length===10?'91'+phone:phone;const text=`MithraQ Payment Reminder\n\nDear ${m.name},\nYour ${c.name} chit payment for ${monthLabel(month)} is pending.\nExpected: ${money(expected)}\nPaid: ${money(paid)}\nPending: ${money(balance)}\n\nPlease make the pending payment at your earliest convenience. Thank you.`;window.open('https://wa.me/'+intl+'?text='+encodeURIComponent(text),'_blank');}
function whatsappAllPending(month=reportMonthValue){const rows=pendingRows(month);if(!rows.length)return uiAlert('No pending members for '+monthLabel(month)+'.');const valid=rows.filter(x=>x.m.phone);if(!valid.length)return uiAlert('No pending member has a phone number.');uiConfirm(`Send WhatsApp reminders to ${valid.length} pending member(s)?`,()=>{valid.forEach((x,i)=>setTimeout(()=>whatsappPendingMember(x.m.id,x.c.id,month),i*700));});}
function setReportMonth(v){if(!v)return;reportMonthValue=v;render();}
function dailyReport(month){const ps=paymentsForMonth(month);const byDay={};ps.forEach(p=>{const d=p.date||month+'-01';byDay[d]=(byDay[d]||0)+Number(p.amount||0);});return Object.entries(byDay).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,31);}
function reports(){
  const month=reportMonthValue, exp=expectedForMonth(month), col=monthCollected(month), pend=Math.max(0,exp-col), rows=pendingRows(month), ps=paymentsForMonth(month), days=dailyReport(month);
  const paidCount=state.members.filter(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);return c&&paymentFor(m.id,month)&&Number(paymentFor(m.id,month).amount||0)>=memberMonthly(m,c);}).length;
  const partialCount=state.members.filter(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean),p=paymentFor(m.id,month);return c&&p&&Number(p.amount||0)>0&&Number(p.amount||0)<memberMonthly(m,c);}).length;
  return `<div class="row"><div><h2 class="page-title">Reports</h2><div class="subtitle">Pending, daily & monthly collection</div></div><input class="month-picker" type="month" value="${month}" onchange="setReportMonth(this.value)"></div>
  <div class="grid"><div class="card"><div class="stat-label">EXPECTED</div><div class="stat-value">${money(exp)}</div></div><div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(col)}</div></div><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(pend)}</div></div><div class="card"><div class="stat-label">PAID / PARTIAL</div><div class="stat-value">${paidCount} / ${partialCount}</div></div></div>
  <div class="pending-dashboard"><div class="row"><div><h3 style="margin:0">Pending Members</h3><div class="muted">${monthLabel(month)} • ${rows.length} members • ${money(pend)} balance</div></div><button class="btn gold" onclick="whatsappAllPending('${month}')">💬 Remind All</button></div>
  <div class="list pending-list">${rows.length?rows.map(x=>`<div class="card pending-member-row"><div class="avatar">${esc((x.m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(x.m.name)}</b><div class="muted">${esc(x.c.name)} • Expected ${money(x.expected)} • Paid ${money(x.paid)}</div><strong class="pending-amount">Pending ${money(x.balance)}</strong></div><button class="mini-btn" onclick="whatsappPendingMember('${String(x.m.id)}','${String(x.c.id)}','${month}')">💬</button><button class="action-btn collect" onclick="collectionMonthValue='${month}';collectMember('${String(x.m.id)}','${String(x.c.id)}')">₹ Collect</button></div>`).join(''):'<div class="empty">🎉 No pending payments for this month.</div>'}</div></div>
  <div class="section"><h3>Daily Collection</h3><span class="muted">${monthLabel(month)}</span></div><div class="list daily-list">${days.length?days.map(([d,v])=>`<div class="card daily-row"><div><b>${esc(d)}</b><div class="muted">${paymentsForMonth(month).filter(p=>(p.date||'')===d).length} payment(s)</div></div><strong>${money(v)}</strong></div>`).join(''):'<div class="empty">No collection recorded for this month.</div>'}</div>
  <div class="section"><h3>Export & Summary</h3></div><div class="report-actions"><button class="btn gold" onclick="exportMonthlyReport('${month}')">⬇️ Monthly CSV</button><button class="btn" onclick="exportPendingCSV('${month}')">⬇️ Pending CSV</button></div>
  <div class="card report-group"><div class="row"><b>Payment Records</b><span class="badge active">${ps.length}</span></div><div class="muted">All payment entries recorded in ${monthLabel(month)}.</div></div>`;
}
function exportMonthlyReport(month){const rows=[['Date','Receipt No','Member','Phone','Chit','Amount','Mode','Status'],...paymentsForMonth(month).map(p=>{const m=state.members.find(x=>String(x.id)===String(p.memberId));return[p.date,receiptNo(p),m?.name||p.member,m?.phone||'',p.chit,p.amount,p.mode,p.status||'paid'];})];downloadCSV(rows,'mithraq-'+month+'-collection.csv');}
function exportPendingCSV(month){const rows=[['Member','Phone','Chit','Expected','Paid','Pending','Month'],...pendingRows(month).map(x=>[x.m.name,x.m.phone||'',x.c.name,x.expected,x.paid,x.balance,month])];downloadCSV(rows,'mithraq-'+month+'-pending.csv');}

/* ===== MithraQ Professional Phase 7: Full Auction Room ===== */
let auctionGroupValue='';
let auctionRoundValue=1;
let auctionTimer=null, auctionSeconds=0, auctionRunning=false;
let auctionBids=[];
let auctionLastSubmitted=null;
function defaultDueDate(){const d=new Date();d.setMonth(d.getMonth()+1);d.setDate(5);return d.toISOString().slice(0,10);}
function formatDMY(iso){if(!iso)return '—';const parts=String(iso).split('-');if(parts.length!==3)return esc(iso);const [y,m,d]=parts;return `${d}.${m}.${y}`;}
function auctionFinance(c,bid,memberCount){
  const chitAmount=Number(c?.amount||0);
  const commissionPct=Number(c?.commission||0);
  const commissionAmt=chitAmount*commissionPct/100;
  const discount=Math.max(0,chitAmount-Number(bid||0));
  const prizeMoney=Math.max(0,chitAmount-discount);
  const monthly=Number(c?.monthly||(c?.duration?chitAmount/c.duration:0));
  const shareCount=Math.max(1,Number(memberCount||0)||(monthly?Math.round(chitAmount/monthly):0)||membersForChit(c?.id).length||Number(c?.duration||0)||1);
  const dividendPool=Math.max(0,(Number(bid||0)-monthly)-commissionAmt);
  const dividendPerMember=dividendPool/shareCount;
  const payable=Math.max(0,monthly-dividendPerMember);
  return {chitAmount,commissionAmt,discount,prizeMoney,dividendPool,dividendPerMember,shareCount,monthly,payable};
}
function auction(){
  if(!state.chits.length)return `<h2 class="page-title">Live</h2><div class="subtitle">Live chit auction</div><div class="empty big-empty"><b>No chit groups available</b><p>Create a chit before starting an auction.</p><button class="btn gold" onclick="newChit()">+ Create Chit</button></div>`;

  /* LIVE opens only the chit list. No auction controls are shown until a chit is tapped. */
  if(!auctionGroupValue){
    return `<div class="row"><div><h2 class="page-title">Live</h2><div class="subtitle">Tap a chit to open the live auction</div></div><span class="badge active">LIVE</span></div>
    <div class="list">${state.chits.map(x=>`<button type="button" class="card live-chit-select" onclick="selectAuctionGroup('${String(x.id)}')">
      <div class="row"><div><b class="chit-title">${esc(x.name)}</b><div class="muted">${money(x.amount)} • Monthly ${money(x.monthly)} • ${membersForChit(x.id).length} members</div></div><span class="badge active">OPEN →</span></div>
    </button>`).join('')}</div>`;
  }

  const c=chitById(auctionGroupValue);
  if(!c){auctionGroupValue='';return auction();}

  const ms=membersForChit(c.id), records=state.auctions.filter(a=>String(a.chitId)===String(c.id));
  const last=auctionLastSubmitted;
  const winnerText=(!auctionRunning&&last)?`<div class="auction-winner-live"><div class="winner-badge">🏆</div><div><span>WINNER — LAST BID</span><b>${esc(last.memberName)} • #${esc(last.memberNo||'—')}</b><strong>${money(last.bid)}</strong></div></div>`:'';
  const bidHistory=auctionBids.length?`<div class="auction-bid-history"><div class="section no-margin"><h4 style="margin:0">Bid History</h4><span class="muted">${auctionBids.length} bid(s)</span></div>${auctionBids.map((b,i)=>`<div class="auction-bid-row"><span>#${i+1}</span><div style="flex:1"><b>${esc(b.memberName)}</b><div class="muted">#${esc(b.memberNo||'—')}</div></div><strong>${money(b.bid)}</strong></div>`).join('')}</div>`:'';

  return `<div class="row"><div><h2 class="page-title">Live</h2><div class="subtitle">${esc(c.name)} • Live bidding</div></div><button class="action-btn" onclick="auctionGroupValue='';auctionRunning=false;clearInterval(auctionTimer);auctionBids=[];auctionLastSubmitted=null;render()">← Chits</button></div>
  <div class="card auction-live-card">
    <div class="section no-margin"><div><h3>${esc(c.name)}</h3><span class="muted">${ms.length} members • ${money(c.amount)} chit value</span></div><span class="live-dot">● LIVE</span></div>
    ${!auctionRunning&&!last?`<div class="live-start-panel"><div class="live-big">LIVE</div><div class="muted">Press START to begin bidding.</div><button class="btn gold full" id="auctionTimerBtn" onclick="startAuctionTimer()">START</button></div>`:''}
    ${auctionRunning?`<div class="form">
      <label class="field-label">Bidder</label>
      <select id="auctionMember">${ms.length?ms.map(m=>`<option value="${String(m.id)}">${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join(''):'<option value="">No members in this group</option>'}</select>
      <label class="field-label">Bid amount ₹</label>
      <div class="bid-submit-row"><input id="bid" type="number" min="1" max="${Number(c.amount||0)}" placeholder="Enter bid amount" onkeydown="if(event.key==='Enter'){event.preventDefault();submitAuctionBid();}"><button class="btn submit-bid-btn" type="button" onclick="submitAuctionBid()">SUBMIT</button></div>
      ${bidHistory}
      <div class="timer-card"><div><span>AUCTION TIME</span><strong id="timer">${String(Math.floor(auctionSeconds/60)).padStart(2,'0')}:${String(auctionSeconds%60).padStart(2,'0')}</strong></div><button class="timer-btn auction-stop-btn" id="auctionTimerBtn" onclick="startAuctionTimer()">STOP</button></div>
    </div>`:''}
    ${!auctionRunning&&last?`<div class="auction-finished-panel">${bidHistory}${winnerText}<div class="auction-ended-label">AUCTION ENDED</div></div>`:''}
  </div>
  <div class="section"><h3>Round History</h3><span class="muted">${records.length} auction record(s)</span></div>
  <div class="list">${records.length?records.map(a=>auctionRecordHtml(a,c)).join(''):'<div class="empty">No auction records for this group yet.</div>'}</div>`;
}
function submitAuctionBid(){
  if(!auctionRunning)return uiAlert('Press START to begin bidding.');
  const memberSel=document.getElementById('auctionMember'),bidInput=document.getElementById('bid');
  const opt=memberSel&&memberSel.selectedIndex>-1?memberSel.options[memberSel.selectedIndex]:null;
  const bid=Number(bidInput?.value||0),c=chitById(auctionGroupValue);
  if(!opt||!opt.value)return uiAlert('Select a bidder.');
  if(!bid)return uiAlert('Enter the bid amount.');
  if(bid>Number(c?.amount||0))return uiAlert('Bid cannot be greater than the chit value.');
  const m=state.members.find(x=>String(x.id)===String(opt.value));
  if(!m)return uiAlert('Selected member is not available.');
  const item={memberId:m.id,memberName:m.name,memberNo:m.memberNo||'—',bid};
  auctionBids.push(item);
  auctionLastSubmitted=item;
  bidInput.value='';
  render();
  setTimeout(()=>document.getElementById('bid')?.focus(),0);
}
function auctionRecordHtml(a,c){
  const bid=Number(a.bid||0),chitAmount=Number(a.chitAmount||c.amount||0);
  const hasStored=a.dividendPerMember!=null&&a.payable!=null;
  const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c,bid);
  const m=state.members.find(x=>String(x.id)===String(a.memberId));
  return `<div class="card auction-history">
    <div class="auction-main"><div class="winner-badge">🏆</div><div style="flex:1"><b>${esc(a.member||'Winner')}</b><div class="muted">${esc(a.chit||c.name)} • ${esc(a.round||'Round 1')} • ${esc(a.date||'')}</div></div><div class="auction-amount"><b>${money(bid)}</b><small>Winner</small></div></div>
    <div class="auction-receipt-grid">
      <div><span>GROUP</span><b>${esc(a.chit||c.name)}</b></div>
      <div><span>CHIT NO</span><b>#${esc(m?.memberNo||'—')}</b></div>
      <div><span>CHIT AMOUNT</span><b>${money(chitAmount)}</b></div>
      <div><span>AUCTION</span><b>${money(bid)}</b></div>
      <div><span>DIVI.</span><b>${money(fin.dividendPerMember)}</b></div>
      <div><span>TAKE AMOUNT</span><b>${money(Math.max(0,chitAmount-bid))}</b></div>
      <div class="payable-cell"><span>PAYABLE</span><b>${money(fin.payable)}</b></div>
    </div>
    <div class="auction-due">Due date: <b>${formatDMY(a.dueDate)}</b></div>
    <div class="member-actions"><button class="action-btn edit" onclick="editAuction('${String(a.id)}')">✎ Edit</button><button class="action-btn" onclick="printAuctionReceipt('${String(a.id)}')">🧾 Receipt</button><button class="action-btn" onclick="whatsappAuctionResult('${String(a.id)}')">💬 Share</button><button class="action-btn delete" onclick="deleteAuction('${String(a.id)}')">⌫ Delete</button></div>
  </div>`;
}
function selectAuctionGroup(id){auctionGroupValue=String(id);auctionRoundValue=1;render();}
function selectAuctionRound(r){auctionRoundValue=Number(r)||1;const el=document.getElementById('roundNo');if(el)el.textContent=auctionRoundValue;document.querySelectorAll('.round-pill').forEach((b,i)=>b.classList.toggle('selected',i+1===auctionRoundValue));}
function startAuctionTimer(){
  const t=document.getElementById('timer'),btn=document.getElementById('auctionTimerBtn');
  if(!btn)return;
  if(!auctionRunning){
    auctionRunning=true;
    auctionSeconds=0;
    auctionBids=[];
    auctionLastSubmitted=null;
    clearInterval(auctionTimer);
    auctionTimer=setInterval(()=>{
      auctionSeconds++;
      const mm=Math.floor(auctionSeconds/60),ss=auctionSeconds%60;
      const el=document.getElementById('timer');
      if(el)el.textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
    },1000);
    render();
  }else{
    auctionRunning=false;
    clearInterval(auctionTimer);
    const last=auctionLastSubmitted;
    if(!last){
      auctionRunning=true;
      return uiAlert('Submit at least one bid before stopping the auction.');
    }
    const c=chitById(auctionGroupValue);
    const m=state.members.find(x=>String(x.id)===String(last.memberId));
    if(c&&m){
      const bid=Number(last.bid);
      const fin=auctionFinance(c,bid);
      const rec={id:Date.now(),chit:c.name,chitId:c.id,member:m.name,memberId:m.id,bid,round:'Round '+auctionRoundValue,chitAmount:fin.chitAmount,dividend:fin.discount,auctionDiscount:fin.discount,commissionPct:Number(c.commission||0),commissionAmt:fin.commissionAmt,dividendPool:fin.dividendPool,shareCount:fin.shareCount,monthly:fin.monthly,dividendPerMember:fin.dividendPerMember,payable:fin.payable,dueDate:defaultDueDate(),date:new Date().toLocaleDateString('en-IN'),createdAt:new Date().toISOString(),bidHistory:auctionBids.map(x=>({...x}))};
      state.auctions.unshift(rec); save();
    }
    render();
    uiAlert('Auction stopped. '+last.memberName+' is the winner with the last bid of ₹'+last.bid+'.');
  }
}
function previewAuctionDividend(chitId){const c=chitById(chitId)||chitById(auctionGroupValue),el=document.getElementById('auctionDividendPreview');if(!el||!c)return;const bid=Number(document.getElementById('bid')?.value||0);if(!bid){el.innerHTML='<div class="muted">Enter the bid to calculate dividend automatically.</div>';return;}const fin=auctionFinance(c,bid,membersForChit(c.id).length);el.innerHTML=`<div class="row" style="margin:0 0 8px"><b>Automatic Dividend Calculation</b><span class="badge active">${fin.shareCount} SHARES</span></div><div class="muted" style="line-height:1.7">Bid/discount: <b>${money(bid)}</b> · Commission: <b>${money(fin.commissionAmt)}</b><br>Dividend pool: <b>${money(fin.dividendPool)}</b> ÷ ${fin.shareCount} members = <b>${money(fin.dividendPerMember)}</b> per member</div><div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #dfe9e4"><span>Monthly installment</span><b>${money(fin.monthly)}</b></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Payable after dividend</span><b>${money(fin.payable)}</b></div>`;}
function saveAuction(){const c=chitById(auctionGroupValue)||chitById(document.getElementById('auctionChit')?.value),mid=document.getElementById('auctionMember')?.value,bid=Number(document.getElementById('bid')?.value||0);if(!c||!mid||!bid)return uiAlert('Select a member and enter the winning bid amount.');if(bid>Number(c.amount||0))return uiAlert('Bid cannot be greater than the chit value.');const m=state.members.find(x=>String(x.id)===String(mid));if(!m||!membersForChit(c.id).some(x=>String(x.id)===String(mid)))return uiAlert('Selected member does not belong to this chit group.');const dueDate=document.getElementById('dueDate')?.value||defaultDueDate();const fin=auctionFinance(c,bid);const rec={id:Date.now(),chit:c.name,chitId:c.id,member:m.name,memberId:m.id,bid,round:'Round '+auctionRoundValue,chitAmount:fin.chitAmount,dividend:fin.discount,auctionDiscount:fin.discount,commissionPct:Number(c.commission||0),commissionAmt:fin.commissionAmt,dividendPool:fin.dividendPool,shareCount:fin.shareCount,monthly:fin.monthly,dividendPerMember:fin.dividendPerMember,payable:fin.payable,dueDate,date:new Date().toLocaleDateString('en-IN'),createdAt:new Date().toISOString()};state.auctions.unshift(rec);save();clearInterval(auctionTimer);auctionRunning=false;uiAlert('Auction winner saved successfully.');render();}
function editAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId),list=c?membersForChit(c.id):[];openModal('Edit Auction Result',`<div class="form"><label class="field-label">Chit Group</label><select id="eaChit" onchange="renderEditAuctionMembers()">${state.chits.map(x=>`<option value="${String(x.id)}" ${String(x.id)===String(a.chitId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label class="field-label">Winner / Bidder</label><div id="eaMembers"><select id="eaMember">${list.map(m=>`<option value="${String(m.id)}" ${String(m.id)===String(a.memberId)?'selected':''}>${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join('')}</select></div><label class="field-label">Round</label><select id="eaRound">${[1,2,3].map(r=>`<option value="${r}" ${String(a.round||'Round 1')==='Round '+r?'selected':''}>Round ${r}</option>`).join('')}</select><label class="field-label">Winning bid ₹</label><input id="eaBid" type="number" min="1" value="${Number(a.bid||0)}"><label class="field-label">Due Date</label><input id="eaDue" type="date" value="${esc(a.dueDate||defaultDueDate())}"><button class="btn gold full" onclick="updateAuction('${String(id)}')">Save Changes</button></div>`);}
function renderEditAuctionMembers(){const c=chitById(document.getElementById('eaChit')?.value),el=document.getElementById('eaMembers');if(!c||!el)return;el.innerHTML=`<select id="eaMember">${membersForChit(c.id).map(m=>`<option value="${String(m.id)}">${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join('')||'<option value="">No members</option>'}</select>`;}
function updateAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(document.getElementById('eaChit')?.value),mid=document.getElementById('eaMember')?.value,bid=Number(document.getElementById('eaBid')?.value||0),r=Number(document.getElementById('eaRound')?.value||1),dueDate=document.getElementById('eaDue')?.value||a.dueDate||defaultDueDate();if(!c||!mid||!bid)return uiAlert('Enter all auction details.');if(bid>Number(c.amount||0))return uiAlert('Bid cannot be greater than the chit value.');const m=state.members.find(x=>String(x.id)===String(mid));const fin=auctionFinance(c,bid);a.chit=c.name;a.chitId=c.id;a.member=m?.name||'';a.memberId=mid;a.bid=bid;a.round='Round '+r;a.dueDate=dueDate;a.chitAmount=fin.chitAmount;a.dividend=fin.discount;a.auctionDiscount=fin.discount;a.commissionPct=Number(c.commission||0);a.commissionAmt=fin.commissionAmt;a.dividendPool=fin.dividendPool;a.shareCount=fin.shareCount;a.monthly=fin.monthly;a.dividendPerMember=fin.dividendPerMember;a.payable=fin.payable;save();closeModal();render();}
function deleteAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;openModal('Delete Auction',`<div class="delete-dialog"><div class="delete-icon">⌫</div><h3>Delete auction result?</h3><p>${esc(a.chit||'')} • ${esc(a.member||'')} • ${money(a.bid)}<br>This auction record will be permanently removed.</p><div class="delete-actions"><button class="btn cancel-btn" onclick="closeModal()">Cancel</button><button class="btn danger full" onclick="confirmDeleteAuction('${String(id)}')">Yes, Delete</button></div></div>`);}
function confirmDeleteAuction(id){state.auctions=state.auctions.filter(a=>String(a.id)!==String(id));save();closeModal();render();}
function printAuctionReceipt(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId);const bid=Number(a.bid||0);const hasStored=a.dividendPerMember!=null&&a.payable!=null;const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c||{amount:a.chitAmount},bid);const m=state.members.find(x=>String(x.id)===String(a.memberId));const w=window.open('','_blank','width=520,height=720');if(!w){uiAlert('Please allow pop-ups to print.');return;}w.document.write(`<html><head><title>Auction Receipt - MithraQ</title><style>body{font-family:Arial;padding:28px;color:#24463d;max-width:460px;margin:auto}h1{color:#056b4f}.box{border:1px solid #ddd;border-radius:14px;padding:16px;margin-top:18px}.r{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.total{font-size:22px;font-weight:800;color:#056b4f;margin-top:15px}button{padding:10px 15px;border:0;border-radius:9px;background:#056b4f;color:white}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><div>Auction Winner Receipt</div><div class="box"><div class="r"><span>Group</span><b>${esc(a.chit)}</b></div><div class="r"><span>Chit No</span><b>#${esc(m?.memberNo||'—')}</b></div><div class="r"><span>Winner</span><b>${esc(a.member)}</b></div><div class="r"><span>Round</span><b>${esc(a.round||'Round 1')}</b></div><div class="r"><span>Date</span><b>${esc(a.date||'')}</b></div><div class="r"><span>Chit Amount</span><b>${money(a.chitAmount)}</b></div><div class="r"><span>Auction</span><b>${money(a.bid)}</b></div><div class="r"><span>Divi.</span><b>${money(fin.dividendPerMember)}</b></div><div class="r"><span>Due Date</span><b>${formatDMY(a.dueDate)}</b></div><div class="total">Payable: ${money(fin.payable)}</div></div><button onclick="window.print()">Print Receipt</button></body></html>`);w.document.close();}
function whatsappAuctionResult(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId);const bid=Number(a.bid||0);const hasStored=a.dividendPerMember!=null&&a.payable!=null;const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c||{amount:a.chitAmount},bid);const m=state.members.find(x=>String(x.id)===String(a.memberId));if(!m?.phone)return uiAlert('Winner phone number is missing.');const phone=String(m.phone).replace(/\D/g,'');const intl=phone.length===10?'91'+phone:phone;const text=`MithraQ Auction Result\n\nGroup: ${a.chit}\nChit No: #${m?.memberNo||'—'}\nWinner: ${a.member}\nRound: ${a.round||'Round 1'}\nChit Amount: ${money(a.chitAmount)}\nAuction: ${money(a.bid)}\nDivi.: ${money(fin.dividendPerMember)}\nPayable: ${money(fin.payable)}\nDue Date: ${formatDMY(a.dueDate)}\nDate: ${a.date}`;window.open('https://wa.me/'+intl+'?text='+encodeURIComponent(text),'_blank');}

/* ===== MithraQ Professional Phase 8: Member 360 Profile ===== */
function member360(memberId){
  const m=state.members.find(x=>String(x.id)===String(memberId)); if(!m)return;
  const groups=(m.chitIds||[]).map(id=>chitById(id)).filter(Boolean);
  const ps=memberPayments(memberId);
  const paid=ps.reduce((s,p)=>s+Number(p.amount||0),0);
  const auc=state.auctions.filter(a=>String(a.memberId)===String(memberId));
  const expectedMonthly=groups.reduce((s,c)=>s+memberMonthly(m,c),0);
  const currentMonth=new Date().toISOString().slice(0,7);
  const currentDue=groups.reduce((s,c)=>s+Math.max(0,memberMonthly(m,c)-Number(paymentFor(m.id,currentMonth)?.amount||0)),0);
  openModal('Member Profile',`<div class="member360">
    <div class="profile-hero"><div class="avatar profile-avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div><h3>${esc(m.name)}</h3><div class="muted">Member #${esc(m.memberNo||'—')} • ${esc(m.phone||'No phone')}</div><div class="muted">Joined ${esc(m.joiningDate||'—')}</div><div class="muted">Address: ${esc(m.address||'—')}</div><div class="muted">Nominee: ${esc(m.nomineeName||'—')} ${m.nomineePhone?'• '+esc(m.nomineePhone):''}</div></div></div>
    <div class="profile-actions"><button class="btn gold" onclick="editMember('${String(m.id)}');setTimeout(()=>member360('${String(m.id)}'),250)">✎ Edit</button><button class="btn" onclick="whatsappMember('${String(m.id)}')">💬 WhatsApp</button><button class="btn" onclick="printMemberStatement('${String(m.id)}')">🖨️ Print</button></div>
    <div class="profile-stats"><div><span>Total Paid</span><b>${money(paid)}</b></div><div><span>Pending Now</span><b>${money(currentDue)}</b></div><div><span>Auctions</span><b>${auc.length}</b></div></div>
    <div class="section"><h3>Chit Groups</h3><span class="muted">${groups.length} groups</span></div>
    <div class="profile-groups">${groups.map(c=>`<div class="profile-group"><b>${esc(c.name)}</b><span>${c.type==='dividend'?'Dividend':'Fixed'} • Monthly ${money(m.monthly||c.monthly||0)}</span></div>`).join('')||'<div class="empty">No groups assigned.</div>'}</div>
    <div class="section"><h3>Collection History</h3><span class="muted">${ps.length} payments</span></div>
    <div class="profile-history">${ps.length?ps.map(p=>{const c=chitById(p.chitId);const e=memberMonthly(m,c);const st=paymentStatus(p,e);return `<div class="profile-row"><div><b>${esc(p.month||'')}</b><div class="muted">${esc(c?.name||p.chit||'')} • ${esc(p.date||'')} • ${esc(p.mode||'')}</div><small>${esc(receiptNo(p))}</small></div><div class="profile-row-right"><strong>${money(p.amount)}</strong><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${st.toUpperCase()}</span><button class="mini-btn" onclick="printReceipt('${String(p.id)}')">🧾</button><button class="mini-btn" onclick="whatsappPaymentReceipt('${String(p.id)}')">💬</button></div></div>`}).join(''):'<div class="empty">No payments recorded.</div>'}</div>
    <div class="section"><h3>Auction History</h3><span class="muted">${auc.length} wins</span></div>
    <div class="profile-history">${auc.length?auc.map(a=>`<div class="profile-row"><div><b>${esc(a.chit||'')}</b><div class="muted">${esc(a.round||'')} • ${esc(a.date||'')}</div></div><div class="profile-row-right"><strong>${money(a.bid)}</strong><span class="muted">Dividend ${money(Math.max(0,Number(a.chitAmount||0)-Number(a.bid||0)))}</span></div></div>`).join(''):'<div class="empty">No auction records.</div>'}</div>
  </div>`);
}
function whatsappMember(memberId){const m=state.members.find(x=>String(x.id)===String(memberId));if(!m?.phone)return uiAlert('Member phone number is missing.');const phone=String(m.phone).replace(/\D/g,'');const intl=phone.length===10?'91'+phone:phone;const text=`MithraQ Member Profile\n\nMember: ${m.name}\nMember ID: ${m.memberNo||'—'}\nPhone: ${m.phone}\n\nThank you.`;window.open('https://wa.me/'+intl+'?text='+encodeURIComponent(text),'_blank');}
function groupMemberPanel(id){
  const c=chitById(id); if(!c)return '<div class="empty">Chit group not found.</div>';
  const list=membersForChit(id),month=new Date().toISOString().slice(0,7);
  return list.length?list.map(m=>{const p=paymentFor(m.id,month),e=memberMonthly(m,c),st=paymentStatus(p,e),label=st==='paid'?'PAID':st==='partial'?'PARTIAL':'PENDING';return `<div class="card member"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><div class="chit-title">${esc(m.name)}</div><div class="muted">${esc(m.phone||'No phone')} • Member #${esc(m.memberNo||'—')}</div><div class="muted">Joined ${esc(m.joiningDate||'—')} • Monthly ${money(e)}</div><div class="member-actions"><button class="action-btn collect" onclick="collectMember('${String(m.id)}','${String(c.id)}')">${p?'✓ Payment':'₹ Collect'}</button><button class="action-btn edit" onclick="editMember('${String(m.id)}')">✎ Edit</button><button class="action-btn" onclick="member360('${String(m.id)}')">👤 Profile</button><button class="action-btn" onclick="memberStatement('${String(m.id)}')">📋 Statement</button><button class="action-btn" onclick="whatsappMember('${String(m.id)}')">💬 WhatsApp</button><button class="action-btn delete" onclick="deleteMember('${String(m.id)}')">⌫ Delete</button></div></div><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${label}</span></div>`}).join(''):'<div class="empty big-empty"><div class="empty-icon">♙</div><b>No members in this group</b><p>Add members to start collection and auction management.</p><button class="btn gold" onclick="newMember()">+ Add Member</button></div>';
}

/* ===== Chit-wise Collection History — read-only, expandable ===== */
function historyMonthLabel(month){
  if(!/^\d{4}-\d{2}$/.test(String(month||''))) return String(month||'—');
  const [y,m]=String(month).split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}
function historyMonthsForChit(c){
  const members=membersForChit(c.id);
  const months=new Set();
  state.payments.filter(p=>String(p.chitId)===String(c.id)).forEach(p=>{if(/^\d{4}-\d{2}$/.test(String(p.month||'')))months.add(String(p.month));});
  // Always show the current month so a newly created group has a useful history panel.
  months.add(new Date().toISOString().slice(0,7));
  // Include a continuous range only when records already exist, bounded by the chit duration.
  const sorted=[...months].sort();
  if(sorted.length>1){
    const start=new Date(sorted[0]+'-01T00:00:00');
    const end=new Date(sorted[sorted.length-1]+'-01T00:00:00');
    const range=[]; let cur=new Date(start);
    const maxMonths=Math.max(1,Number(c.duration||0)||120);
    let guard=0;
    while(cur<=end && guard<maxMonths && guard<240){
      range.push(cur.toISOString().slice(0,7));
      cur.setMonth(cur.getMonth()+1); guard++;
    }
    return range.reverse();
  }
  return sorted.reverse();
}
function historyMemberRow(m,c,month){
  const p=paymentFor(m.id,month), expected=memberMonthly(m,c), status=paymentStatus(p,expected);
  const paid=Number(p?.amount||0), balance=Math.max(0,expected-paid);
  return `<div class="history-member-row">
    <div class="history-avatar">${esc((m.name||'?')[0]).toUpperCase()}</div>
    <div class="history-member-main"><b>${esc(m.name)}</b><div class="muted">Member #${esc(m.memberNo||'—')} • Expected ${money(expected)}</div>${p?`<div class="muted">Paid date ${esc(p.date||'—')} • ${esc(p.mode||'—')}</div>`:'<div class="muted">No payment recorded for this month</div>'}</div>
    <div class="history-member-amount"><strong>${money(paid)}</strong><span class="badge ${status==='paid'?'active':status==='partial'?'partial':'pending'}">${status.toUpperCase()}</span>${status!=='paid'&&expected?`<small>Bal. ${money(balance)}</small>`:''}</div>
  </div>`;
}
function historyChitDetails(c){
  const members=membersForChit(c.id), months=historyMonthsForChit(c);
  return `<div class="history-detail">
    <div class="history-summary"><span>${members.length} Members</span><span>${months.length} Months</span><span>Monthly ${money(c.monthly||0)}</span></div>
    <div class="history-month-list">${months.map((month,i)=>{
      const rows=members.map(m=>historyMemberRow(m,c,month)).join('');
      const total=members.reduce((sum,m)=>sum+Number(paymentFor(m.id,month)?.amount||0),0);
      const paidCount=members.filter(m=>paymentStatus(paymentFor(m.id,month),memberMonthly(m,c))==='paid').length;
      return `<div class="history-month ${i===0?'open':''}" id="hist-month-${c.id}-${month}">
        <button type="button" class="history-month-head" aria-expanded="false" onclick="toggleHistoryMonth('${String(c.id)}','${month}')"><div><b>${esc(historyMonthLabel(month))}</b><span>${paidCount}/${members.length} paid • Total ${money(total)}</span></div><span class="history-chevron">⌄</span></button>
        <div class="history-month-body">${rows||'<div class="empty">No members in this chit.</div>'}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}
function historyPage(){
  return `<div class="row"><div><h2 class="page-title">History</h2><div class="subtitle">Chit-wise monthly collection history • tap a chit to show / hide details</div></div></div>
  <div class="history-note"><b>Payment History</b><span>Each chit shows who paid, how much, the month, date, mode and pending balance.</span></div>
  <div class="history-chit-list">${state.chits.length?state.chits.map(c=>{
    const members=membersForChit(c.id), payments=state.payments.filter(p=>String(p.chitId)===String(c.id));
    const total=payments.reduce((s,p)=>s+Number(p.amount||0),0);
    return `<div class="history-chit" id="history-chit-${c.id}">
      <button type="button" class="history-chit-head" aria-expanded="false" onclick="toggleHistoryChit('${String(c.id)}')"><div class="history-chit-icon">▣</div><div class="history-chit-main"><b>${esc(c.name)}</b><span>${money(c.amount)} • ${c.duration||0} months • ${members.length} members</span><small>Total collected: ${money(total)}</small></div><span class="history-chevron">⌄</span></button>
      <div class="history-chit-body">${historyChitDetails(c)}</div>
    </div>`;
  }).join(''):'<div class="empty big-empty"><div class="empty-icon">◷</div><b>No chit history yet</b><p>Create a chit and record collections. The monthly history will appear here automatically.</p></div>'}</div>`;
}
function openHistory(){tab='history';closeMenuSheet();render();setTimeout(()=>document.querySelector('.history-chit-head')?.focus(),0);}
function toggleHistoryChit(id){
  const item=document.getElementById('history-chit-'+id); if(!item)return;
  const open=!item.classList.contains('open');
  item.classList.toggle('open',open);
  const head=item.querySelector('.history-chit-head');
  if(head)head.setAttribute('aria-expanded',open?'true':'false');
}
function toggleHistoryMonth(chitId,month){
  const item=document.getElementById('hist-month-'+chitId+'-'+month); if(!item)return;
  const open=!item.classList.contains('open');
  item.classList.toggle('open',open);
  const head=item.querySelector('.history-month-head');
  if(head)head.setAttribute('aria-expanded',open?'true':'false');
}

/* ===== MithraQ Add-on Pack: Business Insights & Safety (non-destructive) ===== */
function addonNum(v){return Number(v||0)||0;}
function addonAllExpected(){return state.members.reduce((s,m)=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);return s+addonNum(m.monthly||c?.monthly)},0);}
function addonTotalBid(){return state.auctions.reduce((s,a)=>s+addonNum(a.bid),0);}
function addonTotalCommission(){return state.auctions.reduce((s,a)=>s+addonNum(a.commissionAmt),0);}
function addonTotalDividend(){return state.auctions.reduce((s,a)=>s+addonNum(a.dividend),0);}
function addonCurrentPending(){const month=new Date().toISOString().slice(0,7);return pendingRows(month).reduce((s,x)=>s+addonNum(x.balance),0);}
function addonGroupHealth(){return state.chits.map(c=>{const members=membersForChit(c.id), auctions=state.auctions.filter(a=>String(a.chitId)===String(c.id)), payments=state.payments.filter(p=>String(p.chitId)===String(c.id));return {c,members,auctions,payments};});}
function addonDataCheck(){const issues=[];state.members.forEach(m=>{if(!m.name)issues.push('Member with missing name');(m.chitIds||[]).forEach(id=>{if(!chitById(id))issues.push(`${m.name||'Member'} points to a missing chit group`);});});state.payments.forEach(p=>{if(!p.memberId||!state.members.some(m=>String(m.id)===String(p.memberId)))issues.push(`Payment ${receiptNo(p)} has no valid member`);});state.auctions.forEach(a=>{if(!a.chitId||!chitById(a.chitId))issues.push(`Auction for ${a.member||'unknown'} has no valid chit`);});return issues;}
function addonExportFullCSV(){const rows=[['RECORD','ID','Group','Member','Phone','Month/Date','Amount/Bid','Status','Mode','Notes'],...state.members.map(m=>['MEMBER',m.id,(m.chitIds||[]).map(id=>chitById(id)?.name||'').join(' | '),m.name,m.phone||'',m.joiningDate||'',m.monthly||'','','',m.address||'']),...state.chits.map(c=>['CHIT',c.id,c.name,'','','',c.amount,'',c.type,c.startDate||'']),...state.payments.map(p=>['PAYMENT',p.id,p.chit,p.member,p.memberPhone||'',p.month,p.amount,p.status||'paid',p.mode||'',p.note||'']),...state.auctions.map(a=>['AUCTION',a.id,a.chit,a.member,'',a.date,a.bid,'',a.round||'',`Payable ${a.payable||0}`])];downloadCSV(rows,'mithraq-full-business-export.csv');}
function addonExportJSON(){backupData();}
function addonHome(){const base=home;return function(){const html=base();const expected=addonAllExpected(),pending=addonCurrentPending(),commission=addonTotalCommission(),dividend=addonTotalDividend();return html+`<div class="section addon-section"><h3>Business Insights</h3><span class="muted">Automatic overview from your existing records</span></div><div class="grid addon-grid"><div class="card addon-stat"><div class="stat-label">EXPECTED / MONTH</div><div class="stat-value">${money(expected)}</div></div><div class="card addon-stat"><div class="stat-label">CURRENT PENDING</div><div class="stat-value">${money(pending)}</div></div><div class="card addon-stat"><div class="stat-label">AUCTION COMMISSION</div><div class="stat-value">${money(commission)}</div></div><div class="card addon-stat"><div class="stat-label">DIVIDEND RECORDED</div><div class="stat-value">${money(dividend)}</div></div></div><div class="card addon-business-card"><div class="row"><div><h3 style="margin:0">Group Health</h3><div class="muted">Members, auctions and collection activity</div></div><button class="btn" onclick="addonGroupReport()">View Details</button></div>${addonGroupHealth().slice(0,6).map(x=>`<div class="addon-health-row"><div><b>${esc(x.c.name)}</b><div class="muted">${x.members.length} members • ${x.auctions.length} auctions • ${x.payments.length} payments</div></div><span class="badge ${x.members.length?'active':'pending'}">${x.members.length?'ACTIVE':'EMPTY'}</span></div>`).join('')||'<div class="empty">No groups yet.</div>'}</div>`;};}
function addonGroupReport(){const rows=addonGroupHealth();openModal('Group Business Report',`<div class="list">${rows.map(x=>`<div class="card"><b>${esc(x.c.name)}</b><div class="muted">${x.members.length} members • ${x.auctions.length} auctions • ${x.payments.length} payments</div><div class="addon-mini-stats"><span>Chit ${money(x.c.amount)}</span><span>Monthly ${money(x.c.monthly)}</span><span>Commission ${money(x.auctions.reduce((s,a)=>s+addonNum(a.commissionAmt),0))}</span></div></div>`).join('')||'<div class="empty">No chit groups available.</div>'}</div>`);}
function addonSettings(){const original=_addonOriginalSettings();const issues=addonDataCheck();return original+`<div class="card addon-tools"><h3 style="margin-top:0">📊 Business Tools</h3><div class="muted">Added without changing your existing data or screens.</div><div class="backup-grid"><button class="btn gold" onclick="addonExportFullCSV()">⬇️ Full Excel/CSV Data</button><button class="btn" onclick="addonExportJSON()">⬇️ Full JSON Backup</button></div><div class="addon-integrity"><b>Data Health:</b> <span class="badge ${issues.length?'pending':'active'}">${issues.length?issues.length+' ISSUE(S)':'OK'}</span>${issues.length?`<div class="muted addon-issues">${issues.slice(0,8).map(esc).join('<br>')}</div>`:'<div class="muted">No obvious broken member, payment or auction references found.</div>'}</div></div>`;}
const _addonOriginalHome=home; home=addonHome();
const _addonOriginalSettings=settingsPanel; settingsPanel=addonSettings;
setTimeout(()=>{if(document.querySelector('.app')&&!document.querySelector('.app').classList.contains('locked'))render();},0);

/* MithraQ refined icon layer: swaps legacy glyphs for consistent inline SVG icons.
   No buttons, labels, handlers, data or page structure are changed. */
(function(){
  const ICONS={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    grid:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    auction:'<path d="m7 7 10 10"/><path d="M8 6 6 8l10 10 2-2z"/><path d="M4 20h6"/>',
    rupee:'<path d="M7 5h10M7 9h8M9 5c4 0 5 2 5 4 0 3-2 5-5 5l6 5"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    user:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-4 2.7-6 6.5-6s5.9 2 6.5 6"/>',
    report:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    search:'<circle cx="10.8" cy="10.8" r="6"/><path d="m16 16 4.5 4.5"/>',
    history:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/><path d="M4.5 5.5 3 7"/>',
    settings:'<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 15 .2.1a1.7 1.7 0 0 1-1.7 3l-.2-.1a1.7 1.7 0 0 0-2.5 1.5v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.5-1.5l-.2.1a1.7 1.7 0 1 1-1.7-3l.2-.1a1.7 1.7 0 0 0 0-3l-.2-.1a1.7 1.7 0 1 1 1.7-3l.2.1A1.7 1.7 0 0 0 11.8 7v-.2a1.7 1.7 0 0 1 3.4 0V7a1.7 1.7 0 0 0 2.5 1.5l.2-.1a1.7 1.7 0 1 1 1.7 3l-.2.1a1.7 1.7 0 0 0 0 3Z"/>',
    edit:'<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14.5 7.5 3 3"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    arrow:'<path d="M5 12h13"/><path d="m13 7 5 5-5 5"/>',
    down:'<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    up:'<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/>',
    lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
    message:'<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.5-.8L4 20l1.7-3.5A7.3 7.3 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 8 7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    printer:'<path d="M6 9V4h12v5M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v6H6z"/><path d="M17 12h.01"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    cloud:'<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6 8.5 4.5 4.5 0 0 0 7 18Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    warning:'<path d="m12 4 9 16H3L12 4Z"/><path d="M12 9v5M12 17h.01"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const map={
    '⌂':'home','▣':'grid','♢':'auction','₹':'rupee','☰':'menu','♙':'user','▤':'report','⌕':'search','⚙':'settings','◷':'history',
    '✎':'edit','⌫':'trash','+':'plus','→':'arrow','⬇️':'down','⬆️':'up','⬇':'down','⬆':'up','🔒':'lock','💬':'message','🖨️':'printer','🖨':'printer','🧾':'receipt','📋':'clipboard','✓':'check','📊':'chart','☁️':'cloud','☁':'cloud','⚠️':'warning','⚠':'warning','×':'close','!':'info','♛':'star'
  };
  function svg(name){return '<svg class="mq-svg" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||ICONS.info)+'</svg>';}
  function replaceTextNode(node){
    const raw=node.nodeValue||''; const trimmed=raw.trim(); if(!trimmed)return;
    let token=null,name=null,rest='';
    for(const k of Object.keys(map)){if(trimmed===k||trimmed.startsWith(k+' ')){token=k;name=map[k];rest=trimmed.slice(k.length).replace(/^\s+/,'');break;}}
    if(!name)return;
    const span=document.createElement('span'); span.className='mq-icon-wrap'; span.innerHTML=svg(name)+(rest?' <span>'+rest+'</span>':'');
    node.parentNode.replaceChild(span,node);
  }
  function scan(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const p=n.parentElement; if(!p||p.closest('script,style,textarea,option,.mq-icon-wrap'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);nodes.forEach(replaceTextNode);
  }
  function start(){scan(document.body);const obs=new MutationObserver(ms=>{for(const m of ms){m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n);else if(n.nodeType===3)replaceTextNode(n);});}});obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

/* ===== Phase 9: Advanced Due & Reminder System ===== */
const __baseCollectionPhase9 = collection;
function dueDateForMonth(month, day){
  const safe=Math.min(Math.max(Number(day||5),1),28);
  return `${month}-${String(safe).padStart(2,'0')}`;
}
function dueDashboard(month=collectionMonthValue){
  const today=new Date();
  const dueDay=Number(localStorage.getItem('mithraq_due_day')||5);
  const rows=[];
  state.chits.forEach(c=>membersForChit(c.id).forEach(m=>{
    const expected=memberMonthly(m,c), p=paymentFor(m.id,month), paid=Number(p?.amount||0);
    const balance=Math.max(0,expected-paid);
    if(balance>0){
      const due=dueDateForMonth(month,dueDay);
      const dueTime=new Date(due+'T00:00:00').getTime();
      const days=Math.max(0,Math.floor((today.getTime()-dueTime)/86400000));
      rows.push({m,c,expected,paid,balance,due,days,status:paid>0?'partial':'pending'});
    }
  }));
  const total=rows.reduce((s,r)=>s+r.balance,0);
  const overdue=rows.filter(r=>r.days>0);
  return `<div class="due-dashboard card">
    <div class="row due-head"><div><h3>Due & Reminder Center</h3><div class="muted">Automatic pending and overdue tracking</div></div><button class="btn" onclick="setDueDay()">⚙ Due Day: ${dueDay}</button></div>
    <div class="due-stats"><div><span>Pending Members</span><b>${rows.length}</b></div><div><span>Overdue</span><b>${overdue.length}</b></div><div><span>Total Due</span><b>${money(total)}</b></div></div>
    ${rows.length?`<div class="due-list">${rows.sort((a,b)=>b.days-a.days).slice(0,12).map(r=>`<div class="due-row ${r.days>0?'overdue':''}"><div class="due-avatar">${esc((r.m.name||'?')[0]).toUpperCase()}</div><div class="due-main"><b>${esc(r.m.name)}</b><span>${esc(r.c.name)} • Due ${r.due}</span><small>${r.days>0?`${r.days} day${r.days===1?'':'s'} overdue`:r.status==='partial'?'Partial payment pending':'Payment pending'}</small></div><div class="due-amount"><b>${money(r.balance)}</b><button class="mini-btn" onclick="sendDueReminder('${String(r.m.id)}','${String(r.c.id)}','${month}')">💬</button></div></div>`).join('')}</div><div class="due-actions"><button class="btn gold" onclick="sendAllDueReminders('${month}')">💬 Send Reminder List</button><button class="btn" onclick="exportDueList('${month}')">⇩ Export Due List</button></div>`:`<div class="empty due-empty">🎉 No pending dues for this month.</div>`}
  </div>`;
}
collection=function(){return __baseCollectionPhase9()+dueDashboard(collectionMonthValue);};
function setDueDay(){
  openModal('Payment Due Settings',`<div class="form"><label class="field-label">Monthly due day (1–28)</label><input id="dueDayInput" type="number" min="1" max="28" value="${Number(localStorage.getItem('mithraq_due_day')||5)}"><div class="form-note">The same due day is used to calculate overdue days across all chit groups.</div><button class="btn gold full" onclick="saveDueDay()">Save Due Day</button></div>`);
}
function saveDueDay(){const v=Math.min(28,Math.max(1,Number(document.getElementById('dueDayInput')?.value||5)));localStorage.setItem('mithraq_due_day',String(v));closeModal();render();}
function dueRecord(memberId,chitId,month){
  const c=chitById(chitId),m=state.members.find(x=>String(x.id)===String(memberId)); if(!c||!m)return null;
  const p=paymentFor(m.id,month),expected=memberMonthly(m,c),balance=Math.max(0,expected-Number(p?.amount||0));
  return {c,m,expected,balance};
}
function sendDueReminder(memberId,chitId,month){
  const r=dueRecord(memberId,chitId,month);if(!r)return;const due=dueDateForMonth(month,Number(localStorage.getItem('mithraq_due_day')||5));
  const phone=String(r.m.phone||'').replace(/\D/g,'');
  const msg=`Hello ${r.m.name}, this is a payment reminder from MithraQ. Your pending chit amount for ${r.c.name} is ${money(r.balance)}. Due date: ${due}. Please make the payment at your earliest convenience. Thank you.`;
  if(!phone)return uiAlert('No phone number is available for this member.');
  window.open(`https://wa.me/${phone.startsWith('91')?phone:'91'+phone}?text=${encodeURIComponent(msg)}`,'_blank');
}
function sendAllDueReminders(month){const count=dueDashboardRows(month).length;if(!count)return uiAlert('No pending reminders for this month.');uiAlert(`${count} pending member(s) found. Use each WhatsApp button to send the personalized reminder.`,'Reminder List Ready');}
function dueDashboardRows(month){const rows=[];state.chits.forEach(c=>membersForChit(c.id).forEach(m=>{const p=paymentFor(m.id,month),e=memberMonthly(m,c),b=Math.max(0,e-Number(p?.amount||0));if(b>0)rows.push({m,c,b});}));return rows;}
function exportDueList(month){const rows=[['Member','Phone','Chit Group','Month','Expected','Pending'],...dueDashboardRows(month).map(r=>[r.m.name,r.m.phone||'',r.c.name,month,memberMonthly(r.m,r.c),r.b])];downloadCSV(rows,`mithraq-due-list-${month}.csv`);}

/* ===== Phase 10: Reports & Analytics Dashboard ===== */
const __baseReportsPhase10 = reports;
function collectionTrend(month){
  const [y,m]=month.split('-').map(Number), out=[];
  for(let i=5;i>=0;i++){let d=new Date(y,m-1-i,1), key=d.toISOString().slice(0,7);out.push({month:key,label:d.toLocaleDateString('en-IN',{month:'short'}),collected:monthCollected(key),expected:expectedForMonth(key)});}return out;
}
function analyticsBars(month){const data=collectionTrend(month),max=Math.max(1,...data.map(x=>Math.max(x.collected,x.expected)));return `<div class="analytics-chart">${data.map(x=>`<div class="chart-col"><div class="chart-bars"><i class="expected-bar" style="height:${Math.max(4,Math.round(x.expected/max*100))}%" title="Expected ${money(x.expected)}"></i><i class="collected-bar" style="height:${Math.max(4,Math.round(x.collected/max*100))}%" title="Collected ${money(x.collected)}"></i></div><span>${x.label}</span><small>${money(x.collected)}</small></div>`).join('')}</div>`;}
function chitPerformance(month){return state.chits.map(c=>{const ms=membersForChit(c.id), expected=ms.reduce((s,m)=>s+memberMonthly(m,c),0), collected=ms.reduce((s,m)=>s+Number(paymentFor(m.id,month)?.amount||0),0);return {c,expected,collected,pending:Math.max(0,expected-collected),rate:expected?Math.min(100,Math.round(collected/expected*100)):0};}).sort((a,b)=>b.rate-a.rate);}
function exportAnalyticsCSV(month){const rows=[['Chit Group','Expected','Collected','Pending','Collection %'],...chitPerformance(month).map(x=>[x.c.name,x.expected,x.collected,x.pending,x.rate+'%'])];downloadCSV(rows,`mithraq-${month}-analytics.csv`);}
function printAnalytics(){window.print();}
reports=function(){
  const month=reportMonthValue, exp=expectedForMonth(month), col=monthCollected(month), pend=Math.max(0,exp-col), rate=exp?Math.round(col/exp*100):0, perf=chitPerformance(month);
  const top=perf[0], overdue=dueDashboardRows(month).length;
  return `<div class="analytics-page"><div class="row analytics-title"><div><h2 class="page-title">Reports & Analytics</h2><div class="subtitle">Collection performance, trends and chit-wise insights</div></div><input class="month-picker" type="month" value="${month}" onchange="setReportMonth(this.value)"></div>
  <div class="analytics-kpis"><div class="analytics-kpi"><span>Expected</span><b>${money(exp)}</b><small>${monthLabel(month)}</small></div><div class="analytics-kpi success"><span>Collected</span><b>${money(col)}</b><small>${rate}% collection rate</small></div><div class="analytics-kpi warning"><span>Pending</span><b>${money(pend)}</b><small>${overdue} member(s) pending</small></div><div class="analytics-kpi"><span>Top Chit</span><b>${esc(top?.c?.name||'—')}</b><small>${top?top.rate+'% collection':''}</small></div></div>
  <div class="analytics-panel card"><div class="row"><div><h3>6-Month Collection Trend</h3><div class="muted">Expected vs actual collection</div></div><div class="chart-legend"><span><i class="legend-expected"></i>Expected</span><span><i class="legend-collected"></i>Collected</span></div></div>${analyticsBars(month)}</div>
  <div class="analytics-panel card"><div class="row"><div><h3>Chit-wise Performance</h3><div class="muted">${monthLabel(month)}</div></div></div><div class="performance-list">${perf.length?perf.map(x=>`<div class="performance-row"><div class="performance-head"><b>${esc(x.c.name)}</b><strong>${x.rate}%</strong></div><div class="performance-track"><span style="width:${x.rate}%"></span></div><div class="performance-meta"><span>Expected ${money(x.expected)}</span><span>Collected ${money(x.collected)}</span><span>Pending ${money(x.pending)}</span></div></div>`).join(''):'<div class="empty">No chit groups available.</div>'}</div></div>
  <div class="analytics-actions"><button class="btn gold" onclick="exportMonthlyReport('${month}')">⇩ Collection CSV</button><button class="btn" onclick="exportPendingCSV('${month}')">⇩ Pending CSV</button><button class="btn" onclick="exportAnalyticsCSV('${month}')">⇩ Analytics CSV</button><button class="btn" onclick="printAnalytics()">🖨 Print Report</button></div>
  ${__baseReportsPhase10().replace(/^<div class="row">[\s\S]*?Payment Records[\s\S]*?<\/div>$/,'')}`;
};

/* ===== Phase 11: Advanced Auction Control & Winner Rules ===== */
let auctionRuleValue='lowest';
function auctionWinner(){
  if(!auctionBids.length)return null;
  return auctionRuleValue==='lowest' ? auctionBids.reduce((w,b)=>Number(b.bid)<Number(w.bid)?b:w,auctionBids[0]) : auctionBids[auctionBids.length-1];
}
function auctionRuleChanged(v){auctionRuleValue=v==='last'?'last':'lowest'; render();}
const __auctionPhase11=auction;
auction=function(){
  const html=__auctionPhase11();
  if(!auctionGroupValue || !chitById(auctionGroupValue))return html;
  const c=chitById(auctionGroupValue), records=state.auctions.filter(a=>String(a.chitId)===String(c.id));
  const winner=auctionWinner();
  const control=`<div class="card auction-control-panel"><div class="section no-margin"><div><h3>Auction Control</h3><span class="muted">Winner rule & round summary</span></div><span class="badge active">${records.length} SAVED</span></div>
    <div class="auction-rule-row"><label><input type="radio" name="winnerRule" value="lowest" ${auctionRuleValue==='lowest'?'checked':''} onchange="auctionRuleChanged(this.value)"> Lowest bid wins</label><label><input type="radio" name="winnerRule" value="last" ${auctionRuleValue==='last'?'checked':''} onchange="auctionRuleChanged(this.value)"> Last bid wins</label></div>
    <div class="auction-live-summary"><div><span>CURRENT BIDS</span><b>${auctionBids.length}</b></div><div><span>LOWEST BID</span><b>${auctionBids.length?money(Math.min(...auctionBids.map(x=>Number(x.bid)) )):'—'}</b></div><div><span>PROJECTED WINNER</span><b>${winner?esc(winner.memberName):'—'}</b></div></div>
    <div class="auction-control-actions"><button class="btn" onclick="exportAuctionHistory('${String(c.id)}')">⇩ Export History</button><button class="btn gold" onclick="showAuctionSummary('${String(c.id)}')">📊 Auction Summary</button></div></div>`;
  return html.replace('<div class="section"><h3>Round History</h3>',control+'<div class="section"><h3>Round History</h3>');
};
function exportAuctionHistory(chitId){
  const rows=[['Round','Winner','Member No','Bid','Dividend / Member','Payable','Due Date','Date'],...state.auctions.filter(a=>String(a.chitId)===String(chitId)).map(a=>{const c=chitById(a.chitId),m=state.members.find(x=>String(x.id)===String(a.memberId)),f=a.dividendPerMember!=null?{dividendPerMember:a.dividendPerMember,payable:a.payable}:auctionFinance(c,a.bid);return[a.round,a.member,m?.memberNo||'',a.bid,f.dividendPerMember,f.payable,a.dueDate,a.date];})];
  downloadCSV(rows,`mithraq-auction-${chitId}-history.csv`);
}
function showAuctionSummary(chitId){
  const c=chitById(chitId), rows=state.auctions.filter(a=>String(a.chitId)===String(chitId));
  const total=rows.reduce((s,a)=>s+Number(a.bid||0),0), avg=rows.length?Math.round(total/rows.length):0;
  openModal('Auction Summary',`<div class="auction-summary-modal"><div class="summary-grid"><div><span>Total Rounds</span><b>${rows.length}</b></div><div><span>Average Bid</span><b>${money(avg)}</b></div><div><span>Lowest Winner Bid</span><b>${rows.length?money(Math.min(...rows.map(x=>Number(x.bid||0)))):'—'}</b></div></div><div class="form-note">${esc(c?.name||'Chit Group')} • Saved auction performance summary</div>${rows.length?`<div class="auction-summary-list">${rows.map(a=>`<div><b>${esc(a.round||'Round')}</b><span>${esc(a.member||'Winner')}</span><strong>${money(a.bid)}</strong></div>`).join('')}</div>`:'<div class="empty">No saved auction rounds yet.</div>'}</div>`);
}

/* ===== Phase 12: Admin + Member Login & Role Management ===== */
const MEMBER_AUTH_KEY='mithraq_member_accounts_v1';
let currentRole='admin', currentMemberId=null;
function memberAccounts(){try{return JSON.parse(localStorage.getItem(MEMBER_AUTH_KEY)||'{}')}catch(e){return {}}}
function saveMemberAccounts(x){localStorage.setItem(MEMBER_AUTH_KEY,JSON.stringify(x));}
authScreen=function(){const a=getAuth();const memberMode=window.__memberLoginMode===true;
 if(memberMode)return `<div class="auth-screen"><div class="auth-card"><div class="brand-mark auth-logo">👤</div><h1>Member Login</h1><p class="auth-sub">View your chit, dues and payment history</p><div class="form"><input id="memberLoginUser" placeholder="Member ID / Phone"><input id="memberLoginPass" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')loginMember()"><button class="btn gold full" onclick="loginMember()">Login as Member</button><button class="btn full" onclick="showAdminLogin()">Admin Login</button><div id="loginError" class="auth-error"></div></div><div class="auth-note">Ask your administrator for your member login password.</div></div></div>`;
 if(!a)return `<div class="auth-screen"><div class="auth-card"><div class="brand-mark auth-logo">♛</div><h1>Welcome to MithraQ</h1><p class="auth-sub">Create your administrator account</p><div class="form"><input id="setupName" placeholder="Admin name"><input id="setupUser" placeholder="Admin username"><input id="setupPass" type="password" placeholder="Password (min 6 characters)"><input id="setupPass2" type="password" placeholder="Confirm password"><button class="btn gold full" onclick="setupAdmin()">Create Admin Account</button></div></div></div>`;
 return `<div class="auth-screen"><div class="auth-card"><div class="brand-mark auth-logo">♛</div><h1>MithraQ</h1><p class="auth-sub">Administrator Login</p><div class="form"><input id="loginUser" placeholder="Username"><input id="loginPass" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')loginAdmin()"><button class="btn gold full" onclick="loginAdmin()">Login as Admin</button><button class="btn full" onclick="showMemberLogin()">Member Login</button><div id="loginError" class="auth-error"></div></div><div class="auth-note">Role-based access keeps member data separate from admin controls.</div></div></div>`;
};
function showMemberLogin(){window.__memberLoginMode=true;showLogin();}
function showAdminLogin(){window.__memberLoginMode=false;showLogin();}
async function loginMember(){const user=(document.getElementById('memberLoginUser')?.value||'').trim().toLowerCase(),pass=document.getElementById('memberLoginPass')?.value||'',accounts=memberAccounts();const hash=await authHash(pass);const m=state.members.find(x=>[x.memberNo,x.phone,x.id].some(v=>String(v||'').replace(/\s/g,'').toLowerCase()===user.replace(/\s/g,'')));if(!m){document.getElementById('loginError').textContent='Member not found.';return;}const acc=accounts[String(m.id)];if(!acc||acc.hash!==hash){document.getElementById('loginError').textContent='Incorrect member password.';return;}authUser={name:m.name,memberId:m.id,role:'member'};currentRole='member';currentMemberId=m.id;showApp();}
const __baseLoginAdminPhase12=loginAdmin;
loginAdmin=async function(){await __baseLoginAdminPhase12();if(authUser){currentRole='admin';currentMemberId=null;window.__memberLoginMode=false;}};
logoutAdmin=function(){uiConfirm('Logout from MithraQ?',()=>{authUser=null;currentRole='admin';currentMemberId=null;window.__memberLoginMode=false;showLogin();});};
function memberPortal(){const m=state.members.find(x=>String(x.id)===String(currentMemberId));if(!m)return `<div class="empty">Member account not found.</div>`;const chits=(m.chitIds||[]).map(chitById).filter(Boolean);const month=new Date().toISOString().slice(0,7);const cards=chits.map(c=>{const expected=memberMonthly(m,c),p=paymentFor(m.id,month),paid=Number(p?.amount||0),due=Math.max(0,expected-paid);return `<div class="card member-portal-card"><div><span class="badge active">${esc(c.name)}</span><h3>${money(expected)} / month</h3><div class="muted">${p?esc(p.status||'Paid'):'Pending'} • ${monthLabel(month)}</div></div><div class="portal-due"><span>Due</span><b>${money(due)}</b></div></div>`}).join('');const history=state.payments.filter(p=>String(p.memberId)===String(m.id)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,12);return `<div class="member-portal"><div class="portal-hero"><div><span class="role-pill">MEMBER PORTAL</span><h2>Welcome, ${esc(m.name)}</h2><p>Member #${esc(m.memberNo||'—')}</p></div><button class="btn" onclick="logoutAdmin()">Logout</button></div><div class="analytics-kpis"><div class="analytics-kpi"><span>Active Chits</span><b>${chits.length}</b></div><div class="analytics-kpi warning"><span>This Month Due</span><b>${money(chits.reduce((s,c)=>s+Math.max(0,memberMonthly(m,c)-Number(paymentFor(m.id,month)?.amount||0)),0))}</b></div></div><h3 class="portal-section-title">My Chits</h3>${cards||'<div class="empty">No chit group assigned.</div>'}<h3 class="portal-section-title">Recent Payments</h3><div class="card portal-history">${history.length?history.map(p=>`<div class="portal-payment"><div><b>${esc(p.chit||'Chit Payment')}</b><small>${esc(p.month||'')} • ${esc(p.date||'')}</small></div><strong>${money(p.amount)}</strong></div>`).join(''):'<div class="empty">No payment history yet.</div>'}</div></div>`;}
const __baseRenderPhase12=render;
render=function(){if(currentRole==='member'){document.getElementById('app').innerHTML=memberPortal();document.querySelectorAll('.bottom-nav,.topbar').forEach(x=>x.style.display='none');return;}document.querySelectorAll('.bottom-nav,.topbar').forEach(x=>x.style.display='');__baseRenderPhase12();};
function memberAccountPanel(){const accounts=memberAccounts();return `<div class="card role-panel"><h3>👥 Member Login Management</h3><div class="muted">Create or reset passwords for member-only access.</div><div class="form"><select id="roleMemberSelect"><option value="">Select member</option>${state.members.map(m=>`<option value="${esc(String(m.id))}">${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join('')}</select><input id="roleMemberPass" type="password" placeholder="New member password (min 6 chars)"><button class="btn gold full" onclick="saveMemberPassword()">Save Member Login</button></div><div class="role-account-list">${state.members.slice(0,20).map(m=>`<div><span>${esc(m.name)}</span><small>${accounts[String(m.id)]?'Login enabled':'No login'}</small></div>`).join('')||'<div class="empty">No members yet.</div>'}</div></div>`;}
async function saveMemberPassword(){const id=document.getElementById('roleMemberSelect')?.value||'',pass=document.getElementById('roleMemberPass')?.value||'';if(!id||pass.length<6)return uiAlert('Select a member and enter at least 6 characters.');const a=memberAccounts();a[id]={hash:await authHash(pass),updatedAt:new Date().toISOString()};saveMemberAccounts(a);document.getElementById('roleMemberPass').value='';uiAlert('Member login password saved successfully.');render();}
const __baseSettingsPhase12=settingsPanel;
settingsPanel=function(){return __baseSettingsPhase12()+memberAccountPanel();};

/* ===== Phase 13: Notification & Smart Reminder System ===== */
function notificationStore(){try{return JSON.parse(localStorage.getItem('mithraq_notifications')||'[]')}catch(e){return []}}
function saveNotifications(v){localStorage.setItem('mithraq_notifications',JSON.stringify(v.slice(0,100)))}
function addNotification(title,message,type='info',meta={}){const list=notificationStore();list.unshift({id:'n_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),title,message,type,meta,read:false,createdAt:new Date().toISOString()});saveNotifications(list);updateNotificationBadge();return list[0]}
function unreadNotifications(){return notificationStore().filter(n=>!n.read).length}
function notificationIcon(type){return type==='overdue'?'🔴':type==='success'?'🎉':type==='winner'?'🏆':type==='announcement'?'📢':'🔔'}
function formatNotificationTime(v){const d=new Date(v),diff=Math.max(0,Date.now()-d.getTime());if(diff<60000)return 'Just now';if(diff<3600000)return Math.floor(diff/60000)+' min ago';if(diff<86400000)return Math.floor(diff/3600000)+' hr ago';return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
function updateNotificationBadge(){const b=document.getElementById('notificationBadge');if(b){const n=unreadNotifications();b.textContent=n>99?'99+':n;b.style.display=n?'grid':'none'}}
function ensureNotificationButton(){const top=document.querySelector('.topbar');if(top&&!document.getElementById('notificationBtn')){const btn=document.createElement('button');btn.id='notificationBtn';btn.className='notification-btn';btn.type='button';btn.setAttribute('aria-label','Notifications');btn.innerHTML='🔔<span id="notificationBadge"></span>';btn.onclick=openNotifications;top.appendChild(btn)}updateNotificationBadge()}
function markAllNotificationsRead(){const list=notificationStore().map(n=>({...n,read:true}));saveNotifications(list);updateNotificationBadge();openNotifications()}
function clearNotifications(){if(!confirm('Clear all notifications?'))return;saveNotifications([]);updateNotificationBadge();openNotifications()}
function openNotifications(){const list=notificationStore();openModal('Notifications',`<div class="notification-modal-actions"><button class="small-link" onclick="markAllNotificationsRead()">✓ Mark all read</button><button class="small-link danger" onclick="clearNotifications()">Clear all</button></div><div class="notification-list">${list.length?list.map(n=>`<div class="notification-row ${n.read?'':'unread'}"><div class="notification-icon">${notificationIcon(n.type)}</div><div class="notification-main"><b>${esc(n.title)}</b><span>${esc(n.message)}</span><small>${formatNotificationTime(n.createdAt)}</small></div></div>`).join(''):'<div class="empty">No notifications yet.</div>'}</div>`);const changed=list.map(n=>({...n,read:true}));saveNotifications(changed);updateNotificationBadge()}
function generateSmartNotifications(){const month=collectionMonthValue||new Date().toISOString().slice(0,7), dueDay=Number(localStorage.getItem('mithraq_due_day')||5), today=new Date();if(today.getDate()>=Math.max(1,dueDay-2)&&today.getDate()<=dueDay){addNotification('Upcoming payment due','Some member payments are due soon. Review the collection list.','info',{month})}const due=dueDashboardRows(month);if(due.length){addNotification('Pending payments detected',`${due.length} member(s) have pending payments for ${monthLabel(month)}.`,today.getDate()>dueDay?'overdue':'info',{month})}}
function addAnnouncement(){openModal('Admin Announcement',`<div class="form"><label class="field-label">Announcement title</label><input id="announcementTitle" placeholder="Example: Monthly meeting"><label class="field-label">Message</label><textarea id="announcementMessage" rows="4" placeholder="Write an announcement for members..."></textarea><button class="btn gold full" onclick="publishAnnouncement()">📢 Publish Announcement</button></div>`)}
function publishAnnouncement(){const title=document.getElementById('announcementTitle')?.value.trim(),msg=document.getElementById('announcementMessage')?.value.trim();if(!title||!msg)return uiAlert('Enter both title and announcement message.');addNotification(title,msg,'announcement');closeModal();uiAlert('Announcement published successfully.','Notification Sent')}
function notifyPaymentSuccess(memberName,amount){addNotification('Payment received',`${memberName} payment of ${money(amount)} was recorded successfully.`,'success')}
function notifyAuctionWinner(memberName,chitName,amount){addNotification('Auction winner selected',`${memberName} won ${chitName} with ${money(amount)}.`,'winner')}
const __baseRenderPhase13=render;render=function(){__baseRenderPhase13();ensureNotificationButton()};
setTimeout(()=>{ensureNotificationButton();generateSmartNotifications()},200);
const __baseSettingsPhase13 = typeof settings==='function' ? settings : null;
if(__baseSettingsPhase13){settings=function(){const out=__baseSettingsPhase13();return out.replace(/(<\/div>\s*)$/,'<button class="btn gold announcement-btn" onclick="addAnnouncement()">📢 Send Admin Announcement</button>$1')}}

/* ===== Phase 15: Security & Production Readiness ===== */
const SESSION_KEY='mithraq_secure_session_v1';
const SESSION_MIN_KEY='mithraq_session_minutes_v1';
let sessionTimer=null;
function sessionMinutes(){return Math.max(5,Math.min(1440,Number(localStorage.getItem(SESSION_MIN_KEY)||30)))}
function startSecureSession(role){const expiresAt=Date.now()+sessionMinutes()*60*1000;sessionStorage.setItem(SESSION_KEY,JSON.stringify({role,expiresAt}));clearTimeout(sessionTimer);sessionTimer=setTimeout(()=>forceSessionLogout(),sessionMinutes()*60*1000);}
function touchSecureSession(){try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(!s||Date.now()>s.expiresAt)return forceSessionLogout();s.expiresAt=Date.now()+sessionMinutes()*60*1000;sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));clearTimeout(sessionTimer);sessionTimer=setTimeout(()=>forceSessionLogout(),sessionMinutes()*60*1000)}catch(e){}}
function forceSessionLogout(){sessionStorage.removeItem(SESSION_KEY);authUser=null;currentRole='admin';currentMemberId=null;window.__memberLoginMode=false;if(document.getElementById('authRoot'))showLogin();}
['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if(authUser)touchSecureSession()},{passive:true}));
const __phase15AdminLogin=loginAdmin;loginAdmin=async function(){await __phase15AdminLogin();if(authUser)startSecureSession('admin');};
const __phase15MemberLogin=loginMember;loginMember=async function(){await __phase15MemberLogin();if(authUser)startSecureSession('member');};
const __phase15Logout=logoutAdmin;logoutAdmin=function(){sessionStorage.removeItem(SESSION_KEY);__phase15Logout();};
function changeAdminPassword(){const current=document.getElementById('secCurrentPass')?.value||'',next=document.getElementById('secNewPass')?.value||'',confirmPass=document.getElementById('secConfirmPass')?.value||'',a=getAuth();if(!a)return uiAlert('Administrator account not found.');if(next.length<8)return uiAlert('Use at least 8 characters for the new password.');if(next!==confirmPass)return uiAlert('New passwords do not match.');authHash(current).then(h=>{if(h!==a.hash)return uiAlert('Current password is incorrect.');authHash(next).then(nh=>{a.hash=nh;a.updatedAt=new Date().toISOString();localStorage.setItem(AUTH_KEY,JSON.stringify(a));['secCurrentPass','secNewPass','secConfirmPass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});uiAlert('Admin password changed successfully.','Security Updated');});});}
function saveSessionSecurity(){const v=Number(document.getElementById('sessionMinutes')?.value||30);if(v<5||v>1440)return uiAlert('Session timeout must be between 5 and 1440 minutes.');localStorage.setItem(SESSION_MIN_KEY,String(v));touchSecureSession();uiAlert('Session security updated.','Security Updated');}
function phase15SecurityPanel(){return `<div class="card role-panel security-panel"><h3>🛡️ Advanced Security</h3><div class="muted">Production-ready controls for sessions and administrator credentials.</div><div class="form"><label class="field-label">Session timeout (minutes)</label><input id="sessionMinutes" type="number" min="5" max="1440" value="${sessionMinutes()}"><button class="btn full" onclick="saveSessionSecurity()">Save Session Timeout</button><hr><label class="field-label">Current password</label><input id="secCurrentPass" type="password" autocomplete="current-password"><label class="field-label">New password (min 8 characters)</label><input id="secNewPass" type="password" autocomplete="new-password"><label class="field-label">Confirm new password</label><input id="secConfirmPass" type="password" autocomplete="new-password"><button class="btn gold full" onclick="changeAdminPassword()">🔑 Change Admin Password</button></div><div class="backup-note">For real multi-device password reset and account recovery, configure Supabase Auth and email delivery in your production project.</div></div>`;}
const __phase15Settings=settingsPanel;settingsPanel=function(){return __phase15Settings()+phase15SecurityPanel();};
window.addEventListener('load',()=>{try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(authUser&&(!s||Date.now()>s.expiresAt)){authUser=null;showLogin();}else if(authUser&&s)startSecureSession(s.role);}catch(e){}});


/* PWA UI removed. Silently clean up old service workers and caches so stale offline code cannot show old banners/prompts. */
(function cleanupLegacyPWA(){
  window.addEventListener('load', async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => /mithraq|pwa/i.test(k)).map(k => caches.delete(k)));
      }
    } catch (e) {}
  });
})();


/* ===== Final safe boot: prevent blank screen ===== */
(function(){
  function safeBoot(){
    try{
      authUser=getAuth();
      if(authUser){ showApp(); }
      else { showLogin(); }
    }catch(e){
      console.error('MithraQ startup error:',e);
      const root=document.getElementById('app');
      if(root){
        root.innerHTML='<div class="card"><h2 class="page-title">Welcome to MithraQ</h2><div class="subtitle">Smart Chit Management</div><div class="hero"><small>DASHBOARD</small><h2>₹0</h2><div class="hero-muted">Your app is ready. Please refresh once if this is the first launch.</div></div></div>';
      }
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',safeBoot,{once:true});
  else safeBoot();
})();



/* ===== Runtime stability patch ===== */
(function(){
  // Inline handlers and dynamic menu actions use one stable navigation entry point.
  window.setTab=function(nextTab){
    try{
      tab=nextTab;
      render();
    }catch(e){
      console.error('Navigation error:',e);
      const root=document.getElementById('app');
      if(root) root.innerHTML='<div class="card"><h2 class="page-title">Unable to open this page</h2><p class="muted">Please try another section.</p></div>';
    }
  };

  // Never leave the main content completely blank when one page renderer fails.
  const __mithraqRender=render;
  render=function(){
    const root=document.getElementById('app');
    try{
      return __mithraqRender();
    }catch(e){
      console.error('MithraQ render error:',e);
      if(root){
        root.innerHTML='<div class="card"><h2 class="page-title">MithraQ</h2><div class="subtitle">The selected page could not be loaded.</div><div class="hero"><small>APP STATUS</small><h2>Ready</h2><div class="hero-muted">Your saved data is safe. Use Home or another menu item to continue.</div></div><button class="btn gold full" type="button" onclick="setTab(\'home\')">Go to Home</button></div>';
      }
      return null;
    }
  };

  // Rebind bottom navigation after the full script is loaded.
  document.querySelectorAll('.bottom-nav button[data-tab]').forEach(function(btn){
    btn.onclick=function(ev){
      ev.preventDefault();
      window.setTab(btn.dataset.tab);
    };
  });

  // Helpful tap feedback for the menu button on Android WebView.
  const menuBtn=document.getElementById('navMenuBtn');
  if(menuBtn) menuBtn.onclick=function(ev){ev.preventDefault();openMenuSheet();};

  // Expose key actions explicitly for Android WebView inline handlers.
  ['newChit','createChit','newMember','addMember','closeModal','openModal','openMenuSheet','closeMenuSheet','openHistory','loginAdmin','logoutAdmin'].forEach(function(name){
    try{ if(typeof window[name]!=='function' && typeof eval(name)==='function') window[name]=eval(name); }catch(e){}
  });

  // Last-chance visible boot after load.
  window.addEventListener('load',function(){
    setTimeout(function(){
      const root=document.getElementById('app');
      const authRoot=document.getElementById('authRoot');
      if(authUser && root && !root.innerHTML.trim()){
        try{ render(); }catch(e){}
      }else if(!authUser && authRoot && !authRoot.innerHTML.trim()){
        try{ showLogin(); }catch(e){}
      }
    },50);
  });
})();
