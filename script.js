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
let supa=null, supaStatus="Not connected", syncBusy=false;
function getSupabaseConfig(){try{return JSON.parse(localStorage.getItem(SUPA_CFG_KEY)||"null")}catch(e){return null}}
function initSupabase(){const c=getSupabaseConfig();if(!c?.url||!c?.anonKey||!window.supabase){supa=null;supaStatus=window.supabase?"Not configured":"Library loading";return false}try{supa=window.supabase.createClient(c.url,c.anonKey);supaStatus="Connected";return true}catch(e){supa=null;supaStatus="Invalid configuration";return false}}
initSupabase();
let state=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{chits:[],members:[],auctions:[],payments:[]}}catch(e){return {chits:[],members:[],auctions:[],payments:[]}}})();
// Migrate old MithraQ data if it exists.
if(!state.chits.length && !state.members.length){try{const old=JSON.parse(localStorage.getItem('mithraq_v1')||'null');if(old)state=old;}catch(e){}}
state.chits=Array.isArray(state.chits)?state.chits:[]; state.members=Array.isArray(state.members)?state.members:[];
state.auctions=Array.isArray(state.auctions)?state.auctions:[]; state.payments=Array.isArray(state.payments)?state.payments:[]; state.reminders=Array.isArray(state.reminders)?state.reminders:[]; state.activityLog=Array.isArray(state.activityLog)?state.activityLog:[]; state.notifications=Array.isArray(state.notifications)?state.notifications:[];
const TAB_KEY='mithraq_last_tab_v1';
let tab=(()=>{try{return sessionStorage.getItem(TAB_KEY)||"home";}catch(e){return "home";}})();
let __navHistoryTab=null, __navPopping=false;
let collectionMonthValue=new Date().toISOString().slice(0,7);
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
/* ===== Auto Member ID: MQ0001 ... MQ9999 ===== */
function memberNoNum(v){const x=/^MQ-?(\d{1,4})$/i.exec(String(v||'').trim());return x?parseInt(x[1],10):null;}
function fmtMemberNo(n){return 'MQ'+String(n).padStart(4,'0');}
function nextMemberNo(){let max=0;state.members.forEach(m=>{const n=memberNoNum(m.memberNo);if(n&&n>max)max=n;});const n=max+1;return n>9999?'':fmtMemberNo(n);}
function migrateMemberIds(){
  const used=new Set(),todo=[];let changed=false;
  [...state.members].sort((a,b)=>Number(a.id||0)-Number(b.id||0)).forEach(m=>{
    const n=memberNoNum(m.memberNo);
    if(n&&n>0&&!used.has(n)){used.add(n);const f=fmtMemberNo(n);if(m.memberNo!==f){m.memberNo=f;changed=true;}}
    else todo.push(m);
  });
  let next=Math.max(0,...used)+1;
  todo.forEach(m=>{if(next>9999)return;used.add(next);m.memberNo=fmtMemberNo(next++);changed=true;});
  if(changed)save();
}
migrateMemberIds();
async function pushToSupabase(){if(!supa||syncBusy)return false;syncBusy=true;try{const payload={id:"main",data:state,updated_at:new Date().toISOString()};const {error}=await supa.from("mithraq_data").upsert(payload,{onConflict:"id"});if(error)throw error;supaStatus="Synced";return true}catch(e){supaStatus="Sync error: "+(e.message||"unknown");return false}finally{syncBusy=false}}
async function pullFromSupabase(){if(!supa||syncBusy)return false;syncBusy=true;try{const {data,error}=await supa.from("mithraq_data").select("data,updated_at").eq("id","main").maybeSingle();if(error)throw error;if(data?.data){state={chits:data.data.chits||[],members:data.data.members||[],auctions:data.data.auctions||[],payments:data.data.payments||[],reminders:data.data.reminders||[]};save();supaStatus="Downloaded";render();return true}supaStatus="Connected (no cloud data yet)";return false}catch(e){supaStatus="Sync error: "+(e.message||"unknown");return false}finally{syncBusy=false}}
async function syncCloud(mode="push"){if(!initSupabase()){uiAlert("Supabase is not configured. Open Settings → Supabase Live Sync and enter your Project URL + anon key.");return}const ok=mode==='pull'?await pullFromSupabase():await pushToSupabase();uiAlert(ok?(mode==='pull'?'Cloud data downloaded successfully.':'Data uploaded to Supabase successfully.'):'Supabase sync failed. Check the configuration and RLS policy.');render()}
function supabasePanel(){const c=getSupabaseConfig()||{};return `<div class="card"><h3 style="margin-top:0">☁️ Supabase Live Sync</h3><div class="muted">Status: <b>${esc(supaStatus)}</b></div><div class="form"><input id="supaUrl" value="${esc(c.url||'')}" placeholder="Supabase Project URL"><input id="supaAnon" value="${esc(c.anonKey||'')}" placeholder="Supabase anon/public key" type="password"><button class="btn gold full" onclick="saveSupabaseConfig()">Save & Connect</button></div><div class="backup-grid"><button class="btn" onclick="syncCloud('pull')">⬇️ Download Cloud</button><button class="btn" onclick="syncCloud('push')">⬆️ Upload to Cloud</button></div><div class="backup-note">Use only the Supabase <b>anon/public</b> key in this browser. Never paste the service-role/secret key here. Run the included <b>supabase_phase10.sql</b> once in Supabase SQL Editor before syncing.</div></div>`}
function saveSupabaseConfig(){const url=(document.getElementById('supaUrl')?.value||'').trim().replace(/\/$/,''),anonKey=(document.getElementById('supaAnon')?.value||'').trim();if(!/^https:\/\/[^ ]+\.supabase\.co$/.test(url)||anonKey.length<20)return uiAlert('Enter a valid Supabase Project URL and anon/public key.');localStorage.setItem(SUPA_CFG_KEY,JSON.stringify({url,anonKey}));initSupabase();uiAlert('Supabase connection saved.');render()}
/* ===== MithraQ Notifications + Activity Log ===== */
function logActivity(action,category='System',detail=''){
  state.activityLog=Array.isArray(state.activityLog)?state.activityLog:[];
  state.activityLog.unshift({id:'act_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),action,category,detail,at:new Date().toISOString()});
  state.activityLog=state.activityLog.slice(0,300); save();
}
function unreadNotificationCount(){return (state.notifications||[]).filter(n=>!n.read).length;}
function addNotification(title,message,type='info',key=''){
  state.notifications=Array.isArray(state.notifications)?state.notifications:[];
  if(key && state.notifications.some(n=>n.key===key))return;
  state.notifications.unshift({id:'nt_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),title,message,type,key,read:false,at:new Date().toISOString()});
  state.notifications=state.notifications.slice(0,150); save();
}
function refreshSmartNotifications(){
  const month=new Date().toISOString().slice(0,7);
  const pending=reminderRows(month);
  if(pending.length) addNotification('Pending payments',`${pending.length} member payment(s) are pending for ${monthLabel(month)}.`,'warning','pending-'+month);
  const recentPayments=(state.payments||[]).filter(p=>String(p.date||'').slice(0,10)===new Date().toISOString().slice(0,10));
  if(recentPayments.length) addNotification('Payments received',`${recentPayments.length} payment record(s) added today.`,'success','payments-'+new Date().toISOString().slice(0,10));
  const active=(state.auctions||[]).filter(a=>a.status==='active'||a.running===true);
  if(active.length) addNotification('Auction active',`${active.length} auction(s) are currently active.`,'auction','auction-active');
  const badPhones=invalidPhoneMembers();
  if(badPhones.length) addNotification('Invalid phone numbers',`${badPhones.length} member(s) have an invalid saved phone number and can't be reached on WhatsApp.`,'warning','bad-phone-'+badPhones.map(m=>m.id).sort().join(','));
  state.chits.forEach(c=>{
    const n=auctionDaysLeft(c.nextAuctionDate); if(n===null||c.status==='completed')return;
    if(n>=0&&n<=3) addNotification(n===0?'Auction today':'Auction reminder',`${c.name} auction ${n===0?'is today':n===1?'is tomorrow':'is in '+n+' days'} (${auctionDateText(c)}).`,'auction','auc-'+c.id+'-'+c.nextAuctionDate+'-'+n);
    else if(n<0&&n>=-7) addNotification('Auction date passed',`${c.name} auction date (${formatDMY(c.nextAuctionDate)}) has passed. Please update the next auction date.`,'warning','auc-passed-'+c.id+'-'+c.nextAuctionDate);
  });
}
function notificationCenter(){
  refreshSmartNotifications();
  const items=(state.notifications||[]).slice(0,80);
  return `<div class="row"><div><h2 class="page-title">🔔 Notifications</h2><div class="subtitle">Important updates and pending actions</div></div><div class="row-actions"><button class="btn" onclick="markAllNotificationsRead()">✓ Mark all read</button><button class="btn danger-outline" onclick="clearNotifications()">Clear</button></div></div>
  <div class="grid notify-stats"><div class="card"><div class="stat-label">UNREAD</div><div class="stat-value">${unreadNotificationCount()}</div></div><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${reminderRows(new Date().toISOString().slice(0,7)).length}</div></div><div class="card"><div class="stat-label">ACTIVITY</div><div class="stat-value">${(state.activityLog||[]).length}</div></div></div>
  <div class="list notification-list">${items.length?items.map(n=>`<div class="card notification-item ${n.read?'read':'unread'}"><div class="notification-icon ${esc(n.type||'info')}">${n.type==='warning'?'!':n.type==='success'?'✓':n.type==='auction'?'♢':'i'}</div><div class="notification-main"><b>${esc(n.title)}</b><div class="muted">${esc(n.message)}</div><small>${esc(new Date(n.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))}</small></div>${!n.read?`<button class="mini-btn" onclick="markNotificationRead('${String(n.id)}')">✓</button>`:''}</div>`).join(''):'<div class="empty">🎉 No notifications yet.</div>'}</div>`;
}
function markNotificationRead(id){const n=(state.notifications||[]).find(x=>String(x.id)===String(id));if(n){n.read=true;save();render();}}
function markAllNotificationsRead(){(state.notifications||[]).forEach(n=>n.read=true);save();render();}
function clearNotifications(){uiConfirm('Clear all notifications?',()=>{state.notifications=[];save();render();});}
function activityLogPage(){
  const q=(document.getElementById('activitySearch')?.value||'').trim().toLowerCase();
  const filter=document.getElementById('activityFilter')?.value||'all';
  let rows=(state.activityLog||[]).filter(x=>filter==='all'||String(x.category).toLowerCase()===filter);
  if(q) rows=rows.filter(x=>[x.action,x.category,x.detail].join(' ').toLowerCase().includes(q));
  return `<div class="row"><div><h2 class="page-title">📋 Activity Log</h2><div class="subtitle">A local history of important MithraQ actions</div></div><button class="btn danger-outline" onclick="clearActivityLog()">Clear Log</button></div><div class="activity-toolbar"><input id="activitySearch" placeholder="Search activity..." value="${esc(q)}" oninput="renderActivityRows()"><select id="activityFilter" onchange="renderActivityRows()"><option value="all" ${filter==='all'?'selected':''}>All</option><option value="payment" ${filter==='payment'?'selected':''}>Payments</option><option value="auction" ${filter==='auction'?'selected':''}>Auctions</option><option value="member" ${filter==='member'?'selected':''}>Members</option><option value="system" ${filter==='system'?'selected':''}>System</option></select></div><div id="activityRows" class="list activity-list">${activityRowsHTML(rows)}</div>`;
}
function activityRowsHTML(rows){return rows.length?rows.map(x=>`<div class="card activity-row"><div class="activity-dot"></div><div class="activity-main"><b>${esc(x.action)}</b><div class="muted">${esc(x.detail||x.category)}</div><small>${esc(new Date(x.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))}</small></div><span class="badge">${esc(x.category)}</span></div>`).join(''):'<div class="empty">No matching activity.</div>';}
function renderActivityRows(){const el=document.getElementById('activityRows');if(!el)return;const q=(document.getElementById('activitySearch')?.value||'').trim().toLowerCase(),filter=document.getElementById('activityFilter')?.value||'all';let rows=(state.activityLog||[]).filter(x=>filter==='all'||String(x.category).toLowerCase()===filter);if(q)rows=rows.filter(x=>[x.action,x.category,x.detail].join(' ').toLowerCase().includes(q));el.innerHTML=activityRowsHTML(rows);}
function clearActivityLog(){uiConfirm('Clear the activity log?',()=>{state.activityLog=[];save();render();});}
function openNotifications(){tab='notifications';render();}
function openActivityLog(){tab='activity';render();closeMenuSheet();}

function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});}
function waIntlPhone(raw){
  const d=String(raw||'').replace(/\D/g,'');
  if(d.length===10)return '91'+d;
  if(d.length===11&&d.startsWith('0'))return '91'+d.slice(1);
  if(d.length===12&&d.startsWith('91'))return d;
  if(d.length===13&&d.startsWith('091'))return '91'+d.slice(3);
  return null;
}
function waOpenOrWarn(rawPhone,text){
  const intl=waIntlPhone(rawPhone);
  if(!intl){uiAlert(`"${rawPhone||'(empty)'}" doesn't look like a valid phone number. Please edit the member and enter a full 10-digit mobile number.`,'Invalid Phone Number');return false;}
  openWhatsApp('https://wa.me/'+intl+'?text='+encodeURIComponent(text));
  return true;
}
function invalidPhoneMembers(){return (state.members||[]).filter(m=>m.phone&&!waIntlPhone(m.phone));}
function dataHealthCard(){
  const bad=invalidPhoneMembers();
  if(!bad.length)return '';
  return `<div class="card" style="border-color:#f0d5d2;background:#fff7f6;margin-bottom:16px"><h3 style="margin-top:0;color:#b84f4f">⚠️ ${bad.length} Member(s) With Invalid Phone Number</h3><div class="muted">These numbers are too short to use on WhatsApp. Tap Fix to correct them.</div><div class="list" style="margin-top:10px">${bad.map(m=>`<div class="row" style="padding:9px 0;border-bottom:1px solid #f4e3e1"><div><b>${esc(m.name)}</b><div class="muted">Saved phone: "${esc(m.phone)}"</div></div><button class="action-btn edit" onclick="editMember('${String(m.id)}')">✎ Fix</button></div>`).join('')}</div></div>`;
}
function openWhatsApp(url){
  try{
    const a=document.createElement('a');
    a.href=url; a.target='_blank'; a.rel='noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  }catch(e){
    try{window.location.href=url;}catch(e2){}
  }
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function chitById(id){return state.chits.find(c=>String(c.id)===String(id));}
function membersForChit(id){return state.members.filter(m=>(m.chitIds||[]).map(String).includes(String(id)));}
function memberMonthly(m,c){const x=(m?.memberships||[]).find(v=>String(v.chitId)===String(c?.id));return Number(x?.monthly||m?.monthly||c?.monthly||0);}
function normalizeMember(m){if(!Array.isArray(m.chitIds))m.chitIds=[];if(!Array.isArray(m.memberships))m.memberships=m.chitIds.map(id=>({chitId:id,monthly:Number(m.monthly||chitById(id)?.monthly||0)}));m.address=m.address||'';m.nomineeName=m.nomineeName||'';m.nomineePhone=m.nomineePhone||'';m.status=m.status==='inactive'?'inactive':'active';return m;}
state.members.forEach(normalizeMember);
function searchPage(){return `<h2 class="page-title">Search</h2><div class="subtitle">Find members, chits and payments quickly</div><div class="search-box"><input id="globalSearch" placeholder="Search name, phone, member ID or chit..." oninput="runGlobalSearch()"><button class="btn gold" onclick="runGlobalSearch()">Search</button></div><div id="searchResults"><div class="empty">Type something to search.</div></div>`;}
function runGlobalSearch(){const q=String(document.getElementById('globalSearch')?.value||'').trim().toLowerCase(),el=document.getElementById('searchResults');if(!el)return;if(!q){el.innerHTML='<div class="empty">Type something to search.</div>';return;}const out=[];state.members.filter(m=>[m.name,m.phone,m.memberNo].some(v=>String(v||'').toLowerCase().includes(q))).forEach(m=>out.push(`<div class="card search-result"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(m.name)}</b><div class="muted">Member #${esc(m.memberNo||'—')} • ${esc(m.phone||'No phone')}</div></div><button class="action-btn" onclick="memberStatement('${String(m.id)}')">Statement</button></div>`));state.chits.filter(c=>String(c.name||'').toLowerCase().includes(q)).forEach(c=>out.push(`<div class="card search-result"><div class="avatar">▣</div><div style="flex:1"><b>${esc(c.name)}</b><div class="muted">${c.type==='dividend'?'Dividend':'Fixed'} • Monthly ${money(c.monthly||0)}</div></div><button class="action-btn edit" onclick="tab='chits';render()">Open</button></div>`));state.payments.filter(p=>[p.member,p.chit,p.month,p.date].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,20).forEach(p=>out.push(`<div class="card search-result"><div class="avatar">₹</div><div style="flex:1"><b>${esc(p.member||'Member')}</b><div class="muted">${esc(p.chit||'')} • ${esc(p.month||'')} • ${esc(p.mode||'')}</div></div><b>${money(p.amount)}</b></div>`));el.innerHTML=out.length?`<div class="list">${out.join('')}</div>`:'<div class="empty">No matching records found.</div>';}
function backupData(){const payload={app:'MithraQ',version:5,exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mithraq-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function restoreData(){document.getElementById('restoreFile')?.click();}
function handleRestore(input){const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);const d=x.data||x;if(!d||!Array.isArray(d.chits)||!Array.isArray(d.members))throw new Error('Invalid backup');uiConfirm('Restore this backup? Current data will be replaced.',()=>{state={chits:d.chits||[],members:d.members||[],auctions:d.auctions||[],payments:d.payments||[],reminders:d.reminders||[]};save();uiAlert('Backup restored successfully.');tab='home';render();input.value='';},()=>{input.value='';});}catch(e){uiAlert('Invalid MithraQ backup file.');input.value='';}};r.readAsText(f);}
function settingsPanel(){const a=getAuth();return `<div class="card"><h3 style="margin-top:0">Security & Data</h3><div class="muted">Admin: ${esc(a?.name||"Admin")} • Username: ${esc(a?.username||"—")}</div><div class="backup-grid"><button class="btn" onclick="logoutAdmin()">🔒 Logout</button><button class="btn gold" onclick="backupData()">⬇️ Backup Data</button><button class="btn" onclick="restoreData()">⬆️ Restore Data</button></div><input id="restoreFile" class="file-input" type="file" accept="application/json,.json" onchange="handleRestore(this)"><div class="backup-note">Backup includes chits, members, auctions, payments and reminder history. Browser login remains available offline.</div></div>`+supabasePanel()}
const MENU_TABS=['members','reports','search','history','settings','notifications','activity'];
let waBroadcastMsg='Hello {name}, this is an update from MithraQ regarding your {chit} chit. Thank you.';
function waRowHTML(m,payments){
  const paid=payments.filter(p=>String(p.memberId)===String(m.id)).reduce((a,p)=>a+Number(p.amount||0),0);
  return `<div class="card wa-row" style="margin:10px 0;padding:14px" data-search="${esc([m.name,m.phone,m.memberNo].join(' ').toLowerCase())}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><label class="group-check" style="border:0;padding:0;background:none;flex:1"><input type="checkbox" class="waCheck" value="${String(m.id)}" ${m.phone?'':'disabled'} onchange="updateWACount()"><span><b>${esc(m.name||'Member')}</b><div class="subtitle">#${esc(m.memberNo||'—')} • ${esc(m.phone||'No phone')}</div><div class="subtitle">Recorded payments: ₹${paid.toLocaleString('en-IN')}</div></span></label><button class="btn primary" onclick="sendWA(${JSON.stringify(String(m.phone||''))},${JSON.stringify(String(m.name||'Member'))},${paid})">WhatsApp</button></div></div>`;
}
function whatsappCenter(){
  const members=Array.isArray(state.members)?state.members:[];
  const payments=Array.isArray(state.payments)?state.payments:[];
  const q=(document.getElementById('waSearch')?.value||'').trim().toLowerCase();
  const filtered=members.filter(m=>!q||[m.name,m.phone,m.memberNo].join(' ').toLowerCase().includes(q));
  const rows=filtered.map(m=>waRowHTML(m,payments)).join('');
  return `<h2 class="page-title">WhatsApp Collection Center</h2><div class="subtitle">Send collection reminders and confirmations</div>
  ${dataHealthCard()}
  <div class="card" style="margin-top:14px;padding:14px"><b>📣 Bulk Broadcast</b><p class="subtitle">Write a custom message and send it to every selected member. Use {name}, {memberNo} and {chit} as placeholders.</p><div class="form"><textarea id="waBroadcastText" rows="4" style="width:100%;padding:14px 15px;border:1px solid #dce8e2;border-radius:14px;background:#fbfdfc;color:#29453e;outline:none;font-family:inherit" oninput="waBroadcastMsg=this.value">${esc(waBroadcastMsg)}</textarea></div><div class="row" style="margin-top:10px"><label class="group-check" style="border:0;padding:0;background:none"><input type="checkbox" id="waSelectAll" onchange="toggleAllWA(this)"><span>Select all shown</span></label><span class="muted" id="waSelCount">0 selected</span></div><button class="btn gold full" style="margin-top:10px" onclick="sendBulkWhatsApp()">💬 Send to Selected</button></div>
  <div class="card" style="margin-top:14px;padding:14px"><input id="waSearch" placeholder="Search member / phone" value="${esc(q)}" oninput="renderWhatsAppRows()"><div id="waRows">${rows||'<div class="empty-state">No members found</div>'}</div></div>
  <div class="card" style="margin-top:14px;padding:14px"><b>Message templates</b><p class="subtitle">Pending reminder • Payment received • Auction winner</p></div>`;
}
function renderWhatsAppRows(){const box=document.getElementById('waRows');if(!box)return;const q=(document.getElementById('waSearch')?.value||'').trim().toLowerCase();const members=Array.isArray(state.members)?state.members:[],payments=Array.isArray(state.payments)?state.payments:[];box.innerHTML=members.filter(m=>!q||[m.name,m.phone,m.memberNo].join(' ').toLowerCase().includes(q)).map(m=>waRowHTML(m,payments)).join('')||'<div class="empty-state">No members found</div>';updateWACount();}
function updateWACount(){const n=document.querySelectorAll('.waCheck:checked').length;const el=document.getElementById('waSelCount');if(el)el.textContent=n+' selected';}
function toggleAllWA(box){document.querySelectorAll('#waRows .waCheck:not(:disabled)').forEach(x=>x.checked=box.checked);updateWACount();}
function sendBulkWhatsApp(){
  const checks=[...document.querySelectorAll('.waCheck:checked')];
  if(!checks.length)return uiAlert('Select at least one member with a phone number.');
  const template=(document.getElementById('waBroadcastText')?.value||waBroadcastMsg||'').trim();
  if(!template)return uiAlert('Write a message to broadcast.');
  const targets=checks.map(x=>state.members.find(m=>String(m.id)===String(x.value))).filter(m=>m&&waIntlPhone(m.phone));
  if(!targets.length)return uiAlert('None of the selected members have a valid phone number.');
  uiConfirm(`Send this WhatsApp message to ${targets.length} member(s)?`,()=>{
    targets.forEach((m,i)=>setTimeout(()=>{
      const chitNames=(m.chitIds||[]).map(id=>chitById(id)?.name).filter(Boolean).join(', ');
      const text=template.replace(/\{name\}/g,m.name||'Member').replace(/\{memberNo\}/g,m.memberNo||'—').replace(/\{chit\}/g,chitNames||'your');
      waOpenOrWarn(m.phone,text);
    },i*700));
    logActivity('Bulk WhatsApp broadcast sent','System',`Sent to ${targets.length} member(s).`);
  });
}
function sendWA(phone,name,paid){const intl=waIntlPhone(phone);if(!intl){uiAlert(`"${phone||'(empty)'}" doesn't look like a valid phone number. Please edit the member and enter a full 10-digit mobile number.`,'Invalid Phone Number');return;}const msg=`Hello ${name}, this is a MithraQ collection reminder. Recorded payment total: ₹${Number(paid||0).toLocaleString('en-IN')}. Please contact us for the current pending amount. Thank you.`;openWhatsApp(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`);}
function render(){
  const app=document.getElementById("app");
  if(!app)return;
  try{sessionStorage.setItem(TAB_KEY,tab);}catch(e){}
  if(tab!==__navHistoryTab){
    if(!__navPopping){
      try{
        if(__navHistoryTab===null)history.replaceState({mithraqTab:tab},'',location.href);
        else history.pushState({mithraqTab:tab},'',location.href);
      }catch(e){}
    }
    __navHistoryTab=tab;
  }
  try{
    let html="";
    if(tab==='home')html=home();
    else if(tab==='chits')html=chits();
    else if(tab==='members')html=members();
    else if(tab==='auction')html=auction();
    else if(tab==='reports')html=reports();
    else if(tab==='collection')html=collection();
    else if(tab==='search')html=searchPage();
    else if(tab==='history')html=historyPage();
    else if(tab==='settings')html='<h2 class="page-title">Settings</h2><div class="subtitle">Security, backup and device controls</div>'+settingsPanel();
    else if(tab==='reminders')html=reminderCenter();
    else if(tab==='notifications')html=notificationCenter();
    else if(tab==='activity')html=activityLogPage();
    else if(tab==='whatsapp')html=whatsappCenter();
    else if(tab==='closure')html=closureReport();
    if(typeof html!=='string' || !html.trim()) throw new Error('Empty page output');
    app.innerHTML=html;
  }catch(err){
    console.error('MithraQ render error:',err);
    app.innerHTML=`<div class="page-title">MithraQ Dashboard</div><div class="subtitle">Your data is safe. The page renderer recovered from an error.</div><div class="grid dashboard-kpis"><div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${Array.isArray(state.members)?state.members.length:0}</div></div><div class="card"><div class="stat-label">CHITS</div><div class="stat-value">${Array.isArray(state.chits)?state.chits.length:0}</div></div><div class="card"><div class="stat-label">PAYMENTS</div><div class="stat-value">${Array.isArray(state.payments)?state.payments.length:0}</div></div><div class="card"><div class="stat-label">AUCTIONS</div><div class="stat-value">${Array.isArray(state.auctions)?state.auctions.length:0}</div></div></div><div class="card"><h3>Quick Actions</h3><div class="dashboard-actions"><button class="dash-action" onclick="tab='collection';render()">₹<span>Payment</span></button><button class="dash-action" onclick="tab='members';render()">♙<span>Member</span></button><button class="dash-action" onclick="tab='auction';render()">♢<span>Auction</span></button><button class="dash-action" onclick="tab='chits';render()">▣<span>Chit</span></button></div></div>`;
  }
  document.querySelectorAll('.bottom-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const nb=document.getElementById('notifyBadge');
  if(nb){const n=typeof unreadNotificationCount==='function'?unreadNotificationCount():0;nb.textContent=n>99?'99+':String(n);nb.style.display=n?'block':'none';}
  const navMenuBtn=document.getElementById('navMenuBtn');
  if(navMenuBtn && typeof MENU_TABS!=='undefined')navMenuBtn.classList.toggle('active',MENU_TABS.includes(tab));
}
function openMenuSheet(){const s=document.getElementById('menuSheet'); if(s)s.classList.remove('hidden');}
function closeMenuSheet(){const s=document.getElementById('menuSheet'); if(s)s.classList.add('hidden');}
function chits(){return `<div class="row"><div><h2 class="page-title">Chits</h2><div class="subtitle">Create groups first, then add members to a selected group.</div></div><button class="btn gold" onclick="newChit()">+ New Chit</button></div><div class="list">${state.chits.length?state.chits.map(c=>{const n=membersForChit(c.id).length,closed=c.status==='completed';return `<div class="card chit-card"><div class="chit-card-head"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${money(c.amount)} · ${c.duration||0} months · ${c.type==='dividend'?'Dividend':'Fixed'}</div></div><div class="chit-card-tools"><button class="icon-action edit" type="button" title="Edit Chit" aria-label="Edit Chit" onclick="editChit('${String(c.id)}')">✎</button><button class="icon-action delete" type="button" title="Delete Chit" aria-label="Delete Chit" onclick="deleteChit('${String(c.id)}')">⌫</button></div></div><div class="chit-card-meta"><span class="badge active">${n} MEMBERS</span>${closed?'<span class="badge pending">CLOSED</span>':''}</div><div class="progress"><i style="width:${Math.min(100,(c.current||0)/(c.duration||1)*100)}%"></i></div><div class="muted">Monthly ${money(c.monthly||0)} · ${c.current||0}/${c.duration||0} months</div>${auctionLineHTML(c)}<div class="row" style="margin-top:8px"><button class="small-link" onclick="openGroupMembers('${c.id}')">View ${n} group members →</button><button class="small-link" onclick="openClosureReport('${c.id}')">📑 Settlement →</button></div></div>`}).join(''):'<div class="empty">No chits yet.<br><br><button class="btn gold" onclick="newChit()">Create your first chit</button></div>'}</div>`;}

function editChit(id){
  const c=chitById(id); if(!c)return;
  openModal('Edit Chit Group',`<div class="form">
    <label class="field-label">Chit name</label><input id="eName" value="${esc(c.name)}" placeholder="Chit name">
    <label class="field-label">Chit value</label><input id="eAmount" type="number" value="${Number(c.amount||0)}" placeholder="Total amount ₹">
    <label class="field-label">Duration</label><input id="eDuration" type="number" value="${Number(c.duration||0)}" placeholder="Duration (months)">
    <label class="field-label">Type</label><select id="eType"><option value="fixed" ${c.type!=='dividend'?'selected':''}>Fixed Chit</option><option value="dividend" ${c.type==='dividend'?'selected':''}>Dividend Chit</option></select>
    <label class="field-label">Commission %</label><input id="eCommission" type="number" value="${Number(c.commission||0)}" placeholder="Commission %">
    <label class="field-label">Next auction date</label><input id="eAuctionDate" type="date" value="${esc(c.nextAuctionDate||'')}">
    <label class="field-label">Auction time</label><input id="eAuctionTime" type="time" value="${esc(c.auctionTime||'')}">
    <button class="btn gold full" onclick="updateChit('${String(id).replace(/'/g,"\'")}')">Save Changes</button>
  </div>`);
}
function updateChit(id){
  const c=chitById(id); if(!c)return;
  const name=document.getElementById('eName').value.trim(), amount=Number(document.getElementById('eAmount').value), duration=Number(document.getElementById('eDuration').value);
  if(!name||!amount||!duration){uiAlert('Please enter chit name, amount and duration.');return;}
  c.name=name; c.amount=amount; c.duration=duration; c.type=document.getElementById('eType').value; c.commission=Number(document.getElementById('eCommission').value||0); c.monthly=amount/duration;
  c.nextAuctionDate=document.getElementById('eAuctionDate').value||''; c.auctionTime=document.getElementById('eAuctionTime').value||''; save();
  logActivity('Record updated','System','MithraQ data was updated.'); closeModal(); render();
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
function newChit(){openModal('Create New Chit',`<div class="form"><input id="fName" placeholder="Chit name"><input id="fAmount" type="number" placeholder="Total amount ₹"><input id="fDuration" type="number" placeholder="Duration (months)"><select id="fType"><option value="fixed">Fixed Chit</option><option value="dividend">Dividend Chit</option></select><input id="fCommission" type="number" placeholder="Commission % (optional)"><label class="field-label">Next auction date (optional)</label><input id="fAuctionDate" type="date"><label class="field-label">Auction time (optional)</label><input id="fAuctionTime" type="time"><button class="btn gold full" onclick="createChit()">Create Chit</button></div>`);}
function createChit(){const name=document.getElementById('fName').value.trim(),amount=Number(document.getElementById('fAmount').value),duration=Number(document.getElementById('fDuration').value),type=document.getElementById('fType').value,commission=Number(document.getElementById('fCommission').value||0),nextAuctionDate=document.getElementById('fAuctionDate').value||'',auctionTime=document.getElementById('fAuctionTime').value||'';if(!name||!amount||!duration)return uiAlert('Please enter chit name, amount and duration.');state.chits.push({id:Date.now(),name,amount,duration,current:0,monthly:amount/duration,type,commission,nextAuctionDate,auctionTime});save();closeModal();render();}
function filterMembers(){const q=(document.getElementById('memberSearch')?.value||'').trim().toLowerCase(),status=document.getElementById('memberStatusFilter')?.value||'all';document.querySelectorAll('.member-row').forEach(el=>{const hay=(el.dataset.search||''),st=el.dataset.status||'active';el.style.display=(!q||hay.includes(q))&&(status==='all'||st===status)?'':'none';});document.querySelectorAll('.member-group-count').forEach(box=>{const group=box.closest('.accordion-body');if(!group)return;const visible=[...group.querySelectorAll('.member-row')].filter(x=>x.style.display!=='none').length;box.textContent=visible+' shown';});}
function members(){if(!state.chits.length)return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">Create a chit group first.</div></div></div><div class="empty big-empty"><div class="empty-icon">♙</div><b>No chit groups available</b><p>Add a chit first. Members will be added <strong>group-wise</strong> only to the chit you select.</p><button class="btn gold" onclick="newChit()">+ Create Chit</button></div>`;return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">${state.members.length} registered members • Chit wise</div></div><div class="member-head-actions"><button class="btn" onclick="exportMembersCSV()">📥 Export</button><button class="btn gold" onclick="newMember()">+ Add</button></div></div>${dataHealthCard()}<div class="member-toolbar"><input id="memberSearch" placeholder="Search member name, phone or ID..." oninput="filterMembers()"><select id="memberStatusFilter" onchange="filterMembers()"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><span class="member-total">${state.members.length} total • ${state.members.filter(m=>m.status!=='inactive').length} active</span></div><div class="accordion-list">${state.chits.map(c=>{const n=membersForChit(c.id).length,cap=Number(c.duration||0),full=cap>0&&n>=cap;return `<div class="accordion-item" id="acc-${c.id}"><div class="accordion-header" onclick="toggleChitAccordion('${String(c.id)}')"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${n}/${cap||'∞'} members${full?' • FULL':''} • Monthly ${money(c.monthly||0)}</div></div><span class="accordion-arrow">▾</span></div><div class="accordion-body"><div class="member-group-count muted">${n} shown</div><div class="list">${groupMemberPanel(c.id)}</div></div></div>`}).join('')}</div>`;}
function toggleChitAccordion(id){const item=document.getElementById('acc-'+id);if(!item)return;const willOpen=!item.classList.contains('open');if(willOpen)document.querySelectorAll('.accordion-item.open').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.toggle('open',willOpen);if(willOpen)item.scrollIntoView({behavior:'smooth',block:'start'});}
function openGroupMembers(id){tab='members';render();setTimeout(()=>{const item=document.getElementById('acc-'+id);if(item){document.querySelectorAll('.accordion-item.open').forEach(x=>{if(x!==item)x.classList.remove('open')});item.classList.add('open');item.scrollIntoView({behavior:'smooth',block:'start'});}},0);}
function newMember(preselect=''){if(!state.chits.length)return uiAlert('Please create a chit group first.');openModal('Add Member — Chit Groups & Details',`<div class="form"><label class="field-label">Chit Group(s) <span>*</span></label><div class="group-checks">${state.chits.map(c=>{const n=membersForChit(c.id).length,cap=Number(c.duration||0),full=cap>0&&n>=cap;return `<label class="group-check"><input type="checkbox" class="mChitCheck" value="${c.id}" ${String(c.id)===String(preselect)?'checked':''} ${full?'disabled':''}><span>${esc(c.name)} • ${c.type==='dividend'?'Dividend':'Fixed'} • ${money(c.monthly||0)}/month • ${n}/${cap||'∞'}${full?' • FULL':''}</span></label>`}).join('')}</div><label class="field-label">Member details</label><input id="mName" placeholder="Member name"><input id="mPhone" type="tel" placeholder="Phone number"><label class="field-label">Member ID (auto generated)</label><input id="mNo" value="${nextMemberNo()}" readonly><input id="mDate" type="date" value="${new Date().toISOString().slice(0,10)}"><input id="mAddress" placeholder="Address"><input id="mNominee" placeholder="Nominee name"><input id="mNomineePhone" type="tel" placeholder="Nominee phone"><input id="mMonthly" type="number" placeholder="Monthly amount ₹ (optional)"><button class="btn gold full" onclick="createMember()">Add Member</button><div class="form-note">One member can now be assigned to multiple chit groups. Existing group-wise behavior is preserved.</div></div>`);}
function createMember(){const checks=[...document.querySelectorAll('.mChitCheck:checked')];if(!checks.length)return uiAlert('Select at least one chit group.');const name=document.getElementById('mName').value.trim();if(!name)return uiAlert('Enter member name.');const phone=document.getElementById('mPhone').value.trim();if(phone&&!waIntlPhone(phone))return uiAlert('Enter a valid 10-digit phone number, or leave it blank.');const memberNo='';if(phone&&state.members.some(x=>String(x.phone||'')===phone))return uiAlert('This phone number is already registered.');if(memberNo&&state.members.some(x=>String(x.memberNo||'')===memberNo))return uiAlert('This member number is already registered.');const selected=checks.map(x=>String(x.value));for(const chitId of selected){const c=chitById(chitId),cap=Number(c?.duration||0);if(!c)continue;if(cap>0&&membersForChit(chitId).length>=cap)return uiAlert(`"${c.name}" is full. Remove it from selection or increase the chit duration.`);}const monthly=Number(document.getElementById('mMonthly').value||0);const autoNo=nextMemberNo();if(!autoNo)return uiAlert('Member ID limit reached (MQ9999).');if(state.members.some(x=>String(x.memberNo||'')===autoNo))return uiAlert('Generated member ID already exists. Please enter another member number.');const m={id:Date.now(),name,phone,memberNo:autoNo,joiningDate:document.getElementById('mDate').value,address:document.getElementById('mAddress').value.trim(),nomineeName:document.getElementById('mNominee').value.trim(),nomineePhone:document.getElementById('mNomineePhone').value.trim(),status:'active',chitIds:selected,monthly,memberships:selected.map(id=>({chitId:id,monthly:Number(monthly||chitById(id)?.monthly||0)}))};state.members.push(m);save();closeModal();tab='members';render();}

function editMember(id){const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;normalizeMember(m);openModal('Edit Member — Groups & Nominee',`<div class="form"><label class="field-label">Member name</label><input id="emName" value="${esc(m.name)}"><label class="field-label">Phone number</label><input id="emPhone" type="tel" value="${esc(m.phone||'')}"><label class="field-label">Member ID (auto)</label><input id="emNo" value="${esc(m.memberNo||'')}" readonly><label class="field-label">Joining date</label><input id="emDate" type="date" value="${esc(m.joiningDate||'')}"><input id="emAddress" placeholder="Address" value="${esc(m.address||'')}"><input id="emNominee" placeholder="Nominee name" value="${esc(m.nomineeName||'')}"><input id="emNomineePhone" type="tel" placeholder="Nominee phone" value="${esc(m.nomineePhone||'')}"><label class="field-label">Member Status</label><select id="emStatus"><option value="active" ${m.status!=='inactive'?'selected':''}>Active</option><option value="inactive" ${m.status==='inactive'?'selected':''}>Inactive</option></select><label class="field-label">Chit Groups</label><div class="group-checks">${state.chits.map(c=>`<label class="group-check"><input type="checkbox" class="emChitCheck" value="${c.id}" ${(m.chitIds||[]).map(String).includes(String(c.id))?'checked':''}><span>${esc(c.name)} • Monthly ${money(c.monthly||0)}</span></label>`).join('')}</div><label class="field-label">Default monthly amount ₹</label><input id="emMonthly" type="number" value="${Number(m.monthly||0)}"><button class="btn gold full" onclick="updateMember('${String(id)}')">Save Changes</button></div>`);}
function updateMember(id){const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;const name=document.getElementById('emName').value.trim();if(!name)return uiAlert('Enter member name.');const phone=document.getElementById('emPhone').value.trim();if(phone&&!waIntlPhone(phone))return uiAlert('Enter a valid 10-digit phone number, or leave it blank.');m.name=name;m.phone=phone;m.memberNo=m.memberNo||nextMemberNo();m.joiningDate=document.getElementById('emDate').value;m.address=document.getElementById('emAddress').value.trim();m.nomineeName=document.getElementById('emNominee').value.trim();m.nomineePhone=document.getElementById('emNomineePhone').value.trim();m.status=document.getElementById('emStatus').value;m.monthly=Number(document.getElementById('emMonthly').value||0);const ids=[...document.querySelectorAll('.emChitCheck:checked')].map(x=>String(x.value));if(!ids.length)return uiAlert('A member must belong to at least one chit group.');m.chitIds=ids;m.memberships=ids.map(chitId=>{const old=(m.memberships||[]).find(x=>String(x.chitId)===String(chitId));return {chitId,monthly:Number(old?.monthly||m.monthly||chitById(chitId)?.monthly||0)}});const backToProfile=String(window.__profileReturnId||'')===String(id);window.__profileReturnId=null;save();closeModal();render();if(backToProfile)member360(id);}
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
  openModal(existing?'Payment Details':'Collect Payment',`<div class="payment-modal"><div class="payment-person"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div><b>${esc(m.name)}</b><div class="muted">${esc(c.name)} • ${month} • Expected ${money(expected)}</div></div></div><div class="form"><label class="field-label">Amount paid</label><input id="pAmount" type="number" value="${existing?Number(existing.amount):expected}"><label class="field-label">Payment date</label><input id="pDate" type="date" value="${existing?esc(existing.date):new Date().toISOString().slice(0,10)}"><label class="field-label">Payment mode</label><select id="pMode"><option ${existing?.mode==='Cash'?'selected':''}>Cash</option><option ${existing?.mode==='UPI'?'selected':''}>UPI</option><option ${existing?.mode==='Bank'?'selected':''}>Bank</option></select><input id="pNote" placeholder="Note (optional)" value="${esc(existing?.note||'')}"><button class="btn gold full" onclick="savePayment('${String(memberId)}','${String(chitId)}','${month}')">${existing?'Update Payment':'Save Payment'}</button>${existing?`<button class="btn full" onclick="printReceipt('${String(existing.id)}')">🧾 Print ${receiptNo(existing)}</button><button class="btn full" onclick="pdfReceipt('${String(existing.id)}')">📄 PDF Receipt</button><button class="btn danger-outline full" onclick="deletePayment('${String(existing.id)}')">⌫ Delete Payment</button>`:''}<button class="btn full" onclick="whatsappPaymentReminder('${String(memberId)}','${String(chitId)}')">💬 WhatsApp Reminder</button></div></div>`);
}
function paymentFor(memberId,month){return state.payments.find(p=>String(p.memberId)===String(memberId)&&p.month===month);}
function receiptNo(p){if(!p)return '—'; if(p.receiptNo)return p.receiptNo; const d=String(p.date||'').replace(/-/g,'').slice(0,6)||'000000'; const idx=state.payments.indexOf(p)+1; return 'MQ-'+d+'-'+String(idx).padStart(4,'0');}
function paymentStatus(p,expected){if(!p)return 'pending';const a=Number(p.amount||0),e=Number(expected||0);return a>=e?'paid':'partial';}
function deletePayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;uiConfirm('Delete receipt '+receiptNo(p)+'? This payment record will be removed.',()=>{state.payments=state.payments.filter(x=>String(x.id)!==String(p.id));logActivity('Payment deleted','Payment',receiptNo(p));closeModal();render();});}
function editPayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));const c=chitById(p.chitId);openModal('Edit Payment',`<div class="payment-person"><div class="avatar">${esc((m?.name||p.member||'?')[0]).toUpperCase()}</div><div><b>${esc(m?.name||p.member||'Member')}</b><div class="muted">${esc(c?.name||p.chit||'')} • ${esc(p.month||'')}</div></div></div><div class="form"><label class="field-label">Amount paid</label><input id="epAmount" type="number" value="${Number(p.amount||0)}"><label class="field-label">Payment date</label><input id="epDate" type="date" value="${esc(p.date||'')}"><label class="field-label">Mode</label><select id="epMode"><option ${p.mode==='Cash'?'selected':''}>Cash</option><option ${p.mode==='UPI'?'selected':''}>UPI</option><option ${p.mode==='Bank'?'selected':''}>Bank</option></select><input id="epNote" placeholder="Note" value="${esc(p.note||'')}"><button class="btn gold full" onclick="updatePayment('${String(id)}')">Save Changes</button><button class="btn danger-outline full" onclick="deletePayment('${String(id)}')">Delete Payment</button></div>`);}
function updatePayment(id){const p=state.payments.find(x=>String(x.id)===String(id));if(!p)return;const amount=Number(document.getElementById('epAmount').value||0);if(amount<=0)return uiAlert('Enter a valid amount.');p.amount=amount;p.date=document.getElementById('epDate').value;p.mode=document.getElementById('epMode').value;p.note=document.getElementById('epNote').value.trim();save();closeModal();render();}
function collection(){if(!state.chits.length)return `<h2 class="page-title">Collection</h2><div class="subtitle">Monthly member payments</div><div class="empty big-empty"><b>Create a chit group first</b><p>Then you can track paid, partial and pending monthly collections.</p><button class="btn gold" onclick="newChit()">+ Create Chit</button></div>`;const c=state.chits[0],month=collectionMonthValue;return `<div class="row"><div><h2 class="page-title">Collection</h2><div class="subtitle">Paid • Partial • Pending</div></div><input class="month-picker" id="collectionMonth" type="month" value="${month}" onchange="setCollectionMonth(this.value)"></div><div class="form collection-filter"><label class="field-label">Chit Group</label><select id="collectionChit" onchange="renderCollectionGroup()">${state.chits.map(x=>`<option value="${x.id}">${esc(x.name)} • ${x.type==='dividend'?'Dividend':'Fixed'}</option>`).join('')}</select></div><div id="collectionGroup">${collectionGroup(c.id,month)}</div><div class="section"><h3>Payment History</h3><span class="muted">${state.payments.length} records</span></div><div class="list">${state.payments.length?state.payments.slice(0,30).map(p=>`<div class="card payment-row"><div style="flex:1"><b>${esc(p.member)}</b><div class="muted">${esc(p.chit)} • ${esc(p.month)} • ${esc(p.date)} • ${esc(p.mode)} • ${receiptNo(p)}</div></div><div style="text-align:right"><b>${money(p.amount)}</b><div><button class="mini-btn" onclick="editPayment('${String(p.id)}')">✎</button> <button class="mini-btn" onclick="printReceipt('${String(p.id)}')">🧾</button> <button class="mini-btn" onclick="pdfReceipt('${String(p.id)}')">📄</button></div></div></div>`).join(''):'<div class="empty">No payment history yet.</div>'}</div>`;}
function setCollectionMonth(value){collectionMonthValue=value||new Date().toISOString().slice(0,7);renderCollectionGroup();}
function collectionGroup(id,month){const c=chitById(id),list=membersForChit(id);if(!c)return '';let paid=0,partial=0,pending=0,total=0,expected=0;list.forEach(m=>{const e=memberMonthly(m,c),p=paymentFor(m.id,month);expected+=e;if(!p)pending++;else if(Number(p.amount||0)>=e)paid++;else partial++;if(p)total+=Number(p.amount||0);});return `<div class="collection-stats"><div class="card"><span>Expected</span><b>${money(expected)}</b></div><div class="card"><span>Collected</span><b>${money(total)}</b></div><div class="card"><span>Balance</span><b>${money(Math.max(0,expected-total))}</b></div></div><div class="collection-summary"><span class="badge active">${paid} PAID</span><span class="badge partial">${partial} PARTIAL</span><span class="badge pending">${pending} PENDING</span></div><div class="payment-list"><div class="section"><h3>Members</h3><span class="muted">${list.length} members</span></div>${list.length?list.map(m=>{const p=paymentFor(m.id,month),e=memberMonthly(m,c),st=paymentStatus(p,e),label=st==='paid'?'PAID':st==='partial'?'PARTIAL':'PENDING';return `<div class="card payment-member"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(m.name)}</b><div class="muted">Expected ${money(e)} ${p?'• Paid '+money(p.amount):''}</div></div><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${label}</span><button class="action-btn ${p?'edit':'collect'}" onclick="collectMember('${String(m.id)}','${String(id)}')">${p?'Edit':'Collect'}</button>${!p?`<button class="mini-btn" onclick="whatsappPaymentReminder('${String(m.id)}','${String(id)}')">💬</button>`:''}</div>`}).join(''):'<div class="empty">No members in this group.</div>'}</div>`;}
function renderCollectionGroup(){const id=document.getElementById('collectionChit').value;document.getElementById('collectionGroup').innerHTML=collectionGroup(id,collectionMonthValue);}
function openModal(title,body){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modal').classList.remove('hidden');}
function closeModal(){window.__profileReturnId=null;document.getElementById('modal').classList.add('hidden');}
window.addEventListener('load',()=>{authUser=getAuth();if(authUser)showApp();else showLogin();});
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
const _localSave=save; save=function(){_localSave(); if(supa) pushToSupabase();};
document.querySelectorAll('.bottom-nav button[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
render();

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
  <div class="backup-grid"><button class="btn gold full" onclick="printMemberStatement('${String(memberId)}')">🖨️ Print Statement</button><button class="btn full" onclick="pdfMemberStatement('${String(memberId)}')">📄 PDF Statement</button></div></div>`);
}
function printReceipt(paymentId){const p=state.payments.find(x=>String(x.id)===String(paymentId));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));const c=chitById(p.chitId);const w=window.open('','_blank','width=520,height=720');if(!w){uiAlert('Please allow pop-ups to print.');return;}w.document.write(`<html><head><title>${receiptNo(p)} - MithraQ</title><style>body{font-family:Arial;padding:28px;color:#24463d;max-width:460px;margin:auto}h1{color:#056b4f;margin-bottom:4px}.box{border:1px solid #ddd;border-radius:12px;padding:14px;margin:15px 0}.r{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee}.total{font-size:24px;font-weight:800;color:#056b4f;margin-top:15px}button{padding:10px 15px;border:0;border-radius:9px;background:#056b4f;color:white}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><div>Payment Receipt</div><div class="box"><div class="r"><span>Receipt</span><b>${receiptNo(p)}</b></div><div class="r"><span>Member</span><b>${esc(m?.name||p.member||'')}</b></div><div class="r"><span>Chit</span><b>${esc(c?.name||p.chit||'')}</b></div><div class="r"><span>Month</span><b>${esc(p.month||'')}</b></div><div class="r"><span>Date</span><b>${esc(p.date||'')}</b></div><div class="r"><span>Mode</span><b>${esc(p.mode||'')}</b></div><div class="total">Paid: ${money(p.amount)}</div></div><button onclick="window.print()">Print Receipt</button></body></html>`);w.document.close();}
function whatsappPaymentReceipt(paymentId){const p=state.payments.find(x=>String(x.id)===String(paymentId));if(!p)return;const m=state.members.find(x=>String(x.id)===String(p.memberId));if(!m?.phone)return uiAlert('Member phone number is missing.');const text=`MithraQ Payment Receipt\n\nReceipt: ${receiptNo(p)}\nMember: ${m.name}\nChit: ${p.chit}\nMonth: ${p.month}\nAmount Paid: ${money(p.amount)}\nDate: ${p.date}\nMode: ${p.mode}`;waOpenOrWarn(m.phone,text);}
function whatsappPaymentReminder(memberId,chitId){
  const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId); if(!m||!c)return;
  const month=collectionMonthValue||new Date().toISOString().slice(0,7),p=paymentFor(memberId,month); if(p){uiAlert('This member is already marked as paid for '+month+'.');return;}
  if(!m.phone){uiAlert('This member does not have a phone number.');return;}
  const text=`MithraQ Payment Reminder\n\nDear ${m.name},\nMonthly chit payment for ${c.name} (${month}) is pending.\nAmount: ${money(m.monthly||c.monthly||0)}\n\nPlease make the payment at your earliest convenience. Thank you.`;
  waOpenOrWarn(m.phone,text);
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
function dashboardMonth(){return new Date().toISOString().slice(0,7);}
function dashboardStats(month=dashboardMonth()){
  const payments=paymentsForMonth(month), collected=payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const expected=expectedForMonth(month), pending=Math.max(0,expected-collected);
  const activeMembers=state.members.filter(m=>m.status!=='inactive').length;
  const activeChits=state.chits.filter(c=>String(c.status||'active').toLowerCase()!=='completed'&&String(c.status||'active').toLowerCase()!=='inactive').length;
  const overdue=pendingRows(month).filter(x=>Number(x.balance)>0).length;
  const modes={Cash:0,UPI:0,Bank:0,Other:0}; payments.forEach(p=>{const k=modes[p.mode]!==undefined?p.mode:'Other';modes[k]+=Number(p.amount||0);});
  const auctions=state.auctions.filter(a=>String(a.createdAt||a.date||'').slice(0,7)===month);
  return {payments,collected,expected,pending,activeMembers,activeChits,overdue,modes,auctions};
}
function dashboardTrend(){
  const now=new Date(), out=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),ym=d.toISOString().slice(0,7),v=monthCollected(ym);out.push({ym,label:d.toLocaleDateString('en-IN',{month:'short'}),value:v});}
  return out;
}
function dashboardMonthPicker(){return `<input class="month-picker" type="month" value="${dashboardMonth()}" onchange="dashboardSelectedMonth=this.value;render()">`;}
let dashboardSelectedMonth=dashboardMonth();
function home(){
  const month=dashboardSelectedMonth||dashboardMonth(), d=dashboardStats(month), recent=dashboardRecent();
  const trend=dashboardTrend(), max=Math.max(1,...trend.map(x=>x.value));
  const trendBars=trend.map(x=>`<div class="dash-bar-col"><div class="dash-bar-value">${x.value?money(x.value):'₹0'}</div><div class="dash-bar" style="height:${Math.max(8,(x.value/max)*120)}px"></div><small>${esc(x.label)}</small></div>`).join('');
  const modeTotal=Object.values(d.modes).reduce((a,b)=>a+b,0)||1;
  const modeRows=Object.entries(d.modes).map(([k,v])=>`<div class="dash-mode"><div><b>${esc(k)}</b><span>${money(v)}</span></div><div class="dash-track"><i style="width:${Math.min(100,v/modeTotal*100)}%"></i></div></div>`).join('');
  const lastAuction=d.auctions.slice().sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')))[0]||state.auctions.slice(-1)[0];
  const pendingTop=pendingRows(month).slice(0,4);
  return `<div class="row dashboard-head"><div><h2 class="page-title">Good day 👋</h2><div class="subtitle">MithraQ • Smart Chit Management</div></div><div>${dashboardMonthPicker()}</div></div>
  ${dataHealthCard()}
  <div class="hero"><small>♛ TOTAL CHIT PORTFOLIO</small><h2>${money(state.chits.reduce((s,c)=>s+Number(c.amount||0),0))}</h2><div class="muted hero-muted">Management overview for ${esc(monthLabel(month))}</div></div>
  <div class="grid dashboard-kpis"><div class="card"><div class="stat-label">COLLECTION</div><div class="stat-value">${money(d.collected)}</div><div class="muted">Expected ${money(d.expected)}</div></div><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(d.pending)}</div><div class="muted">${d.overdue} member(s)</div></div><div class="card"><div class="stat-label">ACTIVE MEMBERS</div><div class="stat-value">${d.activeMembers}</div><div class="muted">${state.members.length} total</div></div><div class="card"><div class="stat-label">ACTIVE CHITS</div><div class="stat-value">${d.activeChits}</div><div class="muted">${state.chits.length} total</div></div></div>
  <div class="dashboard-actions"><button class="dash-action" onclick="tab='collection';render()">₹<span>Payment</span></button><button class="dash-action" onclick="tab='members';render()">♙<span>Member</span></button><button class="dash-action" onclick="tab='auction';render()">♢<span>Auction</span></button><button class="dash-action" onclick="tab='chits';render()">▣<span>Chit</span></button><button class="dash-action" onclick="tab='reminders';render()">🔔<span>Reminders</span></button></div>
  ${upcomingAuctionsCard()}
  <div class="section"><h3>Collection Trend</h3><span class="muted">Last 6 months</span></div><div class="card dash-chart"><div class="dash-bars">${trendBars}</div></div>
  <div class="dashboard-two"><div><div class="section"><h3>Payment Modes</h3><span class="muted">${d.payments.length} records</span></div><div class="card dash-modes">${modeRows}</div></div><div><div class="section"><h3>Latest Auction</h3><span class="muted">${d.auctions.length} this month</span></div><div class="card dash-auction">${lastAuction?`<div class="avatar">🏆</div><div><b>${esc(lastAuction.member||lastAuction.winner||'Winner')}</b><div class="muted">${esc(lastAuction.chit||'Auction')} • ${money(lastAuction.bid||lastAuction.amount||0)}</div></div>`:'<div class="empty">No auction recorded yet.</div>'}</div></div></div>
  <div class="section"><h3>Pending Payments</h3><span class="muted">${money(d.pending)} outstanding</span></div><div class="activity-list">${pendingTop.length?pendingTop.map(x=>`<div class="card activity-row"><div class="activity-icon">₹</div><div style="flex:1"><b>${esc(x.m.name)}</b><div class="muted">${esc(x.c.name)} • Pending ${money(x.balance)}</div></div><button class="mini-btn" onclick="whatsappPendingMember('${x.m.id}','${x.c.id}','${month}')">💬</button></div>`).join(''):'<div class="empty recent">🎉 No pending payments.</div>'}</div>
  <div class="section"><h3>Recent Activity</h3><span class="muted">Latest transactions</span></div><div class="activity-list">${recent.length?recent.map(x=>`<div class="card activity-row"><div class="activity-icon">${x.type==='payment'?'₹':'🔨'}</div><div><b>${esc(x.title)}</b><div class="muted">${esc(x.sub)} • ${esc(x.time)}</div></div></div>`).join(''):'<div class="empty recent">No transactions yet.</div>'}</div>`;
}
function toggleMemberStatus(id){const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;m.status=m.status==='inactive'?'active':'inactive';save();logActivity('Member status changed','Member',`${m.name} marked ${m.status}`);render();}
function exportMembersDetailedCSV(){const rows=[['Member ID','Name','Phone','Status','Joining Date','Monthly','Chits','Total Paid','Payments','Last Payment'],...state.members.map(m=>{const ps=memberPayments(m.id),total=ps.reduce((s,p)=>s+Number(p.amount||0),0),last=ps[0];return[m.memberNo||'',m.name,m.phone||'',m.status==='inactive'?'Inactive':'Active',m.joiningDate||'',m.monthly||'',(m.chitIds||[]).map(id=>chitById(id)?.name||'').join(' | '),total,ps.length,last?.date||''];})];downloadCSV(rows,'mithraq-members-detailed.csv');}
function exportPaymentsCSV(){const rows=[['Receipt No','Member','Phone','Chit','Month','Amount','Date','Mode','Status','Note'],...state.payments.map(p=>{const m=state.members.find(x=>String(x.id)===String(p.memberId));return[receiptNo(p),m?.name||p.member,m?.phone||'',p.chit,p.month,p.amount,p.date,p.mode,p.status||'paid',p.note||''];})];downloadCSV(rows,'mithraq-payments.csv');}
function exportMembersCSV(){exportMembersDetailedCSV();}
function downloadCSV(rows,name){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

/* ===== Professional Phase 6: Pending Dashboard + WhatsApp + Daily/Monthly Reports ===== */
let reportMonthValue=new Date().toISOString().slice(0,7);
function monthLabel(ym){if(!ym)return '';const [y,m]=ym.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
function expectedForMonth(month){return state.members.reduce((sum,m)=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);return sum+memberMonthly(m,c)},0);}
function paymentsForMonth(month){return state.payments.filter(p=>String(p.month||'')===String(month));}
function monthCollected(month){return paymentsForMonth(month).reduce((s,p)=>s+Number(p.amount||0),0);}
function pendingRows(month){return state.members.map(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean);if(!c)return null;const expected=memberMonthly(m,c),p=paymentFor(m.id,month),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return null;return {m,c,p,expected,paid,balance};}).filter(Boolean);}
function whatsappPendingMember(memberId,chitId,month=reportMonthValue){const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);if(!m||!c)return;if(!m.phone)return uiAlert('Phone number is missing for '+(m.name||'this member')+'.');const p=paymentFor(memberId,month),expected=memberMonthly(m,c),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return uiAlert('No pending balance for '+m.name+'.');const text=`MithraQ Payment Reminder\n\nDear ${m.name},\nYour ${c.name} chit payment for ${monthLabel(month)} is pending.\nExpected: ${money(expected)}\nPaid: ${money(paid)}\nPending: ${money(balance)}\n\nPlease make the pending payment at your earliest convenience. Thank you.`;waOpenOrWarn(m.phone,text);}
function whatsappAllPending(month=reportMonthValue){const rows=pendingRows(month);if(!rows.length)return uiAlert('No pending members for '+monthLabel(month)+'.');const valid=rows.filter(x=>waIntlPhone(x.m.phone));if(!valid.length)return uiAlert('No pending member has a valid phone number.');uiConfirm(`Send WhatsApp reminders to ${valid.length} pending member(s)?`,()=>{valid.forEach((x,i)=>setTimeout(()=>whatsappPendingMember(x.m.id,x.c.id,month),i*700));});}
function setReportMonth(v){if(!v)return;reportMonthValue=v;render();}
function dailyReport(month){const ps=paymentsForMonth(month);const byDay={};ps.forEach(p=>{const d=p.date||month+'-01';byDay[d]=(byDay[d]||0)+Number(p.amount||0);});return Object.entries(byDay).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,31);}
function reportData(month){
  const ps=paymentsForMonth(month), rows=pendingRows(month);
  const expected=expectedForMonth(month), collected=monthCollected(month), pending=Math.max(0,expected-collected);
  const modes={Cash:0,UPI:0,Bank:0,Other:0}; ps.forEach(p=>{const k=modes[p.mode]!==undefined?p.mode:'Other';modes[k]+=Number(p.amount||0);});
  const byMember={}; ps.forEach(p=>{const k=String(p.memberId||p.member||'Unknown');byMember[k]=(byMember[k]||0)+Number(p.amount||0);});
  const byChit={}; ps.forEach(p=>{const k=String(p.chitId||p.chit||'Unknown');byChit[k]=(byChit[k]||0)+Number(p.amount||0);});
  const auctions=state.auctions.filter(a=>String(a.createdAt||a.date||'').slice(0,7)===String(month));
  const auctionValue=auctions.reduce((sum,a)=>sum+Number(a.bid||0),0);
  const paidCount=state.members.filter(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean),p=paymentFor(m.id,month);return c&&p&&Number(p.amount||0)>=memberMonthly(m,c);}).length;
  const partialCount=state.members.filter(m=>{const c=(m.chitIds||[]).map(chitById).find(Boolean),p=paymentFor(m.id,month);return c&&p&&Number(p.amount||0)>0&&Number(p.amount||0)<memberMonthly(m,c);}).length;
  return {ps,rows,expected,collected,pending,modes,byMember,byChit,auctions,auctionValue,paidCount,partialCount};
}
function printReports(month){
  const d=reportData(month), w=window.open('','_blank','width=800,height=900'); if(!w)return uiAlert('Please allow pop-ups to print.');
  const memberRows=Object.entries(d.byMember).map(([id,v])=>{const m=state.members.find(x=>String(x.id)===id);return `<tr><td>${esc(m?.name||id)}</td><td>${money(v)}</td></tr>`}).join('');
  const modeRows=Object.entries(d.modes).filter(([,v])=>v>0).map(([k,v])=>`<tr><td>${k}</td><td>${money(v)}</td></tr>`).join('');
  w.document.write(`<html><head><title>MithraQ Report - ${month}</title><style>body{font-family:Arial;padding:28px;color:#24463d}h1{color:#056b4f;margin-bottom:4px}.meta{color:#71817c}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.card{border:1px solid #ddd;border-radius:10px;padding:12px}.card b{display:block;font-size:18px;margin-top:5px;color:#056b4f}table{width:100%;border-collapse:collapse;margin:12px 0 22px}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}button{padding:10px 15px;border:0;border-radius:8px;background:#056b4f;color:#fff}@media print{button{display:none}.cards{grid-template-columns:repeat(4,1fr)}}</style></head><body><h1>MithraQ</h1><h2>Monthly Management Report</h2><div class="meta">${esc(monthLabel(month))}</div><div class="cards"><div class="card">Expected<b>${money(d.expected)}</b></div><div class="card">Collected<b>${money(d.collected)}</b></div><div class="card">Pending<b>${money(d.pending)}</b></div><div class="card">Auction Value<b>${money(d.auctionValue)}</b></div></div><h3>Payment Mode</h3><table><tr><th>Mode</th><th>Amount</th></tr>${modeRows||'<tr><td colspan="2">No payments</td></tr>'}</table><h3>Member Collection</h3><table><tr><th>Member</th><th>Collected</th></tr>${memberRows||'<tr><td colspan="2">No payments</td></tr>'}</table><p>Paid: ${d.paidCount} &nbsp; Partial: ${d.partialCount} &nbsp; Pending members: ${d.rows.length} &nbsp; Payment records: ${d.ps.length}</p><button onclick="window.print()">Print Report</button></body></html>`); w.document.close();
}
function reports(){
  const month=reportMonthValue,d=reportData(month),ps=d.ps,rows=d.rows;
  const modeTotal=Object.values(d.modes).reduce((a,b)=>a+b,0)||1;
  const modeCards=Object.entries(d.modes).filter(([,v])=>v>0).map(([k,v])=>`<div class="card analytics-mode"><div class="stat-label">${esc(k.toUpperCase())}</div><div class="stat-value">${money(v)}</div><div class="analytics-bar"><i style="width:${Math.min(100,(v/modeTotal)*100)}%"></i></div><div class="muted">${((v/modeTotal)*100).toFixed(1)}% of collection</div></div>`).join('');
  const memberTop=Object.entries(d.byMember).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,v])=>{const m=state.members.find(x=>String(x.id)===id);return `<div class="analytics-row"><div class="avatar">${esc((m?.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(m?.name||id)}</b><div class="muted">${esc(m?.memberNo||'')}</div></div><strong>${money(v)}</strong></div>`}).join('');
  const chitTop=Object.entries(d.byChit).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,v])=>{const c=chitById(id);return `<div class="analytics-row"><div class="analytics-icon">▣</div><div style="flex:1"><b>${esc(c?.name||id)}</b></div><strong>${money(v)}</strong></div>`}).join('');
  return `<div class="row"><div><h2 class="page-title">Reports</h2><div class="subtitle">Collection, members, payment modes & auction analytics</div></div><div class="report-head-actions"><button class="btn" onclick="printReports('${month}')">🖨️ Print</button><button class="btn" onclick="pdfMonthlyReport('${month}')">📄 PDF</button><button class="btn reminder-open" onclick="tab='reminders';render()">🔔 Reminders</button><input class="month-picker" type="month" value="${month}" onchange="setReportMonth(this.value)"></div></div>
  <div class="grid analytics-kpis"><div class="card"><div class="stat-label">EXPECTED</div><div class="stat-value">${money(d.expected)}</div></div><div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(d.collected)}</div></div><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(d.pending)}</div></div><div class="card"><div class="stat-label">AUCTION VALUE</div><div class="stat-value">${money(d.auctionValue)}</div></div></div>
  <div class="card analytics-progress"><div class="row"><b>Collection Progress</b><strong>${d.expected?((d.collected/d.expected)*100).toFixed(1):0}%</strong></div><div class="progress"><i style="width:${d.expected?Math.min(100,(d.collected/d.expected)*100):0}%"></i></div><div class="muted">${d.paidCount} fully paid • ${d.partialCount} partial • ${rows.length} pending members</div></div>
  <div class="section"><h3>Payment Mode Breakdown</h3><span class="muted">${ps.length} records</span></div><div class="analytics-grid">${modeCards||'<div class="empty">No payments recorded for this month.</div>'}</div>
  <div class="section"><h3>Top Member Collections</h3><span class="muted">Highest collected amounts</span></div><div class="card analytics-list">${memberTop||'<div class="empty">No member collection data.</div>'}</div>
  <div class="section"><h3>Chit-wise Collection</h3><span class="muted">Collection by chit</span></div><div class="card analytics-list">${chitTop||'<div class="empty">No chit collection data.</div>'}</div>
  <div class="section"><h3>Pending Members</h3><span class="muted">${money(d.pending)} balance</span></div><div class="list pending-list">${rows.length?rows.slice(0,20).map(x=>`<div class="card pending-member-row"><div class="avatar">${esc((x.m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><b>${esc(x.m.name)}</b><div class="muted">${esc(x.c.name)} • Expected ${money(x.expected)} • Paid ${money(x.paid)}</div><strong class="pending-amount">Pending ${money(x.balance)}</strong></div><button class="mini-btn" onclick="whatsappPendingMember('${String(x.m.id)}','${String(x.c.id)}','${month}')">💬</button><button class="action-btn collect" onclick="collectionMonthValue='${month}';collectMember('${String(x.m.id)}','${String(x.c.id)}')">₹ Collect</button></div>`).join(''):'<div class="empty">🎉 No pending payments for this month.</div>'}</div>
  <div class="section"><h3>Auction Summary</h3><span class="muted">${d.auctions.length} auction record(s)</span></div><div class="card report-group"><div class="row"><b>Total auction value</b><strong>${money(d.auctionValue)}</strong></div><div class="muted" style="margin-top:6px">Auction records saved during ${monthLabel(month)}.</div></div>
  <div class="section"><h3>Export</h3></div><div class="report-actions"><button class="btn gold" onclick="exportMonthlyReport('${month}')">⬇️ Collection CSV</button><button class="btn" onclick="exportPendingCSV('${month}')">⬇️ Pending CSV</button></div>`;
}
/* ===== Reminder Center — additive local-storage feature ===== */
function reminderKey(memberId,chitId,month){return String(memberId)+'|'+String(chitId)+'|'+String(month);}
function reminderFor(memberId,chitId,month){return state.reminders.find(r=>r.key===reminderKey(memberId,chitId,month));}
function markReminderSent(memberId,chitId,month){const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);if(!m||!c)return;const key=reminderKey(memberId,chitId,month),now=new Date().toISOString(),old=state.reminders.find(r=>r.key===key);if(old){old.sentAt=now;old.count=Number(old.count||0)+1;}else state.reminders.push({key,memberId:String(memberId),chitId:String(chitId),month,sentAt:now,count:1});logActivity('Reminder sent','System',`${m.name} • ${c.name} • ${monthLabel(month)}`);render();}
function reminderRows(month){return state.members.flatMap(m=>(m.chitIds||[]).map(id=>{const c=chitById(id);if(!c)return null;const expected=memberMonthly(m,c),p=paymentFor(m.id,month),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return null;return {m,c,expected,paid,balance,reminder:reminderFor(m.id,c.id,month)};}).filter(Boolean));}
function sendReminderAndMark(memberId,chitId,month){const m=state.members.find(x=>String(x.id)===String(memberId)),c=chitById(chitId);if(!m||!c)return;if(!m.phone)return uiAlert('This member does not have a phone number.');const p=paymentFor(memberId,month),expected=memberMonthly(m,c),paid=Number(p?.amount||0),balance=Math.max(0,expected-paid);if(balance<=0)return uiAlert('No pending balance for '+m.name+'.');const text=`MithraQ Payment Reminder\n\nDear ${m.name},\nYour ${c.name} chit payment for ${monthLabel(month)} is pending.\nExpected: ${money(expected)}\nPaid: ${money(paid)}\nPending: ${money(balance)}\n\nPlease make the pending payment at your earliest convenience. Thank you.`;if(waOpenOrWarn(m.phone,text))markReminderSent(memberId,chitId,month);}
function reminderSearch(){const month=document.getElementById('reminderMonth')?.value||reportMonthValue,q=(document.getElementById('reminderSearch')?.value||'').trim().toLowerCase(),filter=document.getElementById('reminderFilter')?.value||'all',el=document.getElementById('reminderRows');if(!el)return;let rows=reminderRows(month).filter(x=>{const hay=[x.m.name,x.m.phone,x.m.memberNo,x.c.name].join(' ').toLowerCase();return !q||hay.includes(q);});if(filter==='pending')rows=rows.filter(x=>!x.reminder);if(filter==='reminded')rows=rows.filter(x=>!!x.reminder);if(filter==='no-phone')rows=rows.filter(x=>!x.m.phone);const summary=document.getElementById('reminderSummary');if(summary){const all=reminderRows(month),sent=all.filter(x=>x.reminder).length;summary.innerHTML=`<span>${all.length} pending</span><span>${sent} reminded</span><span>${all.length-sent} not reminded</span>`;}el.innerHTML=rows.length?rows.map(x=>`<div class="card reminder-row"><div class="avatar">${esc((x.m.name||'?')[0]).toUpperCase()}</div><div class="reminder-main"><b>${esc(x.m.name)}</b><div class="muted">${esc(x.c.name)} • ${esc(x.m.phone||'No phone')}</div><div class="reminder-money">Pending ${money(x.balance)} <small>• Expected ${money(x.expected)} • Paid ${money(x.paid)}</small></div>${x.reminder?`<div class="reminder-sent">✓ Reminded ${esc(new Date(x.reminder.sentAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))} • ${Number(x.reminder.count||1)} time(s)</div>`:''}</div><div class="reminder-actions">${x.m.phone?`<button class="action-btn" onclick="sendReminderAndMark('${String(x.m.id)}','${String(x.c.id)}','${month}')">💬 ${x.reminder?'Remind Again':'WhatsApp'}</button>`:'<span class="badge pending">NO PHONE</span>'}<button class="action-btn collect" onclick="collectionMonthValue='${month}';collectMember('${String(x.m.id)}','${String(x.c.id)}')">₹ Collect</button><button class="action-btn" onclick="member360('${String(x.m.id)}')">👤</button></div></div>`).join(''):'<div class="empty">🎉 No matching pending reminders.</div>';}
function reminderSetMonth(v){if(!v)return;reportMonthValue=v;reminderSearch();}
function reminderCenter(){const month=reportMonthValue,all=reminderRows(month),sent=all.filter(x=>x.reminder).length;return `<div class="row"><div><h2 class="page-title">Reminders</h2><div class="subtitle">Track pending member payments and WhatsApp reminders</div></div><input id="reminderMonth" class="month-picker" type="month" value="${month}" onchange="reminderSetMonth(this.value)"></div><div class="grid reminder-stats"><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${all.length}</div></div><div class="card"><div class="stat-label">PENDING AMOUNT</div><div class="stat-value">${money(all.reduce((s,x)=>s+x.balance,0))}</div></div><div class="card"><div class="stat-label">REMINDED</div><div class="stat-value">${sent}</div></div><div class="card"><div class="stat-label">NOT REMINDED</div><div class="stat-value">${all.length-sent}</div></div></div><div class="reminder-toolbar"><input id="reminderSearch" placeholder="Search member, phone or chit..." oninput="reminderSearch()"><select id="reminderFilter" onchange="reminderSearch()"><option value="all">All Pending</option><option value="pending">Not Reminded</option><option value="reminded">Reminded</option><option value="no-phone">No Phone</option></select></div><div id="reminderSummary" class="reminder-summary"><span>${all.length} pending</span><span>${sent} reminded</span><span>${all.length-sent} not reminded</span></div><div class="row reminder-tools"><button class="btn gold" onclick="remindAllCenter('${month}')">💬 Remind All</button><button class="btn" onclick="exportReminderCSV('${month}')">⬇️ CSV</button></div><div id="reminderRows" class="list reminder-list">${all.length?all.map(x=>`<div class="card reminder-row"><div class="avatar">${esc((x.m.name||'?')[0]).toUpperCase()}</div><div class="reminder-main"><b>${esc(x.m.name)}</b><div class="muted">${esc(x.c.name)} • ${esc(x.m.phone||'No phone')}</div><div class="reminder-money">Pending ${money(x.balance)} <small>• Expected ${money(x.expected)} • Paid ${money(x.paid)}</small></div>${x.reminder?`<div class="reminder-sent">✓ Reminded ${esc(new Date(x.reminder.sentAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))} • ${Number(x.reminder.count||1)} time(s)</div>`:''}</div><div class="reminder-actions">${x.m.phone?`<button class="action-btn" onclick="sendReminderAndMark('${String(x.m.id)}','${String(x.c.id)}','${month}')">💬 ${x.reminder?'Remind Again':'WhatsApp'}</button>`:'<span class="badge pending">NO PHONE</span>'}<button class="action-btn collect" onclick="collectionMonthValue='${month}';collectMember('${String(x.m.id)}','${String(x.c.id)}')">₹ Collect</button><button class="action-btn" onclick="member360('${String(x.m.id)}')">👤</button></div></div>`).join(''):'<div class="empty">🎉 No pending payments for this month.</div>'}</div>`;}
function remindAllCenter(month){const rows=reminderRows(month).filter(x=>x.m.phone);if(!rows.length)return uiAlert('No pending members with phone numbers for '+monthLabel(month)+'.');uiConfirm(`Open WhatsApp reminders for ${rows.length} pending member(s)?`,()=>{rows.forEach((x,i)=>setTimeout(()=>sendReminderAndMark(x.m.id,x.c.id,month),i*900));});}
function exportReminderCSV(month){const rows=[['Member','Phone','Chit','Month','Expected','Paid','Pending','Reminder Status','Last Reminded','Times Reminded'],...reminderRows(month).map(x=>[x.m.name,x.m.phone||'',x.c.name,month,x.expected,x.paid,x.balance,x.reminder?'Reminded':'Not Reminded',x.reminder?.sentAt||'',x.reminder?.count||0])];downloadCSV(rows,'mithraq-'+month+'-reminders.csv');}

function exportMonthlyReport(month){const rows=[['Date','Receipt No','Member','Phone','Chit','Amount','Mode','Status'],...paymentsForMonth(month).map(p=>{const m=state.members.find(x=>String(x.id)===String(p.memberId));return[p.date,receiptNo(p),m?.name||p.member,m?.phone||'',p.chit,p.amount,p.mode,p.status||'paid'];})];downloadCSV(rows,'mithraq-'+month+'-collection.csv');}
function exportPendingCSV(month){const rows=[['Member','Phone','Chit','Expected','Paid','Pending','Month'],...pendingRows(month).map(x=>[x.m.name,x.m.phone||'',x.c.name,x.expected,x.paid,x.balance,month])];downloadCSV(rows,'mithraq-'+month+'-pending.csv');}

/* ===== MithraQ Professional Phase 7: Full Auction Room ===== */
let auctionGroupValue='';
let auctionRoundValue=1;
let auctionTimer=null, auctionSeconds=0, auctionRunning=false;
let auctionBids=[];
let auctionLastSubmitted=null;
let auctionPendingWinner=null;
let auctionHistoryFilter='';
let auctionHistoryMonth='';
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
      <div class="row"><div><b class="chit-title">${esc(x.name)}</b><div class="muted">${money(x.amount)} • Monthly ${money(x.monthly)} • ${membersForChit(x.id).length} members${auctionBadgeInline(x)?`<div style="margin-top:6px">${auctionBadgeInline(x)} <span class="muted">${auctionDateText(x)}</span></div>`:''}</div></div><span class="badge active">OPEN →</span></div>
    </button>`).join('')}</div>`;
  }

  const c=chitById(auctionGroupValue);
  if(!c){auctionGroupValue='';return auction();}

  const ms=membersForChit(c.id), allRecords=state.auctions.filter(a=>String(a.chitId)===String(c.id));
  const records=allRecords.filter(a=>(!auctionHistoryFilter||String(a.member||'').toLowerCase().includes(auctionHistoryFilter.toLowerCase())||String(a.bid||'').includes(auctionHistoryFilter))&&(!auctionHistoryMonth||String(a.createdAt||'').slice(0,7)===auctionHistoryMonth));
  const last=auctionLastSubmitted;
  const winnerText=(!auctionRunning&&last)?`<div class="auction-winner-live"><div class="winner-badge">🏆</div><div><span>WINNER — LAST BID</span><b>${esc(last.memberName)} • #${esc(last.memberNo||'—')}</b><strong>${money(last.bid)}</strong></div></div>`:'';
  const bidHistory=auctionBids.length?`<div class="auction-bid-history"><div class="section no-margin"><h4 style="margin:0">Bid History</h4><span class="muted">${auctionBids.length} bid(s)</span></div>${auctionBids.map((b,i)=>`<div class="auction-bid-row"><span>#${i+1}</span><div style="flex:1"><b>${esc(b.memberName)}</b><div class="muted">#${esc(b.memberNo||'—')}</div></div><strong>${money(b.bid)}</strong></div>`).join('')}</div>`:'';

  return `<div class="row"><div><h2 class="page-title">Live</h2><div class="subtitle">${esc(c.name)} • Live bidding</div></div><button class="action-btn" onclick="auctionGroupValue='';auctionRunning=false;clearInterval(auctionTimer);auctionBids=[];auctionLastSubmitted=null;auctionPendingWinner=null;render()">← Chits</button></div>
  <div class="card auction-live-card">
    <div class="section no-margin"><div><h3>${esc(c.name)}</h3><span class="muted">${ms.length} members • ${money(c.amount)} chit value</span></div><span class="live-dot">● LIVE</span></div>
    ${!auctionRunning&&!last&&!auctionPendingWinner?`<div class="live-start-panel"><div class="live-big">LIVE</div><div class="muted">Press START to begin bidding.</div><button class="btn gold full" id="auctionTimerBtn" onclick="startAuctionTimer()">START</button></div>`:''}
    ${auctionRunning?`<div class="form">
      <label class="field-label">Bidder</label>
      <select id="auctionMember">${ms.length?ms.map(m=>`<option value="${String(m.id)}">${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join(''):'<option value="">No members in this group</option>'}</select>
      <label class="field-label">Bid amount ₹</label>
      <div class="bid-submit-row"><input id="bid" type="number" min="1" max="${Number(c.amount||0)}" placeholder="Enter bid amount" onkeydown="if(event.key==='Enter'){event.preventDefault();submitAuctionBid();}"><button class="btn submit-bid-btn" type="button" onclick="submitAuctionBid()">SUBMIT</button></div>
      ${bidHistory}
      <div class="timer-card"><div><span>AUCTION TIME</span><strong id="timer">${String(Math.floor(auctionSeconds/60)).padStart(2,'0')}:${String(auctionSeconds%60).padStart(2,'0')}</strong></div><button class="timer-btn auction-stop-btn" id="auctionTimerBtn" onclick="startAuctionTimer()">STOP</button></div>
    </div>`:''}
    ${!auctionRunning&&last?`<div class="auction-finished-panel">${bidHistory}${winnerText}${auctionPendingWinner?`<div class="auction-confirm-box"><div><b>Winner confirmation required</b><div class="muted">Save this last bid as the official auction result.</div></div><button class="btn gold" onclick="confirmAuctionWinner()">✓ Confirm Winner</button></div>`:''}<div class="auction-ended-label">AUCTION ENDED</div></div>`:''}
  </div>
  <div class="section auction-history-head"><div><h3>Round History</h3><span class="muted">${records.length} of ${allRecords.length} record(s)</span></div><button class="action-btn" onclick="exportAuctionCSV('${String(c.id)}')">⇩ CSV</button></div><div class="auction-filters"><input placeholder="Search winner / bid" value="${esc(auctionHistoryFilter)}" oninput="auctionHistoryFilter=this.value;render()"><input type="month" value="${esc(auctionHistoryMonth)}" onchange="auctionHistoryMonth=this.value;render()"><button class="action-btn" onclick="auctionHistoryFilter='';auctionHistoryMonth='';render()">Clear</button></div>
  <div class="list">${records.length?records.map(a=>auctionRecordHtml(a,c)).join(''):'<div class="empty">No auction records match the current filter.</div>'}</div>`;
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
      <div class="payable-cell"><span>PAYABLE</span><b>${money(fin.payable)}</b></div><div><span>WINNER PAYMENT</span><b>${esc(a.paymentStatus||'Pending')}</b></div>
    </div>
    <div class="auction-due">Due date: <b>${formatDMY(a.dueDate)}</b></div>
    <div class="member-actions"><button class="action-btn edit" onclick="editAuction('${String(a.id)}')">✎ Edit</button><button class="action-btn" onclick="printAuctionReceipt('${String(a.id)}')">🧾 Receipt</button><button class="action-btn" onclick="pdfAuctionReceipt('${String(a.id)}')">📄 PDF</button><button class="action-btn" onclick="whatsappAuctionResult('${String(a.id)}')">💬 Share</button><button class="action-btn delete" onclick="deleteAuction('${String(a.id)}')">⌫ Delete</button></div>
  </div>`;
}
function selectAuctionGroup(id){auctionGroupValue=String(id);auctionRoundValue=1;render();}
function selectAuctionRound(r){auctionRoundValue=Number(r)||1;const el=document.getElementById('roundNo');if(el)el.textContent=auctionRoundValue;document.querySelectorAll('.round-pill').forEach((b,i)=>b.classList.toggle('selected',i+1===auctionRoundValue));}
function startAuctionTimer(){
  const t=document.getElementById('timer'),btn=document.getElementById('auctionTimerBtn');
  if(!btn)return;
  if(!auctionRunning){
    auctionRunning=true; auctionSeconds=0; auctionBids=[]; auctionLastSubmitted=null; auctionPendingWinner=null;
    clearInterval(auctionTimer);
    auctionTimer=setInterval(()=>{auctionSeconds++;const mm=Math.floor(auctionSeconds/60),ss=auctionSeconds%60;const el=document.getElementById('timer');if(el)el.textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');},1000);
    render();
  }else{
    const last=auctionLastSubmitted;
    if(!last)return uiAlert('Submit at least one bid before stopping the auction.');
    auctionRunning=false; clearInterval(auctionTimer); auctionPendingWinner={...last}; render();
  }
}
function confirmAuctionWinner(){
  if(!auctionPendingWinner)return;
  const c=chitById(auctionGroupValue), last=auctionPendingWinner, m=state.members.find(x=>String(x.id)===String(last.memberId));
  if(!c||!m)return uiAlert('Winner details are no longer available.');
  const fin=auctionFinance(c,Number(last.bid));
  const rec={id:Date.now(),chit:c.name,chitId:c.id,member:m.name,memberId:m.id,bid:Number(last.bid),round:'Round '+auctionRoundValue,chitAmount:fin.chitAmount,dividend:fin.discount,auctionDiscount:fin.discount,commissionPct:Number(c.commission||0),commissionAmt:fin.commissionAmt,dividendPool:fin.dividendPool,shareCount:fin.shareCount,monthly:fin.monthly,dividendPerMember:fin.dividendPerMember,payable:fin.payable,paymentStatus:'Pending',dueDate:defaultDueDate(),date:new Date().toLocaleDateString('en-IN'),createdAt:new Date().toISOString(),bidHistory:auctionBids.map(x=>({...x}))};
  advanceAuctionDate(c); state.auctions.unshift(rec); save(); auctionPendingWinner=null; auctionLastSubmitted=null; auctionBids=[]; render(); uiAlert('Winner confirmed and auction result saved.');
}
function previewAuctionDividend(chitId){const c=chitById(chitId)||chitById(auctionGroupValue),el=document.getElementById('auctionDividendPreview');if(!el||!c)return;const bid=Number(document.getElementById('bid')?.value||0);if(!bid){el.innerHTML='<div class="muted">Enter the bid to calculate dividend automatically.</div>';return;}const fin=auctionFinance(c,bid,membersForChit(c.id).length);el.innerHTML=`<div class="row" style="margin:0 0 8px"><b>Automatic Dividend Calculation</b><span class="badge active">${fin.shareCount} SHARES</span></div><div class="muted" style="line-height:1.7">Bid/discount: <b>${money(bid)}</b> · Commission: <b>${money(fin.commissionAmt)}</b><br>Dividend pool: <b>${money(fin.dividendPool)}</b> ÷ ${fin.shareCount} members = <b>${money(fin.dividendPerMember)}</b> per member</div><div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #dfe9e4"><span>Monthly installment</span><b>${money(fin.monthly)}</b></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Payable after dividend</span><b>${money(fin.payable)}</b></div>`;}
function saveAuction(){const c=chitById(auctionGroupValue)||chitById(document.getElementById('auctionChit')?.value),mid=document.getElementById('auctionMember')?.value,bid=Number(document.getElementById('bid')?.value||0);if(!c||!mid||!bid)return uiAlert('Select a member and enter the winning bid amount.');if(bid>Number(c.amount||0))return uiAlert('Bid cannot be greater than the chit value.');const m=state.members.find(x=>String(x.id)===String(mid));if(!m||!membersForChit(c.id).some(x=>String(x.id)===String(mid)))return uiAlert('Selected member does not belong to this chit group.');const dueDate=document.getElementById('dueDate')?.value||defaultDueDate();const fin=auctionFinance(c,bid);const rec={id:Date.now(),chit:c.name,chitId:c.id,member:m.name,memberId:m.id,bid,round:'Round '+auctionRoundValue,chitAmount:fin.chitAmount,dividend:fin.discount,auctionDiscount:fin.discount,commissionPct:Number(c.commission||0),commissionAmt:fin.commissionAmt,dividendPool:fin.dividendPool,shareCount:fin.shareCount,monthly:fin.monthly,dividendPerMember:fin.dividendPerMember,payable:fin.payable,dueDate,date:new Date().toLocaleDateString('en-IN'),createdAt:new Date().toISOString()};advanceAuctionDate(c);state.auctions.unshift(rec);save();clearInterval(auctionTimer);auctionRunning=false;uiAlert('Auction winner saved successfully.');render();}
function editAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId),list=c?membersForChit(c.id):[];openModal('Edit Auction Result',`<div class="form"><label class="field-label">Chit Group</label><select id="eaChit" onchange="renderEditAuctionMembers()">${state.chits.map(x=>`<option value="${String(x.id)}" ${String(x.id)===String(a.chitId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label class="field-label">Winner / Bidder</label><div id="eaMembers"><select id="eaMember">${list.map(m=>`<option value="${String(m.id)}" ${String(m.id)===String(a.memberId)?'selected':''}>${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join('')}</select></div><label class="field-label">Round</label><select id="eaRound">${[1,2,3].map(r=>`<option value="${r}" ${String(a.round||'Round 1')==='Round '+r?'selected':''}>Round ${r}</option>`).join('')}</select><label class="field-label">Winning bid ₹</label><input id="eaBid" type="number" min="1" value="${Number(a.bid||0)}"><label class="field-label">Winner Payment Status</label><select id="eaPayment"><option ${a.paymentStatus==='Pending'?'selected':''}>Pending</option><option ${a.paymentStatus==='Partial'?'selected':''}>Partial</option><option ${a.paymentStatus==='Paid'?'selected':''}>Paid</option></select><label class="field-label">Due Date</label><input id="eaDue" type="date" value="${esc(a.dueDate||defaultDueDate())}"><button class="btn gold full" onclick="updateAuction('${String(id)}')">Save Changes</button></div>`);}
function renderEditAuctionMembers(){const c=chitById(document.getElementById('eaChit')?.value),el=document.getElementById('eaMembers');if(!c||!el)return;el.innerHTML=`<select id="eaMember">${membersForChit(c.id).map(m=>`<option value="${String(m.id)}">${esc(m.name)} • #${esc(m.memberNo||'—')}</option>`).join('')||'<option value="">No members</option>'}</select>`;}
function updateAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(document.getElementById('eaChit')?.value),mid=document.getElementById('eaMember')?.value,bid=Number(document.getElementById('eaBid')?.value||0),r=Number(document.getElementById('eaRound')?.value||1),paymentStatus=document.getElementById('eaPayment')?.value||'Pending',dueDate=document.getElementById('eaDue')?.value||a.dueDate||defaultDueDate();if(!c||!mid||!bid)return uiAlert('Enter all auction details.');if(bid>Number(c.amount||0))return uiAlert('Bid cannot be greater than the chit value.');const m=state.members.find(x=>String(x.id)===String(mid));const fin=auctionFinance(c,bid);a.chit=c.name;a.chitId=c.id;a.member=m?.name||'';a.memberId=mid;a.bid=bid;a.round='Round '+r;a.paymentStatus=paymentStatus;a.dueDate=dueDate;a.chitAmount=fin.chitAmount;a.dividend=fin.discount;a.auctionDiscount=fin.discount;a.commissionPct=Number(c.commission||0);a.commissionAmt=fin.commissionAmt;a.dividendPool=fin.dividendPool;a.shareCount=fin.shareCount;a.monthly=fin.monthly;a.dividendPerMember=fin.dividendPerMember;a.payable=fin.payable;save();closeModal();render();}
function deleteAuction(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;openModal('Delete Auction',`<div class="delete-dialog"><div class="delete-icon">⌫</div><h3>Delete auction result?</h3><p>${esc(a.chit||'')} • ${esc(a.member||'')} • ${money(a.bid)}<br>This auction record will be permanently removed.</p><div class="delete-actions"><button class="btn cancel-btn" onclick="closeModal()">Cancel</button><button class="btn danger full" onclick="confirmDeleteAuction('${String(id)}')">Yes, Delete</button></div></div>`);}
function confirmDeleteAuction(id){state.auctions=state.auctions.filter(a=>String(a.id)!==String(id));save();closeModal();render();}
function exportAuctionCSV(chitId){const rows=[['Date','Round','Winner','Member No','Bid','Chit Amount','Discount','Dividend/Member','Payable','Payment Status','Due Date'],...state.auctions.filter(a=>String(a.chitId)===String(chitId)).map(a=>{const m=state.members.find(x=>String(x.id)===String(a.memberId));return[a.date,a.round||'Round 1',a.member||'',m?.memberNo||'',a.bid,a.chitAmount,a.auctionDiscount,a.dividendPerMember,a.payable,a.paymentStatus||'Pending',a.dueDate||''];})];downloadCSV(rows,'mithraq-auction-history.csv');}
function printAuctionReceipt(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId);const bid=Number(a.bid||0);const hasStored=a.dividendPerMember!=null&&a.payable!=null;const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c||{amount:a.chitAmount},bid);const m=state.members.find(x=>String(x.id)===String(a.memberId));const w=window.open('','_blank','width=520,height=720');if(!w){uiAlert('Please allow pop-ups to print.');return;}w.document.write(`<html><head><title>Auction Receipt - MithraQ</title><style>body{font-family:Arial;padding:28px;color:#24463d;max-width:460px;margin:auto}h1{color:#056b4f}.box{border:1px solid #ddd;border-radius:14px;padding:16px;margin-top:18px}.r{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.total{font-size:22px;font-weight:800;color:#056b4f;margin-top:15px}button{padding:10px 15px;border:0;border-radius:9px;background:#056b4f;color:white}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><div>Auction Winner Receipt</div><div class="box"><div class="r"><span>Group</span><b>${esc(a.chit)}</b></div><div class="r"><span>Chit No</span><b>#${esc(m?.memberNo||'—')}</b></div><div class="r"><span>Winner</span><b>${esc(a.member)}</b></div><div class="r"><span>Round</span><b>${esc(a.round||'Round 1')}</b></div><div class="r"><span>Date</span><b>${esc(a.date||'')}</b></div><div class="r"><span>Chit Amount</span><b>${money(a.chitAmount)}</b></div><div class="r"><span>Auction</span><b>${money(a.bid)}</b></div><div class="r"><span>Divi.</span><b>${money(fin.dividendPerMember)}</b></div><div class="r"><span>Due Date</span><b>${formatDMY(a.dueDate)}</b></div><div class="total">Payable: ${money(fin.payable)}</div></div><button onclick="window.print()">Print Receipt</button></body></html>`);w.document.close();}
function whatsappAuctionResult(id){const a=state.auctions.find(x=>String(x.id)===String(id));if(!a)return;const c=chitById(a.chitId);const bid=Number(a.bid||0);const hasStored=a.dividendPerMember!=null&&a.payable!=null;const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c||{amount:a.chitAmount},bid);const m=state.members.find(x=>String(x.id)===String(a.memberId));if(!m?.phone)return uiAlert('Winner phone number is missing.');const text=`MithraQ Auction Result\n\nGroup: ${a.chit}\nChit No: #${m?.memberNo||'—'}\nWinner: ${a.member}\nRound: ${a.round||'Round 1'}\nChit Amount: ${money(a.chitAmount)}\nAuction: ${money(a.bid)}\nDivi.: ${money(fin.dividendPerMember)}\nPayable: ${money(fin.payable)}\nDue Date: ${formatDMY(a.dueDate)}\nDate: ${a.date}`;waOpenOrWarn(m.phone,text);}

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
    <div class="profile-actions"><button class="btn gold" onclick="window.__profileReturnId='${String(m.id)}';editMember('${String(m.id)}')">✎ Edit</button><button class="btn" onclick="whatsappMember('${String(m.id)}')">💬 WhatsApp</button><button class="btn" onclick="printMemberStatement('${String(m.id)}')">🖨️ Print</button></div>
    <button class="btn full" style="margin:0 0 12px" onclick="openPendingStatement('${String(m.id)}')">📋 Pending Statement (all chits)</button>
    <div class="profile-stats"><div><span>Total Paid</span><b>${money(paid)}</b></div><div><span>Pending Now</span><b>${money(currentDue)}</b></div><div><span>Auctions</span><b>${auc.length}</b></div></div>
    <div class="section"><h3>Chit Groups</h3><span class="muted">${groups.length} groups</span></div>
    <div class="profile-groups">${groups.map(c=>{const monthPayment=paymentFor(m.id,currentMonth);const due=memberMonthly(m,c);const paidThisMonth=Number(monthPayment?.amount||0);const status=paymentStatus(monthPayment,due);const label=status==='paid'?'PAID':status==='partial'?'PARTIAL':'PENDING';return `<div class="profile-group"><div><b>${esc(c.name)}</b><small>${c.type==='dividend'?'Dividend':'Fixed'} • Monthly ${money(due)}</small></div><div class="profile-group-right"><span class="profile-paid">${money(paidThisMonth)} / ${money(due)}</span><span class="badge ${status==='paid'?'active':status==='partial'?'partial':'pending'}">${label}</span></div></div>`}).join('')||'<div class="empty">No groups assigned.</div>'}</div>
    <div class="section"><h3>Collection History</h3><span class="muted">${ps.length} payments</span></div>
    <div class="profile-history">${ps.length?ps.map(p=>{const c=chitById(p.chitId);const e=memberMonthly(m,c);const st=paymentStatus(p,e);return `<div class="profile-row"><div><b>${esc(p.month||'')}</b><div class="muted">${esc(c?.name||p.chit||'')} • ${esc(p.date||'')} • ${esc(p.mode||'')}</div><small>${esc(receiptNo(p))}</small></div><div class="profile-row-right"><strong>${money(p.amount)}</strong><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${st.toUpperCase()}</span><button class="mini-btn" onclick="printReceipt('${String(p.id)}')">🧾</button><button class="mini-btn" onclick="pdfReceipt('${String(p.id)}')">📄</button><button class="mini-btn" onclick="whatsappPaymentReceipt('${String(p.id)}')">💬</button></div></div>`}).join(''):'<div class="empty">No payments recorded.</div>'}</div>
    <div class="section"><h3>Auction History</h3><span class="muted">${auc.length} wins</span></div>
    <div class="profile-history">${auc.length?auc.map(a=>`<div class="profile-row"><div><b>${esc(a.chit||'')}</b><div class="muted">${esc(a.round||'')} • ${esc(a.date||'')}</div></div><div class="profile-row-right"><strong>${money(a.bid)}</strong><span class="muted">Dividend ${money(Math.max(0,Number(a.chitAmount||0)-Number(a.bid||0)))}</span></div></div>`).join(''):'<div class="empty">No auction records.</div>'}</div>
  </div>`);
}
function whatsappMember(memberId){const m=state.members.find(x=>String(x.id)===String(memberId));if(!m?.phone)return uiAlert('Member phone number is missing.');const text=`MithraQ Member Profile\n\nMember: ${m.name}\nMember ID: ${m.memberNo||'—'}\nPhone: ${m.phone}\n\nThank you.`;waOpenOrWarn(m.phone,text);}
function groupMemberPanel(id){
  const c=chitById(id); if(!c)return '<div class="empty">Chit group not found.</div>';
  const list=membersForChit(id),month=new Date().toISOString().slice(0,7);
  return list.length?list.map(m=>{const p=paymentFor(m.id,month),e=memberMonthly(m,c),st=paymentStatus(p,e),label=st==='paid'?'PAID':st==='partial'?'PARTIAL':'PENDING',active=m.status!=='inactive';return `<div class="card member-row member ${active?'':'member-inactive'}" data-status="${active?'active':'inactive'}" data-search="${esc([m.name,m.phone,m.memberNo].join(' ').toLowerCase())}"><div class="avatar">${esc((m.name||'?')[0]).toUpperCase()}</div><div style="flex:1"><div class="chit-title">${esc(m.name)}</div><div class="muted">${esc(m.phone||'No phone')} • Member #${esc(m.memberNo||'—')}</div><div class="muted">Joined ${esc(m.joiningDate||'—')} • Monthly ${money(e)} • ${active?'Active':'Inactive'}</div><div class="member-actions"><button class="action-btn collect" onclick="collectMember('${String(m.id)}','${String(c.id)}')">${p?'✓ Payment':'₹ Collect'}</button><button class="action-btn edit" onclick="editMember('${String(m.id)}')">✎ Edit</button><button class="action-btn" onclick="toggleMemberStatus('${String(m.id)}')">${active?'⏸ Inactive':'▶ Active'}</button><button class="action-btn" onclick="member360('${String(m.id)}')">👤 Profile</button><button class="action-btn" onclick="memberStatement('${String(m.id)}')">📋 Statement</button><button class="action-btn" onclick="whatsappMember('${String(m.id)}')">💬 WhatsApp</button><button class="action-btn delete" onclick="deleteMember('${String(m.id)}')">⌫ Delete</button></div></div><span class="badge ${st==='paid'?'active':st==='partial'?'partial':'pending'}">${label}</span></div>`}).join(''):'<div class="empty big-empty"><div class="empty-icon">♙</div><b>No members in this group</b><p>Add members to start collection and auction management.</p><button class="btn gold" onclick="newMember()">+ Add Member</button></div>';
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

/* ===== MithraQ Backup & Restore Center v1 ===== */
const BACKUP_AUTO_KEY='mithraq_auto_backup_v1';
const BACKUP_SNAPSHOT_KEY='mithraq_auto_snapshot_v1';
function backupRecordCounts(){return {members:state.members.length,chits:state.chits.length,payments:state.payments.length,auctions:state.auctions.length,reminders:(state.reminders||[]).length};}
function backupPayload(){return {app:'MithraQ',version:6,exportedAt:new Date().toISOString(),data:state};}
function backupValidateData(d){if(!d||typeof d!=='object')return {ok:false,msg:'Backup is not a valid object.'};for(const k of ['chits','members','auctions','payments','reminders'])if(k in d&&!Array.isArray(d[k]))return {ok:false,msg:`Backup field "${k}" is invalid.`};if(!Array.isArray(d.chits)||!Array.isArray(d.members))return {ok:false,msg:'Required member/chit data is missing.'};return {ok:true,msg:'Backup structure looks valid.'};}
function backupDownloadJSON(){const payload=backupPayload(),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mithraq-backup-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backupSnapshotNow(){try{localStorage.setItem(BACKUP_SNAPSHOT_KEY,JSON.stringify(backupPayload()));localStorage.setItem(BACKUP_SNAPSHOT_KEY+'_time',new Date().toISOString());return true}catch(e){return false}}
function backupAutoEnabled(){return localStorage.getItem(BACKUP_AUTO_KEY)==='1'}
function setAutoBackup(enabled){localStorage.setItem(BACKUP_AUTO_KEY,enabled?'1':'0');if(enabled)backupSnapshotNow();render();}
const _backupSave=save; save=function(){_backupSave();if(backupAutoEnabled())backupSnapshotNow();};
function restoreSnapshot(){const raw=localStorage.getItem(BACKUP_SNAPSHOT_KEY);if(!raw)return uiAlert('No automatic backup snapshot is available yet.');try{const x=JSON.parse(raw),d=x.data||x,v=backupValidateData(d);if(!v.ok)return uiAlert(v.msg);uiConfirm('Restore the latest automatic backup? Current data will be replaced.',()=>{state={chits:d.chits||[],members:d.members||[],auctions:d.auctions||[],payments:d.payments||[],reminders:d.reminders||[]};state.members.forEach(normalizeMember);_backupSave();uiAlert('Automatic backup restored successfully.');tab='home';render();});}catch(e){uiAlert('Automatic backup snapshot is corrupted.');}}
function clearAllMithraQData(){uiConfirm('Clear all MithraQ business data from this browser? A downloadable backup is recommended first.',()=>{backupDownloadJSON();setTimeout(()=>uiConfirm('Final confirmation: permanently clear members, chits, payments, auctions and reminders on this device?',()=>{state={chits:[],members:[],auctions:[],payments:[],reminders:[]};_backupSave();localStorage.removeItem(BACKUP_SNAPSHOT_KEY);localStorage.removeItem(BACKUP_SNAPSHOT_KEY+'_time');uiAlert('All business data was cleared from this device.');tab='home';render();}),250);});}
function backupCenter(){const c=backupRecordCounts(),snapTime=localStorage.getItem(BACKUP_SNAPSHOT_KEY+'_time'),auto=backupAutoEnabled();return `<div class="card backup-center"><div class="row"><div><h3 style="margin:0">💾 Backup & Restore Center</h3><div class="muted">Protect your MithraQ data on this device.</div></div><span class="badge ${auto?'active':'pending'}">${auto?'AUTO ON':'AUTO OFF'}</span></div><div class="backup-count-grid"><div><b>${c.members}</b><span>Members</span></div><div><b>${c.chits}</b><span>Chits</span></div><div><b>${c.payments}</b><span>Payments</span></div><div><b>${c.auctions}</b><span>Auctions</span></div><div><b>${c.reminders}</b><span>Reminders</span></div></div><div class="backup-actions"><button class="btn gold" onclick="backupDownloadJSON()">⬇️ Download JSON Backup</button><button class="btn" onclick="restoreSnapshot()">↩️ Restore Auto Backup</button><button class="btn" onclick="backupSnapshotNow();uiAlert('Automatic snapshot created successfully.');render()">📸 Create Snapshot</button><button class="btn" onclick="document.getElementById('restoreFile')?.click()">📤 Restore JSON File</button></div><label class="backup-toggle"><input type="checkbox" ${auto?'checked':''} onchange="setAutoBackup(this.checked)"><span><b>Automatic local snapshot</b><small>Keep the latest backup inside this browser after data changes.</small></span></label><div class="backup-meta"><span>Latest snapshot: <b>${snapTime?new Date(snapTime).toLocaleString('en-IN'):'Not created'}</b></span><span>Storage: <b>Local Storage</b></span></div><button class="btn danger-outline full" onclick="clearAllMithraQData()">🗑️ Clear All Business Data</button></div>`}
const _backupSettings=settingsPanel; settingsPanel=function(){return _backupSettings()+backupCenter();};

/* ===== MithraQ Chit Closure / Maturity Final Settlement Report ===== */
let closureChitId='';
function openClosureReport(id){closureChitId=String(id);tab='closure';render();}
function chitContributionRows(chitId){
  const c=chitById(chitId); if(!c)return [];
  return membersForChit(chitId).map(m=>{
    const paid=state.payments.filter(p=>String(p.memberId)===String(m.id)&&String(p.chitId)===String(chitId)).reduce((s,p)=>s+Number(p.amount||0),0);
    const won=state.auctions.filter(a=>String(a.memberId)===String(m.id)&&String(a.chitId)===String(chitId));
    const dividendReceived=won.reduce((s,a)=>s+Number(a.dividendPerMember||0),0);
    const monthsExpected=Number(c.duration||0);
    const expectedTotal=memberMonthly(m,c)*monthsExpected;
    const balance=Math.max(0,expectedTotal-paid);
    return {m,paid,dividendReceived,expectedTotal,balance,wonAuction:won.length>0};
  });
}
function closureSummary(chitId){
  const c=chitById(chitId); const rows=chitContributionRows(chitId);
  const totalCollected=rows.reduce((s,r)=>s+r.paid,0);
  const totalExpected=rows.reduce((s,r)=>s+r.expectedTotal,0);
  const totalPending=rows.reduce((s,r)=>s+r.balance,0);
  const totalDividends=rows.reduce((s,r)=>s+r.dividendReceived,0);
  const auctions=state.auctions.filter(a=>String(a.chitId)===String(chitId));
  const totalCommission=auctions.reduce((s,a)=>s+Number(c?.amount||0)*Number(c?.commission||0)/100,0);
  return {c,rows,totalCollected,totalExpected,totalPending,totalDividends,auctionsCount:auctions.length,totalCommission};
}
function closureReport(){
  if(!state.chits.length)return `<h2 class="page-title">📑 Settlement</h2><div class="subtitle">Chit closure / maturity final settlement</div><div class="empty big-empty">No chits available yet.</div>`;
  if(!closureChitId||!chitById(closureChitId))closureChitId=String(state.chits[0].id);
  const s=closureSummary(closureChitId), c=s.c, closed=c.status==='completed', rows=s.rows;
  return `<div class="row"><div><h2 class="page-title">📑 Settlement</h2><div class="subtitle">Chit closure / maturity final settlement</div></div><select class="month-picker" onchange="closureChitId=this.value;render()">${state.chits.map(x=>`<option value="${x.id}" ${String(x.id)===String(closureChitId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
  <div class="card"><div class="row"><div><h3 style="margin:0">${esc(c.name)}</h3><div class="muted">${money(c.amount)} total · ${c.duration||0} months · ${c.type==='dividend'?'Dividend':'Fixed'}${c.commission?` · ${c.commission}% commission`:''}</div></div><span class="badge ${closed?'pending':'active'}">${closed?'CLOSED':'RUNNING'}</span></div>${closed&&c.closedAt?`<div class="muted" style="margin-top:6px">Closed on ${esc(new Date(c.closedAt).toLocaleDateString('en-IN'))}</div>`:''}</div>
  <div class="grid analytics-kpis"><div class="card"><div class="stat-label">EXPECTED TOTAL</div><div class="stat-value">${money(s.totalExpected)}</div></div><div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(s.totalCollected)}</div></div><div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(s.totalPending)}</div></div><div class="card"><div class="stat-label">DIVIDENDS PAID</div><div class="stat-value">${money(s.totalDividends)}</div></div></div>
  <div class="card"><div class="row"><b>Auction rounds held</b><strong>${s.auctionsCount} / ${c.duration||0}</strong></div><div class="row" style="margin-top:8px"><b>Foreman commission earned</b><strong>${money(s.totalCommission)}</strong></div></div>
  <div class="section"><h3>Member-wise Settlement</h3><span class="muted">${rows.length} members</span></div>
  <div class="list">${rows.length?rows.map(r=>`<div class="card statement-row" style="display:grid;grid-template-columns:1fr auto;gap:6px"><div><b>${esc(r.m.name)}</b><div class="muted">Paid ${money(r.paid)} of ${money(r.expectedTotal)}${r.wonAuction?' • Won auction':''}${r.dividendReceived?' • Dividend '+money(r.dividendReceived):''}</div></div><div style="text-align:right">${r.balance>0?`<strong class="pending-amount">Due ${money(r.balance)}</strong>`:'<span class="badge active">SETTLED</span>'}</div></div>`).join(''):'<div class="empty">No members in this chit.</div>'}</div>
  <div class="section"><h3>Export & Actions</h3></div>
  <div class="report-actions"><button class="btn" onclick="printClosureReport('${c.id}')">🖨️ Print</button><button class="btn" onclick="pdfClosureReport('${c.id}')">📄 PDF</button></div>
  <button class="btn ${closed?'':'gold'} full" style="margin-top:10px" onclick="${closed?`reopenChit('${c.id}')`:`markChitClosed('${c.id}')`}">${closed?'↩️ Reopen Chit':'✅ Mark Chit as Closed (Final Settlement)'}</button>`;
}
function markChitClosed(id){
  const c=chitById(id); if(!c)return;
  const s=closureSummary(id);
  const msg=s.totalPending>0?`${s.rows.filter(r=>r.balance>0).length} member(s) still have a pending balance of ${money(s.totalPending)}. Close the chit anyway?`:'Close this chit and record the final settlement?';
  uiConfirm(msg,()=>{
    c.status='completed'; c.closedAt=new Date().toISOString();
    save(); logActivity('Chit closed','System',`"${c.name}" was marked as closed (final settlement).`);
    render();
  },null,'Close Chit');
}
function reopenChit(id){
  const c=chitById(id); if(!c)return;
  uiConfirm('Reopen this chit for further collections and auctions?',()=>{
    delete c.status; delete c.closedAt; save(); logActivity('Chit reopened','System',`"${c.name}" was reopened.`); render();
  });
}
function printClosureReport(chitId){
  const s=closureSummary(chitId),c=s.c; if(!c)return;
  const w=window.open('','_blank','width=800,height=900'); if(!w){uiAlert('Please allow pop-ups to print.');return;}
  const rowsHtml=s.rows.map(r=>`<tr><td>${esc(r.m.name)}</td><td>${money(r.expectedTotal)}</td><td>${money(r.paid)}</td><td>${money(r.dividendReceived)}</td><td>${money(r.balance)}</td></tr>`).join('');
  w.document.write(`<html><head><title>${esc(c.name)} Settlement - MithraQ</title><style>body{font-family:Arial;padding:28px;color:#24463d}h1{color:#056b4f;margin-bottom:4px}.meta{color:#71817c}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.card{border:1px solid #ddd;border-radius:10px;padding:12px}.card b{display:block;font-size:18px;margin-top:5px;color:#056b4f}table{width:100%;border-collapse:collapse;margin:12px 0 22px}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}button{padding:10px 15px;border:0;border-radius:8px;background:#056b4f;color:#fff}@media print{button{display:none}}</style></head><body><h1>MithraQ</h1><h2>Chit Closure / Final Settlement Report</h2><div class="meta">${esc(c.name)} • ${money(c.amount)} • ${c.duration||0} months</div><div class="cards"><div class="card">Expected<b>${money(s.totalExpected)}</b></div><div class="card">Collected<b>${money(s.totalCollected)}</b></div><div class="card">Pending<b>${money(s.totalPending)}</b></div><div class="card">Dividends Paid<b>${money(s.totalDividends)}</b></div></div><table><tr><th>Member</th><th>Expected</th><th>Paid</th><th>Dividend</th><th>Balance</th></tr>${rowsHtml||'<tr><td colspan="5">No members</td></tr>'}</table><button onclick="window.print()">Print Report</button></body></html>`); w.document.close();
}

/* ===== MithraQ PDF Export (receipts, statements, reports) ===== */
function pdfMoney(n){return 'Rs. '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});}
function ensureJsPDF(){
  if(!window.jspdf||!window.jspdf.jsPDF){uiAlert('PDF library failed to load. Check your internet connection and try again.');return null;}
  return window.jspdf.jsPDF;
}
function pdfKeyValueBlock(doc,rows,startY){
  let y=startY;
  rows.forEach(([k,v])=>{doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(36,70,61);doc.text(String(k),40,y);doc.setFont('helvetica','bold');doc.text(String(v),320,y,{align:'right'});y+=22;});
  return y;
}
function pdfReceipt(paymentId){
  const JsPDF=ensureJsPDF(); if(!JsPDF)return;
  const p=state.payments.find(x=>String(x.id)===String(paymentId)); if(!p)return;
  const m=state.members.find(x=>String(x.id)===String(p.memberId)); const c=chitById(p.chitId);
  const doc=new JsPDF({unit:'pt',format:[360,520]});
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(5,107,79); doc.text('MithraQ',40,40);
  doc.setFontSize(11); doc.setTextColor(90,90,90); doc.text('Payment Receipt',40,58);
  doc.setDrawColor(220); doc.line(40,68,320,68);
  const y=pdfKeyValueBlock(doc,[['Receipt',receiptNo(p)],['Member',m?.name||p.member||''],['Chit',c?.name||p.chit||''],['Month',p.month||''],['Date',p.date||''],['Mode',p.mode||'']],92);
  doc.setDrawColor(220); doc.line(40,y,320,y);
  doc.setFontSize(16); doc.setTextColor(5,107,79); doc.text('Paid: '+pdfMoney(p.amount),40,y+28);
  doc.save('MithraQ-'+receiptNo(p)+'.pdf');
}
function pdfAuctionReceipt(id){
  const JsPDF=ensureJsPDF(); if(!JsPDF)return;
  const a=state.auctions.find(x=>String(x.id)===String(id)); if(!a)return;
  const c=chitById(a.chitId); const bid=Number(a.bid||0);
  const hasStored=a.dividendPerMember!=null&&a.payable!=null;
  const fin=hasStored?{dividendPerMember:Number(a.dividendPerMember||0),payable:Number(a.payable||0)}:auctionFinance(c||{amount:a.chitAmount},bid);
  const m=state.members.find(x=>String(x.id)===String(a.memberId));
  const doc=new JsPDF({unit:'pt',format:[360,560]});
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(5,107,79); doc.text('MithraQ',40,40);
  doc.setFontSize(11); doc.setTextColor(90,90,90); doc.text('Auction Winner Receipt',40,58);
  doc.setDrawColor(220); doc.line(40,68,320,68);
  const y=pdfKeyValueBlock(doc,[['Group',a.chit||c?.name||''],['Chit No','#'+(m?.memberNo||'—')],['Winner',a.member||''],['Round',a.round||'Round 1'],['Date',a.date||''],['Chit Amount',pdfMoney(a.chitAmount)],['Auction Bid',pdfMoney(a.bid)],['Dividend',pdfMoney(fin.dividendPerMember)],['Due Date',formatDMY(a.dueDate)]],92);
  doc.setDrawColor(220); doc.line(40,y,320,y);
  doc.setFontSize(16); doc.setTextColor(5,107,79); doc.text('Payable: '+pdfMoney(fin.payable),40,y+28);
  doc.save('MithraQ-Auction-'+(m?.memberNo||id)+'.pdf');
}
function pdfMemberStatement(memberId){
  const JsPDF=ensureJsPDF(); if(!JsPDF)return;
  const m=state.members.find(x=>String(x.id)===String(memberId)); if(!m)return;
  const ps=memberPayments(memberId), total=ps.reduce((s,p)=>s+Number(p.amount||0),0);
  const doc=new JsPDF();
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(5,107,79); doc.text('MithraQ',40,40);
  doc.setFontSize(13); doc.setTextColor(60,60,60); doc.text('Member Statement',40,60);
  doc.setFontSize(11); doc.text(`${m.name}  •  ${m.phone||''}  •  Member #${m.memberNo||'—'}`,40,78);
  doc.autoTable({startY:92,head:[['Month','Date','Mode','Amount']],body:ps.length?ps.map(p=>[p.month||'',p.date||'',p.mode||'',pdfMoney(p.amount)]):[['No payments recorded','','','']],styles:{fontSize:9},headStyles:{fillColor:[5,107,79]}});
  const finalY=(doc.lastAutoTable&&doc.lastAutoTable.finalY)||100;
  doc.setFontSize(13); doc.setTextColor(5,107,79); doc.text('Total Paid: '+pdfMoney(total),40,finalY+24);
  doc.save('MithraQ-Statement-'+(m.memberNo||m.id)+'.pdf');
}
function pdfMonthlyReport(month){
  const JsPDF=ensureJsPDF(); if(!JsPDF)return;
  const d=reportData(month);
  const doc=new JsPDF();
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(5,107,79); doc.text('MithraQ',40,40);
  doc.setFontSize(13); doc.setTextColor(60,60,60); doc.text('Monthly Management Report',40,60);
  doc.setFontSize(11); doc.text(monthLabel(month),40,78);
  doc.autoTable({startY:92,head:[['Metric','Amount']],body:[['Expected',pdfMoney(d.expected)],['Collected',pdfMoney(d.collected)],['Pending',pdfMoney(d.pending)],['Auction Value',pdfMoney(d.auctionValue)]],styles:{fontSize:10},headStyles:{fillColor:[5,107,79]}});
  let y=((doc.lastAutoTable&&doc.lastAutoTable.finalY)||100)+22;
  doc.setFontSize(12); doc.setTextColor(5,107,79); doc.text('Member Collections',40,y);
  const memberRows=Object.entries(d.byMember).map(([id,v])=>{const mm=state.members.find(x=>String(x.id)===id);return [mm?.name||id,pdfMoney(v)];});
  doc.autoTable({startY:y+8,head:[['Member','Collected']],body:memberRows.length?memberRows:[['No payments','']],styles:{fontSize:9},headStyles:{fillColor:[5,107,79]}});
  doc.save('MithraQ-Report-'+month+'.pdf');
}
function pdfClosureReport(chitId){
  const JsPDF=ensureJsPDF(); if(!JsPDF)return;
  const s=closureSummary(chitId),c=s.c; if(!c)return;
  const doc=new JsPDF();
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(5,107,79); doc.text('MithraQ',40,40);
  doc.setFontSize(13); doc.setTextColor(60,60,60); doc.text('Chit Closure / Final Settlement Report',40,60);
  doc.setFontSize(11); doc.text(`${c.name}  •  ${pdfMoney(c.amount)}  •  ${c.duration||0} months`,40,78);
  doc.autoTable({startY:92,head:[['Metric','Amount']],body:[['Expected Total',pdfMoney(s.totalExpected)],['Collected',pdfMoney(s.totalCollected)],['Pending',pdfMoney(s.totalPending)],['Dividends Paid',pdfMoney(s.totalDividends)],['Commission Earned',pdfMoney(s.totalCommission)]],styles:{fontSize:10},headStyles:{fillColor:[5,107,79]}});
  let y=((doc.lastAutoTable&&doc.lastAutoTable.finalY)||100)+22;
  doc.setFontSize(12); doc.setTextColor(5,107,79); doc.text('Member-wise Settlement',40,y);
  doc.autoTable({startY:y+8,head:[['Member','Expected','Paid','Dividend','Balance']],body:s.rows.length?s.rows.map(r=>[r.m.name,pdfMoney(r.expectedTotal),pdfMoney(r.paid),pdfMoney(r.dividendReceived),pdfMoney(r.balance)]):[['No members','','','','']],styles:{fontSize:9},headStyles:{fillColor:[5,107,79]}});
  doc.save('MithraQ-Settlement-'+String(c.name).replace(/\s+/g,'-')+'.pdf');
}

/* ===== MithraQ Secure Admin & App Lock 2.0 ===== */
const PIN_KEY='mithraq_admin_pin_v2';
const SESSION_UNLOCK_KEY='mithraq_session_unlocked_v1';
const LOCK_MINUTES=5;
let pinUnlocked=false, lockTimer=null;
async function pinHash(text){return authHash(text)}
function getPin(){try{return JSON.parse(localStorage.getItem(PIN_KEY)||'null')}catch(e){return null}}
function secureLayer(){let el=document.getElementById('pinRoot');if(!el){el=document.createElement('div');el.id='pinRoot';document.body.appendChild(el)}return el}
function pinScreen(mode='lock'){
  const el=secureLayer(); el.className='pin-screen';
  const first=mode==='setup';
  el.innerHTML=`<div class="pin-card"><div class="pin-logo">♛</div><h1>${first?'Secure MithraQ':'MithraQ Locked'}</h1><p>${first?'Create a 4–6 digit PIN for quick app access.':'Enter your admin PIN to continue.'}</p><input id="pinInput" class="pin-input" inputmode="numeric" maxlength="6" type="password" placeholder="PIN" autofocus><input id="pinConfirm" class="pin-input ${first?'':'pin-hidden'}" inputmode="numeric" maxlength="6" type="password" placeholder="Confirm PIN"><div id="pinError" class="pin-error"></div><button class="btn gold full" onclick="submitPin('${mode}')">${first?'Set PIN':'Unlock'}</button>${first?'<div class="pin-note">You can change this PIN later from Settings.</div>':'<button class="pin-forgot" onclick="pinForgot()">Forgot PIN?</button>'}</div>`;
  setTimeout(()=>document.getElementById('pinInput')?.focus(),50);
}
async function submitPin(mode){
  const p=(document.getElementById('pinInput')?.value||'').trim(), c=(document.getElementById('pinConfirm')?.value||'').trim(), err=document.getElementById('pinError');
  if(!/^\d{4,6}$/.test(p)){err.textContent='PIN must contain 4 to 6 digits.';return}
  if(mode==='setup'){
    if(p!==c){err.textContent='PINs do not match.';return}
    localStorage.setItem(PIN_KEY,JSON.stringify({hash:await pinHash(p),updatedAt:new Date().toISOString()}));
  }else{const saved=getPin();if(!saved||await pinHash(p)!==saved.hash){err.textContent='Incorrect PIN.';return}}
  pinUnlocked=true;secureLayer().className='pin-screen hidden';try{sessionStorage.setItem(SESSION_UNLOCK_KEY,'1');}catch(e){}startAutoLock();render();
}
function startAutoLock(){clearTimeout(lockTimer);lockTimer=setTimeout(()=>lockApp(),LOCK_MINUTES*60*1000)}
function touchAutoLock(){if(pinUnlocked)startAutoLock()}
function lockApp(){if(!authUser)return;pinUnlocked=false;try{sessionStorage.removeItem(SESSION_UNLOCK_KEY);}catch(e){}clearTimeout(lockTimer);pinScreen('lock')}
function pinForgot(){uiAlert('For security, reset the PIN by logging out and recreating the local admin account. Your stored app data is kept separately.','PIN Help')}
function changeAdminPin(){
  if(!authUser||!pinUnlocked)return;
  openModal('Change Admin PIN',`<div class="form"><input id="oldPin" class="pin-input" inputmode="numeric" maxlength="6" type="password" placeholder="Current PIN"><input id="newPin" class="pin-input" inputmode="numeric" maxlength="6" type="password" placeholder="New 4–6 digit PIN"><input id="newPin2" class="pin-input" inputmode="numeric" maxlength="6" type="password" placeholder="Confirm new PIN"><div id="changePinErr" class="auth-error"></div><button class="btn gold full" onclick="saveAdminPin()">Save PIN</button></div>`);
}
async function saveAdminPin(){const o=document.getElementById('oldPin')?.value||'',n=document.getElementById('newPin')?.value||'',n2=document.getElementById('newPin2')?.value||'',e=document.getElementById('changePinErr'),s=getPin();if(!s||await pinHash(o)!==s.hash){e.textContent='Current PIN is incorrect.';return}if(!/^\d{4,6}$/.test(n)){e.textContent='New PIN must contain 4 to 6 digits.';return}if(n!==n2){e.textContent='New PINs do not match.';return}localStorage.setItem(PIN_KEY,JSON.stringify({hash:await pinHash(n),updatedAt:new Date().toISOString()}));closeModal();uiAlert('Admin PIN changed successfully.','Security');}
function securitySettingsCard(){return `<div class="card security-card"><div><h3>🔐 App Security</h3><div class="muted">PIN lock • Auto-lock after ${LOCK_MINUTES} minutes</div></div><div class="security-actions"><button class="btn" onclick="changeAdminPin()">Change PIN</button><button class="btn gold" onclick="lockApp()">Lock Now</button></div></div>`}
const _oldRenderSettings=settingsPanel;
settingsPanel=function(){return dataHealthCard()+_oldRenderSettings()+securitySettingsCard()};
const _oldShowApp=showApp;
showApp=function(){
  document.querySelector('.app').classList.remove('locked');document.body.classList.remove('auth-mode');document.getElementById('authRoot').innerHTML='';
  const p=getPin();
  if(!p){pinUnlocked=false;pinScreen('setup');return}
  let alreadyUnlocked=false; try{alreadyUnlocked=sessionStorage.getItem(SESSION_UNLOCK_KEY)==='1';}catch(e){}
  if(alreadyUnlocked){
    // Same browser session (e.g. a page refresh) — stay unlocked instead of asking for the PIN again.
    pinUnlocked=true;const pr=document.getElementById('pinRoot');if(pr)pr.className='pin-screen hidden';startAutoLock();render();return;
  }
  pinUnlocked=false;pinScreen('lock');
}
const _oldShowLogin=showLogin;
showLogin=function(){authUser=null;pinUnlocked=false;try{sessionStorage.removeItem(SESSION_UNLOCK_KEY);}catch(e){}clearTimeout(lockTimer);const pr=document.getElementById('pinRoot');if(pr)pr.remove();_oldShowLogin()}
const _oldRender=render;
render=function(){if(!pinUnlocked)return;_oldRender()}
document.addEventListener('click',touchAutoLock,{passive:true});document.addEventListener('keydown',touchAutoLock,{passive:true});
window.addEventListener('popstate',(e)=>{
  const st=e.state;
  if(st&&st.mithraqTab&&pinUnlocked){
    __navPopping=true;
    tab=st.mithraqTab;
    __navHistoryTab=tab;
    render();
    __navPopping=false;
  }
});

/* ===== Phase 11: Next Auction Date + Reminders ===== */
function auctionDaysLeft(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;
  const [y,m,d]=iso.split('-').map(Number),t=new Date();
  return Math.round((new Date(y,m-1,d)-new Date(t.getFullYear(),t.getMonth(),t.getDate()))/86400000);
}
function fmtTime12(t){
  const [h,m]=String(t||'').split(':').map(Number);
  if(isNaN(h))return '';
  return ((h%12)||12)+':'+String(m||0).padStart(2,'0')+' '+(h>=12?'PM':'AM');
}
function auctionDateText(c){
  return formatDMY(c.nextAuctionDate)+(c.auctionTime?' at '+fmtTime12(c.auctionTime):'');
}
function auctionBadgeInline(c){
  const n=auctionDaysLeft(c.nextAuctionDate);
  if(n===null)return '';
  const txt=n<0?`Auction date passed (${-n}d ago)`:n===0?'Auction TODAY':n===1?'Auction tomorrow':`Auction in ${n} days`;
  const cls=n<0?'pending':n<=3?'partial':'active';
  return `<span class="badge ${cls}">${txt}</span>`;
}
function auctionLineHTML(c){
  if(!c.nextAuctionDate)return `<div class="auction-line"><span class="muted">No next auction date set</span></div>`;
  return `<div class="auction-line">${auctionBadgeInline(c)}<span class="muted">${auctionDateText(c)}</span><button class="small-link" type="button" onclick="openAuctionReminder('${String(c.id)}')">💬 Remind members →</button></div>`;
}
function upcomingAuctionsCard(){
  const list=state.chits.map(c=>({c,n:auctionDaysLeft(c.nextAuctionDate)})).filter(x=>x.n!==null&&x.n<=7&&x.n>=-3&&x.c.status!=='completed').sort((a,b)=>a.n-b.n);
  if(!list.length)return '';
  return `<div class="section"><h3>Upcoming Auctions</h3><span class="muted">Next 7 days</span></div><div class="list">${list.map(({c})=>`<div class="card upcoming-auction"><div style="flex:1"><b>${esc(c.name)}</b><div class="muted">${auctionDateText(c)}</div></div>${auctionBadgeInline(c)}<button class="mini-btn" type="button" onclick="openAuctionReminder('${String(c.id)}')">💬</button></div>`).join('')}</div>`;
}
function advanceAuctionDate(c){
  if(!c||!/^\d{4}-\d{2}-\d{2}$/.test(String(c.nextAuctionDate||'')))return;
  const [y,m,d]=c.nextAuctionDate.split('-').map(Number);
  const last=new Date(y,m+1,0).getDate();
  const nd=new Date(y,m,Math.min(d,last));
  c.lastAuctionDate=c.nextAuctionDate;
  c.nextAuctionDate=nd.getFullYear()+'-'+String(nd.getMonth()+1).padStart(2,'0')+'-'+String(nd.getDate()).padStart(2,'0');
}
function auctionReminderText(c,m){
  return `MithraQ Auction Reminder\n\nDear ${m.name},\nYour ${c.name} chit auction is on ${auctionDateText(c)}.\nMonthly amount: ${money(memberMonthly(m,c))}\n\nPlease be available. Thank you.`;
}
function openAuctionReminder(chitId){
  const c=chitById(chitId);if(!c)return;
  if(!c.nextAuctionDate)return uiAlert('Set a next auction date for this chit first (Chits → ✎ Edit).');
  const sent=(c.auctionReminded&&c.auctionReminded.date===c.nextAuctionDate)?c.auctionReminded.ids.map(String):[];
  const list=membersForChit(c.id).filter(m=>m.status!=='inactive');
  openModal('Auction Reminder',`<div class="form"><div class="card" style="margin:0"><b>${esc(c.name)}</b><div class="muted">Auction: ${auctionDateText(c)}</div></div>
    <div class="muted" style="margin:4px 0">Tap 💬 to open WhatsApp for each member.</div>
    <div class="list">${list.length?list.map(m=>{const ok=!!waIntlPhone(m.phone),done=sent.includes(String(m.id));return `<div class="card row" style="margin:0"><div style="flex:1"><b>${esc(m.name)}</b><div class="muted">${esc(m.phone||'No phone')}${ok?'':' • invalid'}</div></div>${done?'<span class="badge active">SENT</span>':''}<button class="mini-btn" type="button" ${ok?'':'disabled'} onclick="sendAuctionReminder('${String(c.id)}','${String(m.id)}')">💬</button></div>`}).join(''):'<div class="empty">No active members in this chit.</div>'}</div></div>`);
}
function sendAuctionReminder(chitId,memberId){
  const c=chitById(chitId),m=state.members.find(x=>String(x.id)===String(memberId));if(!c||!m)return;
  if(!waOpenOrWarn(m.phone,auctionReminderText(c,m)))return;
  if(!c.auctionReminded||c.auctionReminded.date!==c.nextAuctionDate)c.auctionReminded={date:c.nextAuctionDate,ids:[]};
  if(!c.auctionReminded.ids.map(String).includes(String(m.id)))c.auctionReminded.ids.push(String(m.id));
  save();
  setTimeout(()=>openAuctionReminder(chitId),300);
}

/* ===== Phase 11: Member-wise Pending Statement (all chits) ===== */
function paymentForChit(memberId,chitId,month){
  return state.payments.find(p=>String(p.memberId)===String(memberId)&&p.month===month&&(!p.chitId||String(p.chitId)===String(chitId)));
}
function monthRange(startYM,endYM){
  const out=[];let [y,m]=startYM.split('-').map(Number);const [ey,em]=endYM.split('-').map(Number);
  while((y<ey||(y===ey&&m<=em))&&out.length<120){out.push(y+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++;}}
  return out;
}
function memberDuesData(memberId,month,includePrev){
  const m=state.members.find(x=>String(x.id)===String(memberId));if(!m)return null;
  const rows=[];let total=0;
  (m.chitIds||[]).map(chitById).filter(c=>c&&c.status!=='completed').forEach(c=>{
    const monthly=memberMonthly(m,c);
    let months=[month];
    if(includePrev){
      const join=String(m.joiningDate||'').slice(0,7);
      const start=(/^\d{4}-\d{2}$/.test(join)&&join<month)?join:month;
      months=monthRange(start,month);
      const cap=Number(c.duration||0);if(cap>0&&months.length>cap)months=months.slice(-cap);
    }
    const items=[];
    months.forEach(mo=>{const p=paymentForChit(m.id,c.id,mo),paid=Number(p?.amount||0),bal=Math.max(0,monthly-paid);if(bal>0)items.push({month:mo,expected:monthly,paid,balance:bal});});
    const sub=items.reduce((s,x)=>s+x.balance,0);total+=sub;
    rows.push({c,monthly,items,sub});
  });
  return {m,month,rows,total};
}
function memberDuesText(d){
  let t=`MithraQ Pending Statement\n\nDear ${d.m.name} (Member ID ${d.m.memberNo||'—'}),\nPending as of ${monthLabel(d.month)}:\n`;
  d.rows.forEach(r=>{
    if(!r.items.length)return;
    t+=`\n${r.c.name} — ${money(r.sub)}\n`;
    r.items.forEach(x=>{t+=`  • ${monthLabel(x.month)}: ${money(x.balance)}`+(x.paid>0?` (paid ${money(x.paid)} of ${money(x.expected)})`:'')+`\n`;});
  });
  t+=`\nTotal Pending: ${money(d.total)}\n\nPlease pay at your earliest convenience. Thank you.`;
  return t;
}
function psOptions(){
  return {month:document.getElementById('psMonth')?.value||new Date().toISOString().slice(0,7),prev:document.getElementById('psPrev')?document.getElementById('psPrev').checked:true};
}
function openPendingStatement(memberId){
  const m=state.members.find(x=>String(x.id)===String(memberId));if(!m)return;
  openModal('Pending Statement',`<div class="form"><div class="card" style="margin:0"><b>${esc(m.name)}</b><div class="muted">Member ${esc(m.memberNo||'—')} • ${esc(m.phone||'No phone')}</div></div>
    <label class="field-label">Pending as of month</label><input id="psMonth" type="month" value="${new Date().toISOString().slice(0,7)}" onchange="renderPendingStatement('${String(m.id)}')">
    <label class="group-check"><input id="psPrev" type="checkbox" checked onchange="renderPendingStatement('${String(m.id)}')"><span>Include earlier months' dues (from joining date)</span></label>
    <div id="psBody"></div>
    <div class="profile-actions" style="grid-template-columns:1fr 1fr"><button class="btn" type="button" onclick="whatsappPendingStatement('${String(m.id)}')">💬 WhatsApp</button><button class="btn gold" type="button" onclick="pdfPendingStatement('${String(m.id)}')">📄 PDF</button></div>
    <button class="btn full" type="button" onclick="member360('${String(m.id)}')">← Back to Profile</button></div>`);
  renderPendingStatement(memberId);
}
function renderPendingStatement(memberId){
  const el=document.getElementById('psBody');if(!el)return;
  const o=psOptions(),d=memberDuesData(memberId,o.month,o.prev);if(!d){el.innerHTML='';return;}
  const rows=d.rows.filter(r=>r.items.length);
  el.innerHTML=rows.length?rows.map(r=>`<div class="card" style="margin:8px 0"><div class="row"><b>${esc(r.c.name)}</b><b>${money(r.sub)}</b></div>${r.items.map(x=>`<div class="row muted"><span>${esc(monthLabel(x.month))}${x.paid>0?' (partial)':''}</span><span>${money(x.balance)}</span></div>`).join('')}</div>`).join('')+`<div class="card" style="margin:8px 0;background:#fff7e0"><div class="row"><b>Total Pending</b><b>${money(d.total)}</b></div></div>`:'<div class="empty">No pending dues 🎉</div>';
}
function whatsappPendingStatement(memberId){
  const o=psOptions(),d=memberDuesData(memberId,o.month,o.prev);if(!d)return;
  if(d.total<=0)return uiAlert('No pending dues for '+d.m.name+'.');
  if(!d.m.phone)return uiAlert('Member phone number is missing.');
  waOpenOrWarn(d.m.phone,memberDuesText(d));
}
function pdfPendingStatement(memberId){
  const JsPDF=ensureJsPDF();if(!JsPDF)return;
  const o=psOptions(),d=memberDuesData(memberId,o.month,o.prev);if(!d)return;
  const doc=new JsPDF();
  doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(5,107,79);doc.text('MithraQ',40,40);
  doc.setFontSize(13);doc.setTextColor(60,60,60);doc.text('Pending Statement — '+monthLabel(d.month),40,60);
  doc.setFontSize(11);doc.text(`${d.m.name}  •  ${d.m.phone||''}  •  Member ${d.m.memberNo||'—'}`,40,78);
  const body=[];d.rows.forEach(r=>r.items.forEach(x=>body.push([r.c.name,monthLabel(x.month),pdfMoney(x.expected),pdfMoney(x.paid),pdfMoney(x.balance)])));
  doc.autoTable({startY:92,head:[['Chit','Month','Expected','Paid','Pending']],body:body.length?body:[['No pending dues','','','','']],styles:{fontSize:9},headStyles:{fillColor:[5,107,79]}});
  const y=(doc.lastAutoTable&&doc.lastAutoTable.finalY)||100;
  doc.setFontSize(13);doc.setTextColor(5,107,79);doc.text('Total Pending: '+pdfMoney(d.total),40,y+24);
  doc.save('MithraQ-Pending-'+(d.m.memberNo||d.m.id)+'.pdf');
}
