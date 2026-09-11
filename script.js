const KEY="mithraq_v2";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{
  chits:[],members:[],auctions:[],payments:[],dividends:[]
};
let tab="home";

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
state.chits.forEach(c=>{if(!c.type)c.type="fixed";if(!c.memberCount)c.memberCount=0;});
state.dividends=Array.isArray(state.dividends)?state.dividends:[];
state.liveAuction=state.liveAuction||null;
state.members.forEach(m=>{if(!Array.isArray(m.groupIds))m.groupIds=m.groupId?[m.groupId]:[];});
state.auctions=Array.isArray(state.auctions)?state.auctions:[];


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
 showModal("Add Member",`<div class="form">
 <input id="mName" placeholder="Full name">
 <input id="mPhone" placeholder="Phone number">
 <input id="mNo" placeholder="Member number">
 <label>Chit Group</label>
 <select id="mGroup">${state.chits.map(c=>`<option value="${c.id}">${esc(c.name)} • ${c.type==="dividend"?"Dividend":"Fixed"}</option>`).join("")||'<option value="">Create a chit first</option>'}</select>
 <button class="btn gold" onclick="createMember()">Save Member</button></div>`);
}
function createMember(){
 const name=document.getElementById("mName").value.trim();
 if(!name)return alert("Enter member name.");
 const gid=document.getElementById("mGroup")?.value||"";
 state.members.push({id:Date.now(),name,phone:document.getElementById("mPhone").value,no:document.getElementById("mNo").value,groupIds:gid?[Number(gid)]:[]});
 save();closeModal();render();
}

