import "./style.css";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const KEY="flowtime-v1";
const defaultState={
  routines:[],
  goals:[],
  theme:"dark",
  sound:true,
  reminderMinutes:5,
  active:null
};

const $=(s,r=document)=>r.querySelector(s);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,"0");
const fmtDate=d=>new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(d);
const fmtTime=t=>new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}).format(t);
const load=()=>{try{return {...defaultState,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {...defaultState}}};
let state=load();
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

function localDateTime(date,time){
  const [h,m]=time.split(":").map(Number);
  const d=new Date(date); d.setHours(h,m,0,0); return d;
}
function nextOccurrence(r){
  const now=new Date();
  if(r.kind==="once"){
    const d=localDateTime(r.date,r.start);
    return d>=now?d:null;
  }
  for(let i=0;i<8;i++){
    const d=new Date(now); d.setDate(now.getDate()+i);
    const wd=d.getDay();
    if(r.days.includes(wd)){
      const x=localDateTime(d,r.start);
      if(x>=now) return x;
    }
  }
  return null;
}
function durationMs(r){
  const [sh,sm]=r.start.split(":").map(Number), [eh,em]=r.end.split(":").map(Number);
  let mins=(eh*60+em)-(sh*60+sm); if(mins<=0) mins+=1440;
  return mins*60000;
}
function speak(text){
  if(!state.sound || !("speechSynthesis" in window)) return;
  try{speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang="bn-BD"; u.rate=.95; u.pitch=.95; speechSynthesis.speak(u);}catch{}
}
async function nativeNotify(title,body,id=Date.now()%2147480000){
  if(Capacitor.isNativePlatform()){
    try{
      let p=await LocalNotifications.checkPermissions();
      if(p.display!=="granted") p=await LocalNotifications.requestPermissions();
      if(p.display==="granted") await LocalNotifications.schedule({notifications:[{id,title,body,schedule:{at:new Date(Date.now()+50)}}]});
    }catch{}
  }else if("Notification" in window){
    if(Notification.permission==="default") await Notification.requestPermission().catch(()=>{});
    if(Notification.permission==="granted") new Notification(title,{body,icon:"./icons/icon.svg"});
  }
  speak(body);
}
async function scheduleRoutineNotifications(r){
  const d=nextOccurrence(r); if(!d) return;
  const reminder=new Date(d.getTime()-state.reminderMinutes*60000);
  if(reminder>new Date()) await nativeNotify("FlowTime Reminder",`${state.reminderMinutes} মিনিট পর ${r.title} হবে। প্রস্তুতি নিন।`,Math.floor(Math.random()*2147480000));
}
function render(){
  document.documentElement.dataset.theme=state.theme;
  const now=new Date();
  const upcoming=state.routines.map(r=>({r,d:nextOccurrence(r)})).filter(x=>x.d).sort((a,b)=>a.d-b.d);
  const active=state.active?state.routines.find(r=>r.id===state.active.routineId):null;
  $("#app").innerHTML=`
  <div class="shell">
    <header class="top">
      <div><div class="brand"><span class="brand-dot"></span>FlowTime</div><div class="sub">Your day, with intention.</div></div>
      <button class="icon-btn" id="themeBtn" aria-label="Toggle theme">${state.theme==="dark"?"☼":"☾"}</button>
    </header>
    ${active?activePanel(active):`
    <section class="hero">
      <div class="eyebrow">TODAY · ${fmtDate(now)}</div>
      <h1>${greeting()},<br><span>let’s make time count.</span></h1>
      <div class="hero-actions"><button class="primary" id="addBtn">＋ Add routine</button><button class="ghost" id="notifyBtn">🔔 Enable reminders</button></div>
    </section>
    <section class="grid">
      <div class="panel">
        <div class="panel-head"><div><span class="eyebrow">NEXT UP</span><h2>Upcoming</h2></div><button class="text-btn" id="allBtn">Manage</button></div>
        ${upcoming.slice(0,4).map(({r,d})=>routineCard(r,d)).join("")||empty("No routines yet","Add your first routine and let FlowTime guide the day.")}
      </div>
      <div class="panel goals">
        <div class="panel-head"><div><span class="eyebrow">FOCUS</span><h2>Goals</h2></div><button class="text-btn" id="goalBtn">＋ Goal</button></div>
        ${state.goals.slice(0,5).map(goalCard).join("")||empty("No goals","Add a goal to keep the bigger picture visible.")}
      </div>
    </section>
    <section class="panel week">
      <div class="panel-head"><div><span class="eyebrow">WEEKLY RHYTHM</span><h2>Your routines</h2></div><span class="count">${state.routines.length}</span></div>
      ${state.routines.slice().sort((a,b)=>(nextOccurrence(a)||9e15)-(nextOccurrence(b)||9e15)).map(routineRow).join("")||empty("Build your routine","Weekly, one-time, study, editing, shooting — all in one place.")}
    </section>`}
    <div id="modal"></div>
    <nav class="bottom-nav"><span>⌂ <small>Today</small></span><span>◷ <small>Focus</small></span><span>✓ <small>Goals</small></span><span>⚙ <small>Settings</small></span></nav>
  </div>`;
  bind();
}
function greeting(){const h=new Date().getHours(); return h<12?"Good morning":h<18?"Good afternoon":"Good evening"}
function empty(t,s){return `<div class="empty"><b>${t}</b><p>${s}</p></div>`}
function routineCard(r,d){
  return `<article class="routine-card"><div class="time">${fmtTime(d)}</div><div class="r-main"><div class="r-title">${esc(r.title)}</div><div class="muted">${r.start} — ${r.end} · ${durationLabel(r)}</div></div><button class="start-small" data-start="${r.id}">Start</button></article>`;
}
function routineRow(r){
  return `<div class="routine-row"><div class="mini-dot"></div><div class="r-main"><b>${esc(r.title)}</b><span>${r.kind==="weekly"?"Weekly · "+r.days.map(dayName).join(", "):fmtDate(new Date(r.date))} · ${r.start}–${r.end}</span></div><button class="dots" data-edit="${r.id}">•••</button></div>`;
}
function goalCard(g){
  return `<div class="goal-row"><button class="check ${g.done?"done":""}" data-goal="${g.id}">${g.done?"✓":""}</button><span class="${g.done?"strike":""}">${esc(g.title)}</span></div>`
}
function durationLabel(r){let m=Math.round(durationMs(r)/60000);return m>=60?`${Math.floor(m/60)}h ${m%60?m%60+"m":""}`:`${m}m`}
function dayName(n){return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][n]}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function activePanel(r){
  const a=state.active, remaining=Math.max(0,a.endsAt-Date.now());
  return `<section class="focus-screen"><div class="eyebrow">NOW FOCUSING</div><h1>${esc(r.title)}</h1><p class="muted">${r.start} — ${fmtTime(new Date(a.endsAt))}</p><div class="timer">${timeLeft(remaining)}</div><div class="progress"><span style="width:${Math.min(100,Math.max(0,100-remaining/durationMs(r)*100))}%"></span></div><div class="focus-actions"><button class="primary" id="finishBtn">Finish</button><button class="ghost" id="pauseBtn">${a.paused?"Resume":"Pause"}</button><button class="ghost" id="plus5">＋ 5 min</button><button class="ghost" id="plus10">＋ 10 min</button></div><p class="hint">Tip: add time whenever the work needs a little longer.</p></section>`;
}
function timeLeft(ms){let s=Math.ceil(ms/1000);return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`}

function bind(){
  $("#themeBtn")?.addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";save();render()});
  $("#addBtn")?.addEventListener("click",()=>openRoutine());
  $("#goalBtn")?.addEventListener("click",()=>openGoal());
  $("#notifyBtn")?.addEventListener("click",async()=>{await nativeNotify("FlowTime","Notifications are enabled. Your routine reminders are ready."); state.routines.forEach(scheduleRoutineNotifications);});
  document.querySelectorAll("[data-start]").forEach(b=>b.addEventListener("click",()=>startRoutine(b.dataset.start)));
  document.querySelectorAll("[data-goal]").forEach(b=>b.addEventListener("click",()=>{const g=state.goals.find(x=>x.id===b.dataset.goal);g.done=!g.done;save();render()}));
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openRoutine(state.routines.find(x=>x.id===b.dataset.edit))));
  $("#finishBtn")?.addEventListener("click",()=>{state.active=null;save();render()});
  $("#pauseBtn")?.addEventListener("click",()=>{state.active.paused=!state.active.paused; if(!state.active.paused) state.active.lastResume=Date.now(); save();render()});
  $("#plus5")?.addEventListener("click",()=>extendActive(5));
  $("#plus10")?.addEventListener("click",()=>extendActive(10));
}
function startRoutine(id){
  const r=state.routines.find(x=>x.id===id); if(!r)return;
  state.active={routineId:id,endsAt:Date.now()+durationMs(r),lastResume:Date.now(),paused:false}; save(); speak(`${r.title} শুরু হয়েছে।`); render();
}
function extendActive(min){
  if(state.active){state.active.endsAt+=min*60000;save();render();speak(`আরও ${min} মিনিট যোগ করা হয়েছে।`)}
}
function openGoal(){
  $("#modal").innerHTML=`<div class="modal-bg"><form class="modal"><div class="modal-head"><h2>New goal</h2><button type="button" class="close" id="close">×</button></div><label>Goal<input id="goalTitle" required placeholder="যেমন: সপ্তাহে ৩টি ভিডিও এডিট"></label><button class="primary full">Save goal</button></form></div>`;
  $("#close").onclick=()=>$("#modal").innerHTML="";
  $(".modal").onsubmit=e=>{e.preventDefault();state.goals.unshift({id:uid(),title:$("#goalTitle").value.trim(),done:false});save();render()}
}
function openRoutine(existing){
  const r=existing||{title:"",kind:"once",date:new Date().toISOString().slice(0,10),start:"20:00",end:"21:00",days:[1,2,3,4,5]};
  $("#modal").innerHTML=`<div class="modal-bg"><form class="modal"><div class="modal-head"><h2>${existing?"Edit routine":"New routine"}</h2><button type="button" class="close" id="close">×</button></div>
  <label>Task / activity<input id="title" required value="${esc(r.title)}" placeholder="Plant Breeding Class"></label>
  <label>Repeat<select id="kind"><option value="once" ${r.kind==="once"?"selected":""}>One time</option><option value="weekly" ${r.kind==="weekly"?"selected":""}>Weekly</option></select></label>
  <div id="dateWrap"><label>Date<input id="date" type="date" value="${r.date||""}"></label></div>
  <div id="daysWrap" class="days">${[0,1,2,3,4,5,6].map(d=>`<label><input type="checkbox" value="${d}" ${r.days?.includes(d)?"checked":""}>${dayName(d)}</label>`).join("")}</div>
  <div class="two"><label>Start<input id="start" type="time" value="${r.start}"></label><label>End<input id="end" type="time" value="${r.end}"></label></div>
  <label>Reminder before<select id="rem"><option value="0">At start</option><option value="5" ${state.reminderMinutes===5?"selected":""}>5 minutes</option><option value="10" ${state.reminderMinutes===10?"selected":""}>10 minutes</option><option value="15" ${state.reminderMinutes===15?"selected":""}>15 minutes</option></select></label>
  <div class="modal-actions">${existing?`<button type="button" class="danger" id="delete">Delete</button>`:""}<button class="primary full">Save routine</button></div></form></div>`;
  const sync=()=>{const weekly=$("#kind").value==="weekly";$("#dateWrap").style.display=weekly?"none":"block";$("#daysWrap").style.display=weekly?"flex":"none"}; $("#kind").onchange=sync;sync();
  $("#close").onclick=()=>$("#modal").innerHTML="";
  $("#delete")?.addEventListener("click",()=>{state.routines=state.routines.filter(x=>x.id!==r.id);save();render()});
  $(".modal").onsubmit=e=>{e.preventDefault();state.reminderMinutes=Number($("#rem").value);const item={...r,id:r.id||uid(),title:$("#title").value.trim(),kind:$("#kind").value,date:$("#date").value,start:$("#start").value,end:$("#end").value,days:[...document.querySelectorAll("#daysWrap input:checked")].map(x=>Number(x.value))}; if(item.kind==="weekly"&&!item.days.length)return alert("Select at least one day."); if(existing)Object.assign(existing,item);else state.routines.push(item);save();scheduleRoutineNotifications(item);render()};
}
setInterval(()=>{
  if(state.active && !state.active.paused){
    if(Date.now()>=state.active.endsAt){const r=state.routines.find(x=>x.id===state.active.routineId);state.active=null;save();speak(`${r?.title||"কাজ"} শেষ হয়েছে।`);render()}
    else {const t=$("#timer"); if(t)t.textContent=timeLeft(state.active.endsAt-Date.now()); const p=document.querySelector(".progress span"); if(p){const r=state.routines.find(x=>x.id===state.active.routineId); if(r)p.style.width=Math.min(100,Math.max(0,100-(state.active.endsAt-Date.now())/durationMs(r)*100))}}
  }
},500);

if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
