const KEY="mithraq_v2";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{
  chits:[],members:[],auctions:[],payments:[],dividends:[]
};
let tab="home";

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
state.chits.forEach(c=>{if(!c.type)c.type="fixed";if(!c.memberCount)c.memberCount=0;});
state.dividends=Array.isArray(state.dividends)?state.dividends:[];

function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0})}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function sum(a,k){return a.reduce((x,y)=>x+Number(y[k]||0),0)}

function render(){
  const app=document.getElementById("app");
  if(tab==="home") app.innerHTML=home();
  if(tab==="chits") app.innerHTML=chits();
  if(tab==="members") app.innerHTML=members();
  if(tab==="auction") app.innerHTML=auction();
  if(tab==="reports") app.innerHTML=reports();
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
}

function home(){
 const total=sum(state.chits,"amount"), collected=sum(state.payments,"amount");
 const pending=Math.max(0,total-collected);
 return `<h2 class="page-title">Good day 👋</h2><div class="subtitle">MithraQ • Smart Chit Management</div>
 <div class="hero"><span class="leaf-accent" style="right:12px;bottom:-6px">❧</span><small>♕ TOTAL CHIT PORTFOLIO</small><h2>${money(total)}</h2><div class="muted">Track collections, members, auctions and dividends from one place.</div></div>
 <div class="grid">
  <div class="card"><div class="stat-label">ACTIVE CHITS</div><div class="stat-value">${state.chits.length}</div></div>
  <div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${state.members.length}</div></div>
  <div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(collected)}</div></div>
  <div class="card"><div class="stat-label">PENDING</div><div class="stat-value">${money(pending)}</div></div>
 </div>
 <div class="section"><h3>Quick Actions</h3><span class="muted">Together We Grow</span></div>
 <div class="quick-grid">
  <button class="quick" onclick="newChit()"><b>＋</b>New Chit</button>
  <button class="quick" onclick="newMember()"><b>♙</b>Member</button>
  <button class="quick" onclick="openPayment()"><b>₹</b>Collection</button>
 </div>
 <div class="section"><h3>Recent Activity</h3></div>
 <div class="card table-card">
  ${state.payments.slice(-4).reverse().map(p=>`<div class="tx"><div><b>${esc(p.member||"Collection")}</b><div class="muted">${esc(p.date||"Today")}</div></div><span class="positive">+${money(p.amount)}</span></div>`).join("")||'<div class="empty">No transactions yet.</div>'}
 </div>`;
}

function chits(){
 return `<div class="row"><div><h2 class="page-title">Chit Groups</h2><div class="subtitle">Manage every chit in one view</div></div><button class="btn gold" onclick="newChit()">+ New</button></div>
 ${state.chits.length?`<div class="list">${state.chits.map(c=>{
   const pct=Math.min(100,Number(c.current||0)/Math.max(1,Number(c.duration||1))*100);
   return `<div class="card" onclick="chitDetail(${c.id})">
    <div class="row"><div><div class="chit-title">${esc(c.name)}</div><div class="muted">${money(c.amount)} • ${c.duration||0} months • ${c.memberCount||"—"} members</div></div><span class="badge ${c.type==="dividend"?"pending":"active"}">${c.type==="dividend"?"DIVIDEND":"FIXED"}</span></div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="row"><span class="muted">Month ${c.current||0}/${c.duration||0}</span><span class="chip">${money(c.monthly)}/month</span></div>
   </div>`}).join("")}</div>`:'<div class="empty">No chit groups yet.<br><br><button class="btn gold" onclick="newChit()">Create First Chit</button></div>'}`;
}
function newChit(){
 showModal("Create New Chit",`<div class="form">
 <input id="fName" placeholder="Chit name">
 <select id="fType" onchange="toggleChitTypeFields()">
   <option value="fixed">🔒 Fixed Chit</option>
   <option value="dividend">🌿 Dividend Chit</option>
 </select>
 <input id="fAmount" type="number" placeholder="Total chit amount ₹">
 <input id="fMembers" type="number" placeholder="Number of members">
 <input id="fDuration" type="number" placeholder="Duration (months)">
 <input id="fMonthly" type="number" placeholder="Monthly amount ₹ (optional)">
 <input id="fCommission" type="number" placeholder="Commission % (optional)">
 <div id="chitTypeHint" class="muted" style="padding:4px 2px">Fixed Chit: monthly amount stays fixed.</div>
 <button class="btn gold" onclick="createChit()">Create Chit</button></div>`);
}
function toggleChitTypeFields(){
 const type=document.getElementById("fType")?.value;
 const hint=document.getElementById("chitTypeHint");
 if(hint) hint.textContent=type==="dividend"
   ?"Dividend Chit: Auction discount − commission = dividend pool, then divide among members."
   :"Fixed Chit: monthly amount stays fixed; no dividend calculation.";
}
function createChit(){
 const name=document.getElementById("fName").value.trim();
 const type=document.getElementById("fType").value;
 const amount=Number(document.getElementById("fAmount").value);
 const members=Number(document.getElementById("fMembers").value||0);
 const duration=Number(document.getElementById("fDuration").value);
 const monthlyInput=Number(document.getElementById("fMonthly").value||0);
 const commission=Number(document.getElementById("fCommission").value||0);
 if(!name||!amount||!duration)return alert("Please fill name, total amount and duration.");
 if(type==="dividend"&&!members)return alert("Enter number of members for Dividend Chit.");
 const monthly=monthlyInput||amount/duration;
 state.chits.push({
   id:Date.now(),name,type,amount,duration,current:0,monthly,
   memberCount:members,commission
 });
 save();closeModal();render();
}
function chitDetail(id){
 const c=state.chits.find(x=>x.id===id); if(!c)return;
 const type=c.type||"fixed";
 showModal(c.name,`<div class="metric"><span>Chit Type</span><b>${type==="dividend"?"🌿 Dividend":"🔒 Fixed"}</b></div>
 <div class="metric"><span>Total Chit</span><b>${money(c.amount)}</b></div>
 <div class="metric"><span>Members</span><b>${c.memberCount||"—"}</b></div>
 <div class="metric"><span>Monthly</span><b>${money(c.monthly)}</b></div>
 <div class="metric"><span>Duration</span><b>${c.duration} months</b></div>
 <div class="metric"><span>Current Month</span><b>${c.current||0}</b></div>
 <div class="metric"><span>Commission</span><b>${c.commission||0}%</b></div>
 ${type==="dividend"?'<div class="muted" style="padding:8px 2px">Auction discount − commission = dividend pool. Dividend per member = pool ÷ members.</div>': '<div class="muted" style="padding:8px 2px">Fixed chit: no dividend distribution.</div>'}
 <button class="btn gold" style="width:100%;margin-top:12px" onclick="advanceChit(${id})">Mark Next Month</button>`);
}
function advanceChit(id){const c=state.chits.find(x=>x.id===id);if(c)c.current=Math.min(c.duration,(c.current||0)+1);save();closeModal();render()}

