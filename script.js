const KEY="mithraq_v1";
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
  chits:[],
  members:[],
  auctions:[],
  payments:[]
};
let tab="home";

function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN");}
function render(){
  const app=document.getElementById("app");
  const total=state.chits.reduce((s,c)=>s+Number(c.amount||0),0);
  const collected=state.payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const pending=Math.max(0,total-collected);
  if(tab==="home") app.innerHTML=home(total,collected,pending);
  if(tab==="chits") app.innerHTML=chits();
  if(tab==="members") app.innerHTML=members();
  if(tab==="auction") app.innerHTML=auction();
  if(tab==="reports") app.innerHTML=reports();
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
}
function home(total,collected,pending){
 return `<h2 class="page-title">Dashboard</h2><div class="subtitle">Welcome to MithraQ</div>
 <div class="hero"><small>Total Chit Value</small><h2>${money(total)}</h2><div class="muted" style="color:#c9d0df">Manage your chits, members and auctions in one place.</div></div>
 <div class="grid">
  <div class="card"><div class="stat-label">ACTIVE CHITS</div><div class="stat-value">${state.chits.length}</div></div>
  <div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${state.members.length}</div></div>
  <div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(collected)}</div></div>
  <div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(pending)}</div></div>
 </div>
 <div class="section"><h3>Quick Actions</h3></div>
 <div class="grid"><button class="btn gold" onclick="tab='chits';render()">+ New Chit</button><button class="btn" onclick="tab='members';render()">+ Member</button></div>`;
}
function chits(){
 return `<div class="row"><div><h2 class="page-title">Chits</h2><div class="subtitle">Your chit groups</div></div><button class="btn gold" onclick="newChit()">+ New</button></div>
 <div class="list">${state.chits.length?state.chits.map(c=>`<div class="card"><div class="row"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${money(c.amount)} · ${c.duration||0} months</div></div><span class="badge active">ACTIVE</span></div><div class="progress"><i style="width:${Math.min(100,(c.current||0)/(c.duration||1)*100)}%"></i></div><div class="muted">Monthly ${money(c.monthly||0)} · ${c.current||0}/${c.duration||0} months</div></div>`).join(""):'<div class="empty">No chits yet.<br><br><button class="btn gold" onclick="newChit()">Create your first chit</button></div>'}</div>`;
}
function newChit(){
 const name=prompt("Chit name"); if(!name)return;
 const amount=Number(prompt("Total chit amount (₹)","100000")||0);
 const duration=Number(prompt("Duration in months","20")||0);
 state.chits.push({id:Date.now(),name,amount,duration,current:0,monthly:duration?amount/duration:0});
 save();render();
}
function members(){
 return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">${state.members.length} members</div></div><button class="btn gold" onclick="newMember()">+ Add</button></div>
 <div class="list">${state.members.length?state.members.map(m=>`<div class="card member"><div class="avatar">${esc(m.name[0]||"?").toUpperCase()}</div><div style="flex:1"><div class="chit-title">${esc(m.name)}</div><div class="muted">${esc(m.phone||"No phone")}</div></div><span class="badge active">ACTIVE</span></div>`).join(""):'<div class="empty">No members yet.</div>'}</div>`;
}
function newMember(){
 const name=prompt("Member name"); if(!name)return;
 const phone=prompt("Phone number",""); state.members.push({id:Date.now(),name,phone});save();render();
}
function auction(){
 return `<h2 class="page-title">Auction</h2><div class="subtitle">Auction room & history</div>
 <div class="card"><div class="section" style="margin-top:0"><h3>New Auction</h3></div>
 <div class="form"><select id="auctionChit" style="padding:12px;border:1px solid var(--border);border-radius:11px">${state.chits.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
 <input id="bid" type="number" placeholder="Winning bid ₹"><button class="btn gold" onclick="saveAuction()">Save Auction</button></div></div>
 <div class="section"><h3>Auction History</h3></div><div class="list">${state.auctions.map(a=>`<div class="card row"><div><b>${esc(a.chit)}</b><div class="muted">${a.date}</div></div><b>${money(a.bid)}</b></div>`).join("")||'<div class="empty">No auctions recorded.</div>'}</div>`;
}
function saveAuction(){const s=document.getElementById("auctionChit");const c=state.chits.find(x=>x.id==s?.value);const bid=Number(document.getElementById("bid").value||0);if(!c||!bid)return alert("Select a chit and enter bid amount.");state.auctions.unshift({id:Date.now(),chit:c.name,bid,date:new Date().toLocaleDateString("en-IN")});save();render();}
function reports(){
 const collected=state.payments.reduce((s,p)=>s+Number(p.amount||0),0);
 return `<h2 class="page-title">Reports</h2><div class="subtitle">Business overview</div><div class="grid">
 <div class="card"><div class="stat-label">CHITS</div><div class="stat-value">${state.chits.length}</div></div>
 <div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${state.members.length}</div></div>
 <div class="card"><div class="stat-label">COLLECTION</div><div class="stat-value">${money(collected)}</div></div>
 <div class="card"><div class="stat-label">AUCTIONS</div><div class="stat-value">${state.auctions.length}</div></div></div>
 <div class="card"><b>Ledger Summary</b><div class="section"><span class="muted">Total payments</span><strong>${money(collected)}</strong></div><div class="section"><span class="muted">Auction records</span><strong>${state.auctions.length}</strong></div></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
render();