function groupMembers(groupId){
 return state.members.filter(m=>(m.groupIds||[]).map(Number).includes(Number(groupId)));
}
function selectedAuctionChit(){
 const id=document.getElementById("auctionChit")?.value || state.liveAuction?.chitId;
 return state.chits.find(c=>c.id==id);
}
function auction(){
 const first=state.chits[0];
 const selected=state.liveAuction?.chitId || first?.id || "";
 const c=state.chits.find(x=>x.id==selected);
 if(state.liveAuction && !state.chits.some(x=>x.id==state.liveAuction.chitId)) state.liveAuction=null;
 const members=c?groupMembers(c.id):[];
 const la=state.liveAuction;
 const currentRound=la?.round||0;
 const seconds=la?.secondsLeft??30;
 const highest=la?.bids?.length?Math.max(...la.bids.map(b=>Number(b.amount||0))):0;
 const highestBid=la?.bids?.find(b=>Number(b.amount||0)===highest);
 return `<div class="row"><div><h2 class="page-title">Auction Room</h2><div class="subtitle">Live group auction • 1st Round • 2nd Round • Final Round</div></div></div>
 <div class="auction-live-banner">
   <div><span class="online-dot"></span><b>${c?esc(c.name):"No group selected"}</b><div class="muted">${c?`${c.type==="dividend"?"🌿 Dividend":"🔒 Fixed"} • ${members.length} members in this group`:"Create a chit group first"}</div></div>
   <span class="badge active">GROUP ONLINE</span>
 </div>
 <div class="card">
   <div class="section" style="margin-top:0"><h3>Live Auction</h3><span class="badge ${la?"pending":"active"}">${la?"LIVE":"READY"}</span></div>
   <div class="form">
    <label>1. Select Chit Group</label>
    <select id="auctionChit" onchange="changeAuctionGroup()">${state.chits.map(x=>`<option value="${x.id}" ${x.id==selected?"selected":""}>${esc(x.name)} • ${x.type==="dividend"?"Dividend":"Fixed"}</option>`).join("")||'<option value="">Create a chit first</option>'}</select>
    <div class="group-members-box"><b>Only this group's members can bid</b><div class="member-pills">${members.map(m=>`<span>${esc(m.name)}</span>`).join("")||'<em>No members assigned to this group yet.</em>'}</div></div>
    <div class="round-box">
      <div><span class="round-kicker">AUCTION ROUND</span><strong>${currentRound?`${currentRound === 1?"1st":currentRound===2?"2nd":"3rd / FINAL"} Round`:"Not started"}</strong></div>
      <div class="timer ${seconds<=10&&la?"danger":""}" id="auctionTimer">${la?`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`:"00:30"}</div>
    </div>
    <div class="round-actions">
      ${!la?`<button class="btn gold" onclick="startAuction()">Start 1st Round</button>`:
      currentRound<3?`<button class="btn gold" onclick="nextAuctionRound()">Start ${currentRound===1?"2nd":"Final"} Round</button>`:
      `<button class="btn gold" onclick="finishAuction()">Finish & Select Winner</button>`}
      ${la?`<button class="btn outline" onclick="stopAuctionTimer()">Pause Timer</button>`:""}
    </div>
   </div>
 </div>
 <div class="card">
   <div class="section" style="margin-top:0"><h3>Place Bid</h3><span class="muted">${la?"Round "+currentRound+"/3":"Start auction first"}</span></div>
   <div class="form">
     <select id="bidder" ${!la?"disabled":""}>${members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")||'<option value="">No group members</option>'}</select>
     <input id="bidAmount" type="number" placeholder="Bid / discount amount ₹" ${!la?"disabled":""} oninput="updateLiveBidPreview()">
     <div id="liveBidPreview" class="metric"><span>Current highest bid</span><b>${highest?money(highest):"—"}</b></div>
     <button class="btn gold" ${!la?"disabled":""} onclick="placeLiveBid()">Submit Bid</button>
   </div>
 </div>
 <div class="card">
   <div class="section" style="margin-top:0"><h3>Live Bids</h3><span class="badge pending">${la?.bids?.length||0} BIDS</span></div>
   <div id="liveBidList">${(la?.bids||[]).slice().reverse().map(b=>`<div class="live-bid-row"><div><b>${esc(b.member)}</b><div class="muted">Round ${b.round}</div></div><strong>${money(b.amount)}</strong></div>`).join("")||'<div class="empty">No bids yet.</div>'}</div>
   ${highestBid?`<div class="winner-preview"><span>Current highest</span><b>${esc(highestBid.member)} • ${money(highestBid.amount)}</b></div>`:""}
 </div>
 <div class="card">
   <div class="section" style="margin-top:0"><h3>Dividend / Monthly Payable</h3></div>
   <div id="auctionCalcPanel">${liveDividendPanel(c,highest,members.length)}</div>
 </div>
 <div class="section"><h3>Auction History</h3></div>
 <div class="list">${state.auctions.map(a=>`<div class="card"><div class="row"><div><b>${esc(a.chit)}</b><div class="muted">${esc(a.type||"Fixed")} • Winner: ${esc(a.winner)} • ${esc(a.date)}</div>${a.type==="Dividend"?`<div class="muted">Auction ${money(a.bid)} • Commission ${money(a.commissionAmount)} • Dividend/member ${money(a.dividendPerMember)} • Monthly payable ${money(a.monthlyPayable)}</div>`:""}</div><b>${money(a.bid)}</b></div></div>`).join("")||'<div class="empty">No auctions recorded.</div>'}</div>`;
}
function liveDividendPanel(c,bid,memberCount){
 if(!c||!bid)return '<div class="empty">Enter a bid to see dividend calculation.</div>';
 const commission=Number(c.amount||0)*(Number(c.commission||0)/100);
 if((c.type||"fixed")!=="dividend")return `<div class="calc-grid"><div><span>Chit Type</span><b>🔒 Fixed</b></div><div><span>Monthly</span><b>${money(c.monthly)}</b></div><div class="wide"><small>Fixed chit — no dividend. Monthly payable remains ${money(c.monthly)}.</small></div></div>`;
 const pool=Math.max(0,Number(bid)-commission);
 const per=memberCount?pool/memberCount:0;
 const payable=Math.max(0,Number(c.monthly||0)-per);
 return `<div class="calc-grid">
 <div><span>Auction / Discount</span><b>${money(bid)}</b></div>
 <div><span>Commission</span><b>${money(commission)}</b></div>
 <div><span>Dividend Pool</span><b>${money(pool)}</b></div>
 <div><span>Dividend / Member</span><b>${money(per)}</b></div>
 <div class="wide highlight"><span>Monthly amount</span><b>${money(c.monthly)} → ${money(payable)} payable</b></div>
 <div class="wide"><small>Formula: Auction discount − commission = dividend pool → ÷ group members = dividend/member → monthly − dividend = amount to collect.</small></div>
 </div>`;
}
function changeAuctionGroup(){
 const id=Number(document.getElementById("auctionChit")?.value);
 state.liveAuction=null; save(); render();
}
function startAuction(){
 const c=selectedAuctionChit();
 if(!c)return alert("Select a chit group.");
 const members=groupMembers(c.id);
 if(!members.length)return alert("This group has no members. Add members to this chit group first.");
 state.liveAuction={chitId:c.id,round:1,secondsLeft:30,bids:[],timerRunning:true};
 save();render();startAuctionTimer();
}
let auctionInterval=null;
function startAuctionTimer(){
 clearInterval(auctionInterval);
 auctionInterval=setInterval(()=>{
   if(!state.liveAuction||!state.liveAuction.timerRunning){clearInterval(auctionInterval);return;}
   state.liveAuction.secondsLeft=Math.max(0,(state.liveAuction.secondsLeft||0)-1);
   const el=document.getElementById("auctionTimer");
   if(el)el.textContent=`${String(Math.floor(state.liveAuction.secondsLeft/60)).padStart(2,"0")}:${String(state.liveAuction.secondsLeft%60).padStart(2,"0")}`;
   if(state.liveAuction.secondsLeft<=0){
     state.liveAuction.timerRunning=false; save(); clearInterval(auctionInterval);
     if(state.liveAuction.round<3) alert(`Round ${state.liveAuction.round} time over. Start the next round.`);
     else alert("Final round time over. Finish & Select Winner.");
     render();
   }
 },1000);
}
function stopAuctionTimer(){
 if(!state.liveAuction)return;
 state.liveAuction.timerRunning=false; save();clearInterval(auctionInterval);render();
}
function nextAuctionRound(){
 if(!state.liveAuction)return;
 if(state.liveAuction.round>=3)return finishAuction();
 state.liveAuction.round+=1;state.liveAuction.secondsLeft=30;state.liveAuction.timerRunning=true;
 save();render();startAuctionTimer();
}
function placeLiveBid(){
 if(!state.liveAuction)return alert("Start the auction first.");
 const c=selectedAuctionChit(), memberId=Number(document.getElementById("bidder")?.value);
 const member=groupMembers(c.id).find(m=>Number(m.id)===memberId);
 const amount=Number(document.getElementById("bidAmount")?.value||0);
 if(!member||!amount)return alert("Select a group member and enter bid amount.");
 state.liveAuction.bids.push({memberId:member.id,member:member.name,amount,round:state.liveAuction.round,time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})});
 document.getElementById("bidAmount").value="";
 save();render();startAuctionTimer();
}
function updateLiveBidPreview(){
 const c=selectedAuctionChit(), la=state.liveAuction;
 const bid=Number(document.getElementById("bidAmount")?.value||0);
 const current=la?.bids?.length?Math.max(...la.bids.map(b=>Number(b.amount||0))):0;
 const value=Math.max(current,bid);
 const el=document.getElementById("liveBidPreview");
 if(el)el.innerHTML=`<span>Current highest bid</span><b>${value?money(value):"—"}</b>`;
 const panel=document.getElementById("auctionCalcPanel");
 if(panel)panel.innerHTML=liveDividendPanel(c,value,groupMembers(c?.id).length);
}
function finishAuction(){
 const la=state.liveAuction;
 if(!la)return;
 const c=state.chits.find(x=>x.id===la.chitId);
 const members=groupMembers(c.id);
 if(!la.bids.length)return alert("No bids recorded.");
 const winnerBid=la.bids.reduce((best,b)=>Number(b.amount)>Number(best.amount)?b:best,la.bids[0]);
 const commission=Number(c.amount||0)*(Number(c.commission||0)/100);
 const isDividend=(c.type||"fixed")==="dividend";
 const pool=isDividend?Math.max(0,Number(winnerBid.amount)-commission):0;
 const per=isDividend&&members.length?pool/members.length:0;
 const payable=isDividend?Math.max(0,Number(c.monthly||0)-per):Number(c.monthly||0);
 const now=new Date().toLocaleDateString("en-IN");
 state.auctions.unshift({id:Date.now(),chit:c.name,bid:winnerBid.amount,winner:winnerBid.member,date:now,type:isDividend?"Dividend":"Fixed",commissionAmount:commission,dividendPool:pool,dividendPerMember:per,monthlyPayable:payable,rounds:3});
 if(isDividend){
   state.dividends.push({id:Date.now()+1,chit:c.name,auctionId:Date.now(),discount:winnerBid.amount,commission:commission,pool:pool,perMember:per,members:members.length,date:now,monthlyPayable:payable});
 }
 state.liveAuction=null;save();clearInterval(auctionInterval);render();
 showModal("Auction Completed",`<div class="metric"><span>Winner</span><b>${esc(winnerBid.member)}</b></div>
 <div class="metric"><span>Winning Auction</span><b>${money(winnerBid.amount)}</b></div>
 ${isDividend?`<div class="metric"><span>Dividend / Member</span><b>${money(per)}</b></div><div class="metric"><span>Monthly → Payable</span><b>${money(c.monthly)} → ${money(payable)}</b></div>`:`<div class="metric"><span>Monthly Payable</span><b>${money(c.monthly)}</b></div>`}
 <div class="muted" style="padding:8px 2px">3 auction rounds completed. The result is saved to Auction History and Dividend records.</div>
 <button class="btn gold" style="width:100%;margin-top:10px" onclick="closeModal()">Done</button>`);
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