function members(){
 return `<div class="row"><div><h2 class="page-title">Members</h2><div class="subtitle">${state.members.length} registered members</div></div><button class="btn gold" onclick="newMember()">+ Add</button></div>
 <input class="search" id="memberSearch" placeholder="Search members..." oninput="filterMembers()">
 <div id="memberList" class="list">${memberCards(state.members)}</div>`;
}
function memberCards(list){
 return list.length?list.map(m=>`<div class="card member"><div class="avatar">${esc((m.name||"?")[0]).toUpperCase()}</div><div style="flex:1"><div class="chit-title">${esc(m.name)}</div><div class="muted">${esc(m.phone||"No phone")} • Member #${m.no||"—"}</div></div><span class="badge active">ACTIVE</span></div>`).join(""):'<div class="empty">No members found.</div>';
}
function filterMembers(){const q=document.getElementById("memberSearch").value.toLowerCase();document.getElementById("memberList").innerHTML=memberCards(state.members.filter(m=>(m.name+" "+m.phone).toLowerCase().includes(q)))}
function newMember(){
 showModal("Add Member",`<div class="form"><input id="mName" placeholder="Full name"><input id="mPhone" placeholder="Phone number"><input id="mNo" placeholder="Member number"><button class="btn gold" onclick="createMember()">Save Member</button></div>`);
}
function createMember(){const name=document.getElementById("mName").value.trim();if(!name)return alert("Enter member name.");state.members.push({id:Date.now(),name,phone:document.getElementById("mPhone").value,no:document.getElementById("mNo").value});save();closeModal();render()}

function auction(){
 return `<div class="row"><div><h2 class="page-title">Auction Room</h2><div class="subtitle">Record winning bids & calculate dividend</div></div></div>
 <div class="card"><div class="section" style="margin-top:0"><h3>Live Auction Entry</h3><span class="badge pending">READY</span></div>
 <div class="form">
 <select id="auctionChit" onchange="updateAuctionPreview()">${state.chits.map(c=>`<option value="${c.id}">${esc(c.name)} • ${c.type==="dividend"?"Dividend":"Fixed"}</option>`).join("")||'<option value="">Create a chit first</option>'}</select>
 <input id="bid" type="number" placeholder="Auction discount / winning bid ₹" oninput="updateAuctionPreview()">
 <select id="winner">${state.members.map(m=>`<option>${esc(m.name)}</option>`).join("")||'<option>No members</option>'}</select>
 <div id="auctionPreview" class="metric"><span>Dividend</span><b>—</b></div>
 <button class="btn gold" onclick="saveAuction()">Confirm Winner</button></div></div>
 <div class="section"><h3>Auction History</h3></div>
 <div class="list">${state.auctions.map(a=>`<div class="card"><div class="row"><div><b>${esc(a.chit)}</b><div class="muted">${esc(a.type||"Fixed")} • Winner: ${esc(a.winner)} • ${esc(a.date)}</div>${a.type==="dividend"?`<div class="muted">Discount ${money(a.bid)} • Commission ${money(a.commissionAmount)} • Dividend/member ${money(a.dividendPerMember)}</div>`:""}</div><b>${money(a.bid)}</b></div></div>`).join("")||'<div class="empty">No auctions recorded.</div>'}</div>`;
}
function auctionCalc(){
 const sel=document.getElementById("auctionChit");
 const c=state.chits.find(x=>x.id==sel?.value);
 const bid=Number(document.getElementById("bid")?.value||0);
 if(!c||!bid)return null;
 const isDividend=(c.type||"fixed")==="dividend";
 if(!isDividend)return {c,bid,isDividend:false,commissionAmount:0,dividendPool:0,dividendPerMember:0};
 const commissionAmount=c.amount*(Number(c.commission||0)/100);
 const dividendPool=Math.max(0,bid-commissionAmount);
 const members=Number(c.memberCount||0);
 const dividendPerMember=members?dividendPool/members:0;
 return {c,bid,isDividend:true,commissionAmount,dividendPool,dividendPerMember};
}
function updateAuctionPreview(){
 const el=document.getElementById("auctionPreview");
 if(!el)return;
 const x=auctionCalc();
 if(!x){el.innerHTML='<span>Dividend</span><b>—</b>';return}
 if(!x.isDividend){el.innerHTML='<span>Chit Type</span><b>🔒 Fixed — No dividend</b>';return}
 el.innerHTML=`<span>Dividend pool</span><b>${money(x.dividendPool)}</b><div class="muted" style="grid-column:1/-1">Commission ${money(x.commissionAmount)} • ${money(x.dividendPerMember)} per member</div>`;
}
function saveAuction(){
 const sel=document.getElementById("auctionChit");
 const winner=document.getElementById("winner")?.value;
 const x=auctionCalc();
 if(!x||!x.c||!x.bid)return alert("Select a chit and enter winning bid.");
 state.auctions.unshift({
   id:Date.now(),chit:x.c.name,bid:x.bid,winner,date:new Date().toLocaleDateString("en-IN"),
   type:x.isDividend?"Dividend":"Fixed",
   commissionAmount:x.commissionAmount,
   dividendPool:x.dividendPool,
   dividendPerMember:x.dividendPerMember
 });
 if(x.isDividend){
   state.dividends.push({
     id:Date.now()+1,chit:x.c.name,auctionId:Date.now(),
     discount:x.bid,commission:x.commissionAmount,
     pool:x.dividendPool,perMember:x.dividendPerMember,
     members:x.c.memberCount||0,date:new Date().toLocaleDateString("en-IN")
   });
 }
 save();render();
}

function openPayment(){
 showModal("Record Collection",`<div class="form"><input id="pMember" placeholder="Member name"><input id="pAmount" type="number" placeholder="Amount ₹"><input id="pNote" placeholder="Note"><button class="btn gold" onclick="createPayment()">Save Collection</button></div>`);
}
function createPayment(){const amount=Number(document.getElementById("pAmount").value||0);if(!amount)return alert("Enter amount.");state.payments.push({id:Date.now(),member:document.getElementById("pMember").value||"Member",amount,note:document.getElementById("pNote").value,date:new Date().toLocaleDateString("en-IN")});save();closeModal();render()}

function reports(){
 const total=sum(state.chits,"amount"),collected=sum(state.payments,"amount"),discount=sum(state.auctions,"bid");
 const fixed=state.chits.filter(c=>(c.type||"fixed")==="fixed").length;
 const dividend=state.chits.filter(c=>c.type==="dividend").length;
 const dividendPaid=state.dividends.reduce((x,d)=>x+Number(d.pool||0),0);
 return `<h2 class="page-title">Reports</h2><div class="subtitle">Financial overview & performance</div>
 <div class="grid"><div class="card"><div class="stat-label">PORTFOLIO</div><div class="stat-value">${money(total)}</div></div>
 <div class="card"><div class="stat-label">COLLECTED</div><div class="stat-value">${money(collected)}</div></div>
 <div class="card"><div class="stat-label">AUCTION DISCOUNT</div><div class="stat-value">${money(discount)}</div></div>
 <div class="card"><div class="stat-label">MEMBERS</div><div class="stat-value">${state.members.length}</div></div></div>
 <div class="grid"><div class="card"><div class="stat-label">🔒 FIXED CHITS</div><div class="stat-value">${fixed}</div></div>
 <div class="card"><div class="stat-label">🌿 DIVIDEND CHITS</div><div class="stat-value">${dividend}</div></div>
 <div class="card"><div class="stat-label">DIVIDEND POOL</div><div class="stat-value">${money(dividendPaid)}</div></div>
 <div class="card"><div class="stat-label">AUCTIONS</div><div class="stat-value">${state.auctions.length}</div></div></div>
 <div class="card table-card"><div class="table-title">Business Summary</div>
 <div class="metric" style="padding:13px 16px"><span>Total Chits</span><b>${state.chits.length}</b></div>
 <div class="metric" style="padding:13px 16px"><span>Total Collections</span><b>${money(collected)}</b></div>
 <div class="metric" style="padding:13px 16px"><span>Auctions</span><b>${state.auctions.length}</b></div>
 <div class="metric" style="padding:13px 16px"><span>Pending Estimate</span><b>${money(Math.max(0,total-collected))}</b></div></div>`;
}
function showModal(title,body){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=body;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
render();
