// Nooka — Home | LifeSpace | Action | Finance | More
// LifeSpace: Calendar + Events + Notes + Job Applications + Projects | Action sheet: Event/Note/Task/Job/Project
const Store = {
  keys: { tx: 'mobileApp_tx_v2', events: 'mobileApp_events_v2', tasks: 'mobileApp_tasks_v1', notes: 'mobileApp_notes_v1', applications: 'mobileApp_applications_v1', accounts: 'mobileApp_accounts_v1', projects: 'mobileApp_projects_v1', goals: 'mobileApp_goals_v1', log: 'mobileApp_log_v1' },
  read(key){ try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch{ return []; } },
  write(key,val){ localStorage.setItem(key, JSON.stringify(val)); },
};
function newId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function logActivity(icon, text){
  try{
    const log=Store.read(Store.keys.log);
    log.push({ id:Date.now().toString(36)+Math.random().toString(36).slice(2,4), icon, text, at:new Date().toISOString() });
    if(log.length>80) log.splice(0, log.length-80);
    Store.write(Store.keys.log, log);
  }catch{}
}
function renderActivityLog(){
  const el=document.getElementById('activity-log');
  if(!el) return;
  const log=Store.read(Store.keys.log).slice().reverse();
  if(log.length===0){
    // fallback: build from existing data if no log yet
    const fallback=[];
    Store.read(Store.keys.tasks).slice(-3).forEach(t=> fallback.push({icon:'✅', text:`Task: ${t.title} · ${t.dueDate}`, at:t.createdAt}));
    Store.read(Store.keys.notes).slice(-3).forEach(n=> fallback.push({icon:'📝', text:`Note: ${n.title}`, at:n.date}));
    Store.read(Store.keys.applications).slice(-3).forEach(a=> fallback.push({icon:'💼', text:`Job: ${a.company} — ${a.position}`, at:a.createdAt}));
    Store.read(Store.keys.events).slice(-3).forEach(e=> fallback.push({icon:'📅', text:`Event: ${e.title} · ${e.date}`, at:new Date(e.date).toISOString()}));
    if(fallback.length){
      fallback.sort((a,b)=> new Date(b.at)-new Date(a.at));
      el.innerHTML=fallback.slice(0,6).map(l=>{
        const d=new Date(l.at); const ago=timeAgo(d);
        return `<div class="list-item" style="gap:10px;padding:10px 12px"><span style="font-size:16px">${l.icon}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.text)}</span><span class="small muted">${ago}</span></span></div>`;
      }).join('');
      return;
    }
    el.innerHTML=`<div class="list-empty" style="padding:16px">No activity yet — add a task, note, or event to see it here.</div>`;
    return;
  }
  el.innerHTML=log.slice(0,30).map(l=>{
    const d=new Date(l.at); const ago=timeAgo(d);
    return `<div class="list-item" style="gap:10px;padding:10px 12px"><span style="font-size:16px">${esc(l.icon)}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span style="font-size:13px">${esc(l.text)}</span><span class="small muted">${ago}</span></span></div>`;
  }).join('');
}
function timeAgo(d){
  const s=Math.floor((Date.now()-d)/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  if(s<604800) return Math.floor(s/86400)+'d ago';
  return d.toLocaleDateString();
}

// Navigation — exclude FAB
function setPage(name){
  document.querySelectorAll('.page').forEach(p=> p.classList.remove('active'));
  const el = document.getElementById('page-'+name);
  if(el) el.classList.add('active');
  document.querySelectorAll('.bottom-nav .nav-btn[data-nav]').forEach(b=>{
    const isActive = b.dataset.nav === name;
    b.classList.toggle('active', isActive);
    if(isActive) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  window.scrollTo({top:0, behavior:'smooth'});
  if(name==='home'){ renderHome(); }
  if(name==='lifespace'){ closeLsDetail(); renderCalendar(); renderLifeSpace(); updateLsTiles(); }
  if(name==='finance') renderFinance();
  if(name==='more') { updateProfileUI(); renderMore(); renderActivityLog(); }
}

// Toast
let toastTimer;
function toast(msg, ms=2200){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'), ms);
}
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function fmt(n){ return '₱' + Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2, maximumFractionDigits:2}); }

// Profile — "What should I call you?"
const PROFILE_KEY = 'mobileApp_profile_name';
function getProfileName(){ try{ return (localStorage.getItem(PROFILE_KEY)||'').trim(); }catch{ return ''; } }
function setProfileName(name){
  const clean = String(name||'').trim().slice(0,24);
  if(!clean){ toast('Enter a name'); return false; }
  localStorage.setItem(PROFILE_KEY, clean);
  setProfileCollapsed(true);
  updateProfileUI();
  updateHomeGreeting();
  renderHome();
  toast(`Saved — Hello, ${clean} ✓`);
  return true;
}
function initials(name){
  const parts = String(name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length===0) return 'JD';
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}
let profileCollapsed = localStorage.getItem('profile_collapsed') === '1';
let activityCollapsed = localStorage.getItem('activity_collapsed') === '1';
function setProfileCollapsed(v){
  profileCollapsed=v;
  localStorage.setItem('profile_collapsed', v?'1':'0');
  const body=document.getElementById('profile-body');
  const btn=document.getElementById('profile-toggle');
  const card=document.getElementById('profile-card');
  if(body) body.hidden=v;
  if(btn) btn.setAttribute('aria-expanded', String(!v));
  if(card) card.classList.toggle('collapsed', v);
  const sum=document.getElementById('profile-summary');
  if(sum) sum.textContent = v ? (getProfileName() || '—') : '';
}
function setActivityCollapsed(v){
  activityCollapsed=v;
  localStorage.setItem('activity_collapsed', v?'1':'0');
  const body=document.getElementById('activity-body');
  const btn=document.getElementById('activity-toggle');
  const card=document.getElementById('activity-card');
  if(body) body.hidden=v;
  if(btn) btn.setAttribute('aria-expanded', String(!v));
  if(card) card.classList.toggle('collapsed', v);
}
function updateProfileUI(){
  const name = getProfileName() || 'Jane Doe';
  const av=document.getElementById('profile-avatar');
  const pn=document.getElementById('profile-name');
  const input=document.getElementById('profile-input');
  if(av) av.textContent = initials(name);
  if(pn) pn.textContent = name;
  if(input && document.activeElement!==input) input.value = getProfileName();
  const hasName = !!getProfileName();
  // auto-collapse after name is set, expand if no name yet
  if(hasName && localStorage.getItem('profile_collapsed')===null){
    setProfileCollapsed(true);
  } else {
    setProfileCollapsed(profileCollapsed);
  }
  const sum=document.getElementById('profile-summary');
  if(sum && profileCollapsed) sum.textContent = name;
  // keep activity state
  setActivityCollapsed(activityCollapsed);
}
window.clearActivityLog=()=>{
  if(!confirm('Clear activity log?')) return;
  Store.write(Store.keys.log, []);
  renderActivityLog();
  toast('Log cleared');
};
function exportBackup(){
  const data={};
  Object.entries(Store.keys).forEach(([k,v])=>{ data[v]=Store.read(v); });
  data[PROFILE_KEY]=getProfileName();
  data['theme']=localStorage.getItem('mobileApp_theme')||'light';
  data['exportedAt']=new Date().toISOString();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mobileapp-backup-'+ymd(new Date())+'.json'; a.click(); URL.revokeObjectURL(a.href);
  logActivity('⤓','Backup exported'); renderActivityLog(); toast('Backup exported ✓');
}
function importBackupFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      let count=0;
      Object.entries(Store.keys).forEach(([k,v])=>{ if(Array.isArray(data[v])){ Store.write(v,data[v]); count++; } });
      if(typeof data[PROFILE_KEY]==='string' && data[PROFILE_KEY].trim()){ localStorage.setItem(PROFILE_KEY, data[PROFILE_KEY].trim()); }
      if(data['theme']) { localStorage.setItem('mobileApp_theme', data['theme']); applyTheme(data['theme']); }
      renderFinance(''); renderCalendar(); renderHome(); renderLifeSpace(); renderActivityLog(); updateProfileUI(); updateLsTiles(); updateStorageInfo();
      logActivity('⤒','Backup imported'); renderActivityLog(); toast('Imported '+count+' sections ✓');
    }catch(e){ toast('Import failed — invalid file'); console.error(e); }
  };
  reader.readAsText(file);
}
function exportFinanceCSV(){
  const tx=Store.read(Store.keys.tx);
  if(tx.length===0){ toast('No transactions to export'); return; }
  const header=['Date','Type','Title','Category','Amount','Notes'];
  const csvField=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const rows=tx.map(t=>[t.date,t.type,t.title,t.category,t.amount,t.notes||''].map(csvField).join(','));
  const csv=[header.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='finance-'+ymd(new Date())+'.csv'; a.click(); URL.revokeObjectURL(a.href);
  logActivity('📊','Finance CSV exported'); renderActivityLog(); toast('CSV exported ✓');
}
window.exportBackup=exportBackup;
window.exportFinanceCSV=exportFinanceCSV;
function updateHomeGreeting(){
  const el=document.getElementById('home-greeting');
  if(!el) return;
  const name = getProfileName();
  const h = new Date().getHours();
  let g = 'Good morning';
  if(h>=12 && h<18) g='Good afternoon';
  else if(h>=18) g='Good evening';
  el.textContent = name ? `${g}, ${esc(name)} 👋` : `${g} 👋`;
  const sub=document.getElementById('home-subtitle');
  if(sub){
    const tasksDue = Store.read(Store.keys.tasks).filter(t=> !t.completed && t.dueDate===ymd(new Date())).length;
    const evToday = Store.read(Store.keys.events).filter(e=> e.date===ymd(new Date())).length;
    if(tasksDue || evToday) sub.textContent = `You have ${evToday ? evToday+' event'+(evToday>1?'s':''):''}${evToday&&tasksDue?' · ':''}${tasksDue ? tasksDue+' task'+(tasksDue>1?'s':'')+' due today':''} — let's make progress!`;
    else sub.textContent = name ? `All clear today — great time to plan, ${esc(name)}!` : 'All clear today — great time to plan!';
  }
}
function renderHome(){
  updateHomeGreeting();
  const dateEl=document.getElementById('home-date');
  if(dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric', year:'numeric'});
  // Stats
  const todayStr=ymd(new Date());
  const tasks=Store.read(Store.keys.tasks);
  const events=Store.read(Store.keys.events);
  const notes=Store.read(Store.keys.notes);
  const apps=Store.read(Store.keys.applications);
  const projects=Store.read(Store.keys.projects);
  const tx=Store.read(Store.keys.tx);
  const accs=Store.read(Store.keys.accounts);
  let income=0, expense=0;
  tx.forEach(t=>{ if(t.type==='income') income+=Number(t.amount); else expense+=Number(t.amount); });
  const bal=income-expense;
  const saved=accs.reduce((s,a)=> s+Number(a.balance||0),0);
  const todayTasks = tasks.filter(t=> t.dueDate===todayStr && !t.completed).length;
  const todayEvents = events.filter(e=> e.date===todayStr).length;
  const sToday=document.getElementById('home-stat-today');
  if(sToday) sToday.textContent = `${todayEvents} event${todayEvents!==1?'s':''} · ${todayTasks} task${todayTasks!==1?'s':''} due`;
  const sTasks=document.getElementById('home-stat-tasks');
  if(sTasks) sTasks.textContent = `${tasks.filter(t=>!t.completed).length} open · ${tasks.length} total`;
  const sFin=document.getElementById('home-stat-finance');
  if(sFin) sFin.textContent = `${fmt(bal)}${saved?` · Saved ${fmt(saved)}`:''}`;
  const sLS=document.getElementById('home-stat-lifespace');
  if(sLS) sLS.textContent = `${notes.length} note${notes.length!==1?'s':''} · ${apps.length} job${apps.length!==1?'s':''} · ${projects.length} project${projects.length!==1?'s':''}`;
  // Focus: today tasks + events (max 5)
  const focusEl=document.getElementById('home-focus');
  const countEl=document.getElementById('home-focus-count');
  if(focusEl){
    const focusTasks = tasks.filter(t=> t.dueDate===todayStr && !t.completed).slice(0,3);
    const focusEvents = events.filter(e=> e.date===todayStr).slice(0,3);
    const items=[...focusTasks.map(t=>({type:'task', title:t.title, sub:`${t.priority} · ${t.dueDate}`, id:t.id})), ...focusEvents.map(e=>({type:'event', title:e.title, sub:`${e.time||'All day'} · ${e.date}`, id:e.id}))].slice(0,5);
    if(countEl) countEl.textContent = items.length ? `· ${items.length}` : '';
    if(items.length===0) focusEl.innerHTML=`<div class="list-empty" style="padding:12px">Nothing due today — enjoy! 🎉</div>`;
    else focusEl.innerHTML=items.map(it=>`
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:2px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span style="font-weight:700;font-size:13px">${esc(it.title)}</span>
          <span class="small" style="padding:2px 6px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border)">${esc(it.type)}</span>
        </div>
        <div class="small muted">${esc(it.sub)}</div>
      </div>`).join('');
  }
  // Savings progress
  const savCard=document.getElementById('home-savings-card');
  const savList=document.getElementById('home-savings-list');
  const savTotal=document.getElementById('home-savings-total');
  if(savCard && savList && savTotal){
    if(accs.length===0){ savCard.hidden=true; }
    else {
      savCard.hidden=false;
      const total=saved;
      savTotal.textContent = fmt(total);
      savList.innerHTML=accs.slice(0,3).map(a=>{
        const pct = a.goal && a.goal>0 ? Math.min(100, Math.round((a.balance/a.goal)*100)) : 0;
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-weight:600;font-size:13px">${esc(a.name)} — ${fmt(a.balance)}${a.goal?` / ${fmt(a.goal)}`:''}</span><span class="small muted">${pct}%</span></div><div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`;
      }).join('');
      if(accs.length>3) savList.innerHTML+=`<div class="small muted" style="text-align:center">+${accs.length-3} more in Finance →</div>`;
    }
  }
  // Recent
  const recentEl=document.getElementById('home-recent');
  if(recentEl){
    const recentNotes = notes.slice(-2).reverse();
    const recentJobs = apps.slice(-1).reverse();
    const recent = [...recentNotes.map(n=>({icon:'📝', title:n.title, sub:'Note · '+new Date(n.date).toLocaleDateString()})), ...recentJobs.map(j=>({icon:'💼', title:`${j.company} — ${j.position}`, sub:`Job · ${j.status}`}))].slice(0,3);
    if(recent.length===0) recentEl.innerHTML=`<div class="list-empty" style="padding:12px">No recent activity yet — add a note or job!</div>`;
    else recentEl.innerHTML=recent.map(r=>`
      <div class="list-item" style="gap:10px;padding:10px 12px">
        <span style="font-size:18px">${r.icon}</span>
        <span style="display:flex;flex-direction:column;gap:2px"><span style="font-weight:600;font-size:13px">${esc(r.title)}</span><span class="small muted">${esc(r.sub)}</span></span>
      </div>`).join('');
  }
}

// Theme — Day/Night toggle
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mobileApp_theme', theme);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', theme==='dark' ? '#0b1220' : '#f8fafc');
  const toggle=document.getElementById('theme-toggle');
  const icon=document.getElementById('theme-icon');
  const label=document.getElementById('theme-label');
  if(toggle) toggle.checked = theme==='dark';
  if(icon) icon.textContent = theme==='dark' ? '☀️' : '🌙';
  if(label) label.textContent = theme==='dark' ? 'Day mode' : 'Night mode';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const isDark = cur==='dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(isDark ? 'light' : 'dark');
}
(function initTheme(){
  const saved=localStorage.getItem('mobileApp_theme');
  if(saved) applyTheme(saved);
  else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
})();

// Storage info
function updateStorageInfo(){
  try{
    const tx = localStorage.getItem(Store.keys.tx)||'[]';
    const ev = localStorage.getItem(Store.keys.events)||'[]';
    const tasks = localStorage.getItem(Store.keys.tasks)||'[]';
    const notes = localStorage.getItem(Store.keys.notes)||'[]';
    const apps = localStorage.getItem(Store.keys.applications)||'[]';
    const acc = localStorage.getItem(Store.keys.accounts)||'[]';
    const projs = localStorage.getItem(Store.keys.projects)||'[]';
    const goals = localStorage.getItem(Store.keys.goals)||'[]';
    const len = new Blob([tx+ev+tasks+notes+apps+acc+projs+goals]).size;
    const el=document.getElementById('storage-info');
    if(el) el.textContent = `${Store.read(Store.keys.tx).length} tx · ${Store.read(Store.keys.events).length} events · ${Store.read(Store.keys.tasks).length} tasks · ${Store.read(Store.keys.goals).length} goals · ${Store.read(Store.keys.notes).length} notes · ${Store.read(Store.keys.applications).length} jobs · ${Store.read(Store.keys.projects).length} projects · ${Store.read(Store.keys.accounts).length} accounts · ~${(len/1024).toFixed(1)} KB`;
  }catch{}
}

// Install prompt
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferredPrompt=e;
  const b1=document.getElementById('btn-install');
  const b2=document.getElementById('btn-install-more');
  if(b1) b1.hidden=false;
  if(b2) b2.hidden=false;
});
async function triggerInstall(){
  if(!deferredPrompt){ toast('Install not available — use browser menu → Add to Home Screen'); return; }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  document.getElementById('btn-install').hidden=true;
  const b2=document.getElementById('btn-install-more');
  if(b2) b2.hidden=true;
}

// ---------- Calendar ----------
let calDate = new Date();
let selectedDate = new Date();
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function renderCalendar(){
  const title=document.getElementById('cal-title');
  const grid=document.getElementById('cal-grid');
  if(!title||!grid) return;
  const y=calDate.getFullYear(), m=calDate.getMonth();
  title.textContent = calDate.toLocaleDateString('en-US',{month:'long', year:'numeric'});
  const first = new Date(y,m,1);
  const last = new Date(y,m+1,0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const prevLast = new Date(y,m,0).getDate();
  const events = Store.read(Store.keys.events);
  const eventSet = new Set(events.map(e=>e.date));

  let html='';
  for(let i=startDay-1;i>=0;i--){
    const d=prevLast - i;
    html+=`<button class="cal-day muted" data-date="${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}" disabled>${d}</button>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const dateObj=new Date(y,m,d);
    const iso=ymd(dateObj);
    const isToday = iso===ymd(new Date());
    const isSelected = iso===ymd(selectedDate);
    const hasEvent = eventSet.has(iso);
    html+=`<button class="cal-day ${isToday?'today':''} ${isSelected?'selected':''} ${hasEvent?'has-event':''}" data-date="${iso}">${d}</button>`;
  }
  const totalCells = startDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for(let d=1; d<=trailing; d++){
    html+=`<button class="cal-day muted" disabled>${d}</button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.cal-day[data-date]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedDate=new Date(btn.dataset.date+'T00:00:00');
      renderCalendar();
      renderCalEvents();
    });
  });
  renderCalEvents();
}
function renderCalEvents(){
  const label=document.getElementById('cal-selected-label');
  const list=document.getElementById('cal-events');
  if(!label||!list) return;
  const iso=ymd(selectedDate);
  label.textContent = selectedDate.toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'});
  const events=Store.read(Store.keys.events).filter(e=>e.date===iso).sort((a,b)=> (a.time||'').localeCompare(b.time||''));
  if(events.length===0){
    list.innerHTML=`<div class="list-empty">No events for ${iso}<br><span class="small">Tap + Add to create one.</span></div>`;
    return;
  }
  list.innerHTML=events.map(e=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span style="font-weight:700">${esc(e.title)}</span>
        <span class="small muted">${esc(e.time||'')}</span>
      </div>
      ${e.notes?`<div class="small muted">${esc(e.notes)}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteEvent('${e.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.deleteEvent=(id)=>{
  if(!confirm('Delete this event?')) return;
  const ev=Store.read(Store.keys.events).filter(e=>e.id!==id);
  Store.write(Store.keys.events, ev);
  renderCalendar();
  updateLsTiles();
  renderHome();
  updateStorageInfo();
  toast('Event deleted');
};
function openAddEvent(prefillDate){
  if(prefillDate) selectedDate=new Date(prefillDate+'T00:00:00');
  openModal('New Event', `
    <form id="form-event" class="form">
      <div class="field"><label>Date</label><input type="date" name="date" value="${ymd(selectedDate)}" required></div>
      <div class="field"><label>Time</label><input type="time" name="time"></div>
      <div class="field"><label>Title</label><input name="title" required placeholder="e.g. Team standup" maxlength="60"></div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details..."></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Save Event</button>
    </form>
  `);
  document.getElementById('form-event').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const ev={ id:newId(), date:String(fd.get('date')), time:String(fd.get('time')||''), title:String(fd.get('title')).trim(), notes:String(fd.get('notes')||'').trim() };
    if(!ev.title||!ev.date) return;
    const all=Store.read(Store.keys.events);
    all.push(ev); Store.write(Store.keys.events, all);
    closeModal(); renderCalendar(); updateLsTiles(); renderHome(); logActivity('📅','Event: '+ev.title+' · '+ev.date); renderActivityLog(); updateStorageInfo(); toast('Event saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}

// ---------- Finance + Savings Accounts (Collapsible) ----------
let savingsCollapsed = localStorage.getItem('savings_collapsed') === '1';
function setSavingsCollapsed(v){
  savingsCollapsed=v;
  localStorage.setItem('savings_collapsed', v?'1':'0');
  const body=document.getElementById('savings-body');
  const btn=document.getElementById('savings-toggle');
  const card=document.getElementById('savings-card');
  if(body) body.hidden=v;
  if(btn) btn.setAttribute('aria-expanded', String(!v));
  if(card) card.classList.toggle('collapsed', v);
}
function renderAccounts(){
  const list=document.getElementById('accounts-list');
  const totalEl=document.getElementById('savings-total');
  if(!list) { setSavingsCollapsed(savingsCollapsed); return; }
  // apply collapsed state
  setSavingsCollapsed(savingsCollapsed);
  const accs=Store.read(Store.keys.accounts);
  const total=accs.reduce((s,a)=> s+Number(a.balance||0), 0);
  if(totalEl) totalEl.textContent = accs.length ? `${fmt(total)} · ${accs.length} account${accs.length>1?'s':''}` : 'No accounts';
  if(accs.length===0){
    list.innerHTML=`<div class="list-empty">Create a savings account to track goals<br><span class="small">e.g. Emergency Fund, Travel, New Phone</span></div>`;
    return;
  }
  list.innerHTML=accs.map(a=>{
    const pct = a.goal && a.goal>0 ? Math.min(100, Math.round((a.balance/a.goal)*100)) : 0;
    return `
    <div class="card account-card" style="padding:12px">
      <div class="account-top">
        <div class="account-name"><span class="account-badge">${esc(a.icon||'🏦')}</span> <span>${esc(a.name)}</span></div>
        <span style="font-weight:800">${fmt(a.balance)}</span>
      </div>
      ${a.goal?`<div class="account-goal">Goal: ${fmt(a.goal)} · ${pct}%</div><div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`:''}
      <div class="account-actions">
        <button class="btn btn-primary" onclick="depositAccount('${a.id}')">+ Add</button>
        <button class="btn btn-ghost" onclick="withdrawAccount('${a.id}')">− Take</button>
        <button class="btn btn-ghost" onclick="editAccount('${a.id}')">Edit</button>
        <button class="btn btn-ghost" onclick="deleteAccount('${a.id}')" style="color:#dc2626;border-color:#fecaca">Delete</button>
      </div>
    </div>`;
  }).join('');
}
window.depositAccount=(id)=> openAccountTx(id, 'deposit');
window.withdrawAccount=(id)=> openAccountTx(id, 'withdraw');
window.deleteAccount=(id)=>{
  if(!confirm('Delete this savings account?')) return;
  const accs=Store.read(Store.keys.accounts).filter(a=>a.id!==id);
  Store.write(Store.keys.accounts, accs);
  renderAccounts(); renderFinance(document.getElementById('fin-search')?.value||''); updateStorageInfo(); toast('Account deleted');
};
window.editAccount=(id)=>{
  const acc=Store.read(Store.keys.accounts).find(a=>a.id===id);
  if(!acc) return;
  openAddAccount(acc);
};
function openAccountTx(id, type){
  const acc=Store.read(Store.keys.accounts).find(a=>a.id===id);
  if(!acc) return;
  openModal(type==='deposit' ? `Add to ${acc.name}` : `Take from ${acc.name}`, `
    <form id="form-acc-tx" class="form">
      <div class="field"><label>Amount (₱)</label><input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"></div>
      <div class="field"><label>Note</label><input name="note" placeholder="${type==='deposit'?'e.g. Salary bonus':'e.g. Emergency'}"></div>
      <button class="btn btn-primary btn-block" type="submit">${type==='deposit'?'Add Savings':'Withdraw'}</button>
    </form>
  `);
  document.getElementById('form-acc-tx').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const amount=Number(fd.get('amount'));
    if(!amount || amount<=0) return;
    if(type==='withdraw' && amount > acc.balance){ toast('Insufficient savings'); return; }
    const all=Store.read(Store.keys.accounts);
    const target=all.find(a=>a.id===id);
    if(type==='deposit') target.balance = Number((target.balance + amount).toFixed(2));
    else target.balance = Number((target.balance - amount).toFixed(2));
    Store.write(Store.keys.accounts, all);
    // also log as transaction for history
    const txAll=Store.read(Store.keys.tx);
    txAll.push({ id:newId(), type: type==='deposit'?'income':'expense', title: type==='deposit' ? `Savings: ${acc.name}` : `Withdraw: ${acc.name}`, amount, category: 'Savings', notes: String(fd.get('note')||'').trim(), date: ymd(new Date()) });
    Store.write(Store.keys.tx, txAll);
    closeModal(); renderAccounts(); renderFinance(document.getElementById('fin-search')?.value||''); renderHome(); updateStorageInfo(); toast(type==='deposit'?'Saved ✓':'Withdrawn ✓');
  });
}
function openAddAccount(editAcc=null){
  const isEdit=!!editAcc;
  openModal(isEdit?'Edit Savings Account':'New Savings Account', `
    <form id="form-account" class="form">
      <div class="field"><label>Account Name</label><input name="name" required value="${esc(editAcc?.name||'')}" placeholder="e.g. Emergency Fund"></div>
      <div class="field"><label>Icon (emoji)</label><input name="icon" value="${esc(editAcc?.icon||'🏦')}" placeholder="🏦" maxlength="2"></div>
      <div class="field"><label>Current Balance (₱)</label><input name="balance" type="number" step="0.01" min="0" value="${editAcc?.balance ?? 0}" required></div>
      <div class="field"><label>Goal Amount (₱) — optional</label><input name="goal" type="number" step="0.01" min="0" value="${editAcc?.goal || ''}" placeholder="e.g. 50000"></div>
      <button class="btn btn-primary btn-block" type="submit">${isEdit?'Save Changes':'Create Account'}</button>
    </form>
  `);
  document.getElementById('form-account').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const name=String(fd.get('name')).trim();
    if(!name) return;
    const balance=Number(fd.get('balance'))||0;
    const goal=fd.get('goal') ? Number(fd.get('goal')) : null;
    const icon=String(fd.get('icon')).trim()||'🏦';
    if(isEdit){
      const all=Store.read(Store.keys.accounts);
      const t=all.find(a=>a.id===editAcc.id);
      Object.assign(t, { name, icon, balance: Number(balance.toFixed(2)), goal: goal?Number(goal.toFixed(2)):null });
      Store.write(Store.keys.accounts, all);
      toast('Account updated ✓');
    } else {
      const all=Store.read(Store.keys.accounts);
      all.push({ id:newId(), name, icon, balance: Number(balance.toFixed(2)), goal: goal?Number(goal.toFixed(2)):null, createdAt:new Date().toISOString() });
      Store.write(Store.keys.accounts, all);
      toast('Account created ✓');
    }
    closeModal(); renderAccounts(); renderHome(); updateStorageInfo();
  });
}

function renderFinance(filter=''){
  renderAccounts();
  const q=filter.trim().toLowerCase();
  const listEl=document.getElementById('fin-list');
  const tx=Store.read(Store.keys.tx);
  const filtered=tx.filter(t=> !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || String(t.amount).includes(q));
  let income=0, expense=0;
  tx.forEach(t=>{ if(t.type==='income') income+=Number(t.amount); else expense+=Number(t.amount); });
  const bal=income-expense;
  const savingsTotal=Store.read(Store.keys.accounts).reduce((s,a)=> s+Number(a.balance||0),0);
  const set = (id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=fmt(v); };
  set('fin-income', income); set('fin-expense', expense); set('fin-balance', bal);

  if(filtered.length===0){
    listEl.innerHTML=`<div class="list-empty">No transactions yet.<br><span class="small">Use + Income / + Expense above.</span></div>`;
    return;
  }
  listEl.innerHTML=filtered.slice().reverse().map(t=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:2px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="font-weight:700">${esc(t.title)}</span>
        <span style="font-weight:800;color:${t.type==='income'?'#16a34a':'#dc2626'}">${t.type==='income'?'+':''}${fmt(t.amount)}</span>
      </div>
      <div class="small muted">${esc(t.category)} · ${esc(t.date)} ${t.notes?'· '+esc(t.notes):''}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteTx('${t.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.deleteTx=(id)=>{
  if(!confirm('Delete this transaction?')) return;
  const tx=Store.read(Store.keys.tx).filter(t=>t.id!==id);
  Store.write(Store.keys.tx, tx);
  renderFinance(document.getElementById('fin-search')?.value||'');
  updateStorageInfo();
  toast('Deleted');
};
function openAddTx(type='expense'){
  openModal(type==='income'?'Add Income':'Add Expense', `
    <form id="form-tx" class="form">
      <div class="field"><label>Title</label><input name="title" required placeholder="${type==='income'?'e.g. Salary':'e.g. Groceries'}" maxlength="60"></div>
      <div class="field"><label>Amount (₱)</label><input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"></div>
      <div class="field"><label>Category</label><select name="category">
        ${type==='income'
          ? '<option>Salary</option><option>Freelance</option><option>Investment</option><option>Other</option>'
          : '<option>Food</option><option>Transport</option><option>Shopping</option><option>Bills</option><option>Other</option>'}
      </select></div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Optional..."></textarea></div>
      <input type="hidden" name="type" value="${type}">
      <button class="btn btn-primary btn-block" type="submit">Save ${type==='income'?'Income':'Expense'}</button>
    </form>
  `);
  document.getElementById('form-tx').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const amount=Number(fd.get('amount'));
    if(!amount || amount<=0){ toast('Enter a valid amount'); return; }
    const tx={ id:newId(), type:String(fd.get('type')), title:String(fd.get('title')).trim(), amount, category:String(fd.get('category')), notes:String(fd.get('notes')||'').trim(), date:new Date().toISOString().slice(0,10) };
    const all=Store.read(Store.keys.tx);
    all.push(tx); Store.write(Store.keys.tx, all);
    closeModal(); renderFinance(document.getElementById('fin-search')?.value||''); renderHome(); logActivity(tx.type==='income'?'💰':'💸', (tx.type==='income'?'Income: ':'Expense: ')+tx.title+' '+fmt(tx.amount)); renderActivityLog(); updateStorageInfo(); toast('Saved ✓');
  });
}
function openAddNote(){
  openModal('Add Note', `
    <form id="form-note" class="form">
      <div class="field"><label>Title</label><input name="title" required placeholder="Note title" maxlength="60"></div>
      <div class="field"><label>Content</label><textarea name="content" rows="4" required placeholder="Write something..."></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Save Note</button>
    </form>
  `);
  document.getElementById('form-note').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    const content=String(fd.get('content')).trim();
    if(!title || !content) return;
    const all=Store.read(Store.keys.notes);
    all.push({ id:newId(), title, content, date: new Date().toISOString() });
    Store.write(Store.keys.notes, all);
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); logActivity('📝','Note: '+title); renderActivityLog(); updateStorageInfo(); toast('Note saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddTask(){
  openModal('Add Task', `
    <form id="form-task" class="form">
      <div class="field"><label>Title</label><input name="title" required placeholder="e.g. Finish report" maxlength="80"></div>
      <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${ymd(new Date())}" required></div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details..."></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Save Task</button>
    </form>
  `);
  document.getElementById('form-task').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    if(!title) return;
    const task={ id:newId(), title, dueDate:String(fd.get('dueDate')), priority:String(fd.get('priority')), notes:String(fd.get('notes')||'').trim(), completed:false, createdAt:new Date().toISOString() };
    const all=Store.read(Store.keys.tasks);
    all.push(task); Store.write(Store.keys.tasks, all);
    // also add as calendar event for visibility
    const evs=Store.read(Store.keys.events);
    evs.push({ id:'evt_'+task.id, date:task.dueDate, time:'', title:'Task: '+task.title, notes: task.priority + (task.notes? ' · '+task.notes:'') });
    Store.write(Store.keys.events, evs);
    closeModal(); renderCalendar(); renderMore(); renderLifeSpace(); renderHome(); logActivity('✅','Task: '+title); renderActivityLog(); updateLsTiles(); updateStorageInfo(); toast('Task saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddGoal(){
  openModal('Add Goal', `
    <form id="form-goal" class="form">
      <div class="field"><label>Title</label><input name="title" required placeholder="e.g. Learn coding" maxlength="80"></div>
      <div class="field"><label>Target Date</label><input type="date" name="targetDate" value="${ymd(new Date())}" required></div>
      <div class="field"><label>Category</label>
        <select name="category">
          <option value="personal">Personal</option>
          <option value="career">Career</option>
          <option value="finance">Finance</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
        </select>
      </div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details..."></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Save Goal</button>
    </form>
  `);
  document.getElementById('form-goal').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    if(!title) return;
    const goal={ id:newId(), title, targetDate:String(fd.get('targetDate')), category:String(fd.get('category')), priority:String(fd.get('priority')), notes:String(fd.get('notes')||'').trim(), completed:false, createdAt:new Date().toISOString() };
    const all=Store.read(Store.keys.goals);
    all.push(goal); Store.write(Store.keys.goals, all);
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); logActivity('🎯','Goal: '+title); renderActivityLog(); updateLsTiles(); updateStorageInfo(); toast('Goal saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddApplication(){
  openModal('Add Job Application', `
    <form id="form-app" class="form">
      <div class="field"><label>Company</label><input name="company" required placeholder="e.g. Acme Corp"></div>
      <div class="field"><label>Position</label><input name="position" required placeholder="e.g. Frontend Developer"></div>
      <div class="field"><label>Location</label><input name="location" placeholder="e.g. Manila / Remote"></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="wishlist">Wishlist</option>
          <option value="applied" selected>Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div class="field"><label>Date Applied</label><input type="date" name="dateApplied" value="${ymd(new Date())}"></div>
      <div class="field"><label>Notes / Link</label><textarea name="notes" rows="2" placeholder="Job link, notes..."></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Save Application</button>
    </form>
  `);
  document.getElementById('form-app').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const company=String(fd.get('company')).trim();
    const position=String(fd.get('position')).trim();
    if(!company || !position) return;
    const app={ id:newId(), company, position, location:String(fd.get('location')||'').trim(), status:String(fd.get('status')), dateApplied:String(fd.get('dateApplied')), notes:String(fd.get('notes')||'').trim(), createdAt:new Date().toISOString() };
    const all=Store.read(Store.keys.applications);
    all.push(app); Store.write(Store.keys.applications, all);
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); logActivity('💼','Job: '+company+' — '+position); renderActivityLog(); updateLsTiles(); updateStorageInfo(); toast('Application saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddProject(){
  openModal('Add Project', `
    <form id="form-project" class="form">
      <div class="field"><label>Project Name</label><input name="name" required placeholder="e.g. Portfolio Website" maxlength="80"></div>
      <div class="field"><label>Description</label><textarea name="description" rows="2" placeholder="What is this project about?"></textarea></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="planning">Planning</option>
          <option value="active" selected>Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="field"><label>Due Date</label><input type="date" name="dueDate"></div>
      <button class="btn btn-primary btn-block" type="submit">Save Project</button>
    </form>
  `);
  document.getElementById('form-project').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const name=String(fd.get('name')).trim();
    if(!name) return;
    const proj={ id:newId(), name, description:String(fd.get('description')||'').trim(), status:String(fd.get('status')), priority:String(fd.get('priority')), dueDate:String(fd.get('dueDate')||''), createdAt:new Date().toISOString() };
    const all=Store.read(Store.keys.projects);
    all.push(proj); Store.write(Store.keys.projects, all);
    closeModal(); renderLifeSpace(); renderHome(); logActivity('📁','Project: '+name); renderActivityLog(); updateLsTiles(); updateStorageInfo(); toast('Project saved ✓');
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openSettings(){
  const curTheme=document.documentElement.getAttribute('data-theme')||'light';
  const storageText=document.getElementById('storage-info')?.textContent||'—';
  openModal('Settings', `
    <div class="list" style="gap:10px">
      <div class="card" style="padding:12px">
        <div style="font-weight:700;margin-bottom:4px">Appearance</div>
        <div class="small muted">Current: ${curTheme==='dark'?'Night mode':'Day mode'}</div>
        <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="toggleTheme(); closeModal(); setTimeout(openSettings,150)">Toggle theme</button>
      </div>
      <div class="card" style="padding:12px">
        <div style="font-weight:700">App Info</div>
        <div class="small muted" style="margin-top:4px">Nooka · PWA · offline-ready<br>Version 1.0 · Stored locally on this device</div>
        <div class="small muted" style="margin-top:8px;word-break:break-all">${storageText}</div>
      </div>
      <div class="card" style="padding:12px">
        <div style="font-weight:700">Data</div>
        <button class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="if(confirm('Clear ALL data?')){ Object.values(Store.keys).forEach(k=>localStorage.removeItem(k)); localStorage.removeItem(PROFILE_KEY); renderFinance(''); renderCalendar(); renderHome(); renderActivityLog(); updateLsTiles(); updateStorageInfo(); closeModal(); toast('Cleared'); }">Clear all data</button>
      </div>
    </div>
  `);
}
function openHelp(){
  openModal('Help & Feedback', `
    <div class="list" style="gap:10px">
      <div class="card" style="padding:12px">
        <div style="font-weight:700">How to use</div>
        <div class="small muted" style="margin-top:6px;line-height:1.6">
          • <b>Home</b> — greeting + today's focus<br>
          • <b>LifeSpace</b> — tap a tile (Calendar/Events/Notes/Jobs/Projects/Tasks/Goals) → detail → Back to grid. Toggle Grid/List at top.<br>
          • <b>Center +</b> — quick add Event/Note/Task/Goal/Job/Project anywhere<br>
          • <b>Finance</b> — savings accounts (collapsible), + Income/Expense<br>
          • <b>More</b> — profile, activity log, settings & theme
        </div>
      </div>
      <div class="card" style="padding:12px">
        <div style="font-weight:700">Feedback</div>
        <div class="small muted" style="margin-top:4px">This demo stores everything locally (no server). To export, use Clear/Storage info in More.</div>
        <a class="btn btn-ghost btn-block" style="margin-top:8px" href="mailto:hello@example.com">Send feedback</a>
      </div>
    </div>
  `);
}
function openNotifications(){
  const today=ymd(new Date());
  const upcomingTasks=Store.read(Store.keys.tasks).filter(t=>!t.completed).sort((a,b)=> a.dueDate.localeCompare(b.dueDate)).slice(0,5);
  const upcomingEvents=Store.read(Store.keys.events).filter(e=> e.date>=today).sort((a,b)=> a.date.localeCompare(b.date)).slice(0,5);
  const recentLog=Store.read(Store.keys.log).slice(-5).reverse();
  let html='<div class="list" style="gap:10px">';
  if(upcomingTasks.length===0 && upcomingEvents.length===0) html+='<div class="list-empty">No upcoming items — all clear! 🎉</div>';
  else {
    if(upcomingTasks.length) {
      html+='<div class="small muted" style="font-weight:700;margin-top:4px">Upcoming Tasks</div>';
      upcomingTasks.forEach(t=>{ html+=`<div class="list-item" style="gap:10px;padding:10px 12px"><span>✅</span><span style="flex:1;min-width:0"><span style="font-weight:600;font-size:13px">${esc(t.title)}</span><span class="small muted">${esc(t.dueDate)} · ${esc(t.priority)}</span></span></div>`; });
    }
    if(upcomingEvents.length) {
      html+='<div class="small muted" style="font-weight:700;margin-top:8px">Upcoming Events</div>';
      upcomingEvents.forEach(e=>{ html+=`<div class="list-item" style="gap:10px;padding:10px 12px"><span>📅</span><span style="flex:1;min-width:0"><span style="font-weight:600;font-size:13px">${esc(e.title)}</span><span class="small muted">${esc(e.date)} ${esc(e.time||'')}</span></span></div>`; });
    }
  }
  if(recentLog.length) {
    html+='<div class="small muted" style="font-weight:700;margin-top:8px">Recent Activity</div>';
    recentLog.forEach(l=>{ const ago=timeAgo(new Date(l.at)); html+=`<div class="list-item" style="gap:10px;padding:8px 12px"><span>${esc(l.icon)}</span><span style="flex:1;min-width:0;font-size:13px">${esc(l.text)}</span><span class="small muted">${ago}</span></div>`; });
  }
  html+='</div>';
  openModal('Notifications', html);
}
window.openSettings=openSettings;
window.openHelp=openHelp;
window.openNotifications=openNotifications;

// ---------- LifeSpace — Grid / List toggle + Detail ----------
let lsView = localStorage.getItem('ls_view') || 'grid';
function setLsView(view){
  lsView = view;
  localStorage.setItem('ls_view', view);
  const gridBtn=document.getElementById('ls-view-grid');
  const listBtn=document.getElementById('ls-view-list');
  const hint=document.getElementById('ls-view-hint');
  if(gridBtn) { gridBtn.classList.toggle('active', view==='grid'); gridBtn.setAttribute('aria-pressed', view==='grid'); }
  if(listBtn) { listBtn.classList.toggle('active', view==='list'); listBtn.setAttribute('aria-pressed', view==='list'); }
  if(hint) hint.textContent = view==='grid' ? 'Tap a tile to open — grid overview.' : 'Tap a row to open — list overview.';
  const grid=document.getElementById('ls-grid');
  const list=document.getElementById('ls-list');
  const detail=document.getElementById('ls-detail');
  const inDetail = detail && !detail.hidden;
  if(inDetail){
    // keep detail visible, hide both overviews
    if(grid) grid.hidden=true;
    if(list) list.hidden=true;
  } else {
    if(view==='grid'){
      if(grid) grid.hidden=false;
      if(list) list.hidden=true;
      if(detail) detail.hidden=true;
    } else {
      if(grid) grid.hidden=true;
      if(list) list.hidden=false;
      if(detail) detail.hidden=true;
    }
  }
}
function updateLsTiles(){
  const evCount = Store.read(Store.keys.events).length;
  const noteCount = Store.read(Store.keys.notes).length;
  const jobCount = Store.read(Store.keys.applications).length;
  const projCount = Store.read(Store.keys.projects).length;
  const taskCount = Store.read(Store.keys.tasks).length;
  const goalCount = Store.read(Store.keys.goals).length;
  const calText = new Date().toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'});
  const calSub = document.getElementById('ls-tile-cal-sub');
  if(calSub) calSub.textContent = calText;
  const evSub = document.getElementById('ls-tile-events-sub');
  if(evSub) evSub.textContent = evCount ? `${evCount} event${evCount>1?'s':''} · ${ymd(selectedDate)}` : 'No events';
  const nSub = document.getElementById('ls-tile-notes-sub');
  if(nSub) nSub.textContent = noteCount ? `${noteCount} note${noteCount>1?'s':''}` : 'No notes';
  const jSub = document.getElementById('ls-tile-jobs-sub');
  if(jSub) jSub.textContent = jobCount ? `${jobCount} application${jobCount>1?'s':''}` : 'No jobs';
  const pSub = document.getElementById('ls-tile-projects-sub');
  if(pSub) pSub.textContent = projCount ? `${projCount} project${projCount>1?'s':''}` : 'No projects';
  const tSub = document.getElementById('ls-tile-tasks-sub');
  if(tSub) tSub.textContent = taskCount ? `${taskCount} task${taskCount>1?'s':''}` : 'No tasks';
  const gSub = document.getElementById('ls-tile-goals-sub');
  if(gSub) gSub.textContent = goalCount ? `${goalCount} goal${goalCount>1?'s':''}` : 'No goals';
  // list view subs
  const lCal=document.getElementById('ls-list-cal-sub'); if(lCal) lCal.textContent=calText;
  const lEv=document.getElementById('ls-list-events-sub'); if(lEv) lEv.textContent= evCount ? `${evCount} events` : 'No events';
  const lN=document.getElementById('ls-list-notes-sub'); if(lN) lN.textContent= noteCount ? `${noteCount} notes` : 'No notes';
  const lJ=document.getElementById('ls-list-jobs-sub'); if(lJ) lJ.textContent= jobCount ? `${jobCount} jobs` : 'No jobs';
  const lP=document.getElementById('ls-list-projects-sub'); if(lP) lP.textContent= projCount ? `${projCount} projects` : 'No projects';
  const lT=document.getElementById('ls-list-tasks-sub'); if(lT) lT.textContent= taskCount ? `${taskCount} tasks` : 'No tasks';
  const lG=document.getElementById('ls-list-goals-sub'); if(lG) lG.textContent= goalCount ? `${goalCount} goals` : 'No goals';
}
function openLsDetail(type){
  const grid=document.getElementById('ls-grid');
  const list=document.getElementById('ls-list');
  const detail=document.getElementById('ls-detail');
  if(!detail) return;
  if(grid) grid.hidden=true;
  if(list) list.hidden=true;
  detail.hidden=false;
  document.querySelectorAll('.ls-detail-panel').forEach(p=> p.hidden=true);
  const map={ calendar:'ls-panel-calendar', events:'ls-panel-events', notes:'ls-panel-notes', jobs:'ls-panel-jobs', projects:'ls-panel-projects', tasks:'ls-panel-tasks', goals:'ls-panel-goals' };
  const target=document.getElementById(map[type]);
  if(target) target.hidden=false;
  detail.scrollIntoView({behavior:'smooth', block:'start'});
  if(type==='calendar' || type==='events'){ renderCalendar(); }
  if(type==='notes') renderLsNotes();
  if(type==='jobs') renderLsApps();
  if(type==='projects') renderLsProjects();
  if(type==='tasks') renderLsTasks();
  if(type==='goals') renderLsGoals();
}
function closeLsDetail(){
  const detail=document.getElementById('ls-detail');
  if(detail) detail.hidden=true;
  document.querySelectorAll('.ls-detail-panel').forEach(p=> p.hidden=true);
  // restore correct overview
  setLsView(lsView);
}
function renderLifeSpace(){
  updateLsTiles();
  renderLsNotes();
  renderLsApps();
  renderLsProjects();
  renderLsTasks();
}
function renderLsNotes(filter=''){
  const list=document.getElementById('ls-notes-list');
  const count=document.getElementById('ls-notes-count');
  const search=document.getElementById('ls-notes-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const notes=Store.read(Store.keys.notes);
  const filtered=notes.filter(n=> !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching notes':'No notes yet<br><span class="small">Use + Note</span>'}</div>`;
    return;
  }
  list.innerHTML=filtered.slice().reverse().map(n=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="font-weight:700">${esc(n.title)}</div>
      <div class="small muted" style="white-space:pre-wrap">${esc(n.content)}</div>
      <div class="small muted">${new Date(n.date).toLocaleDateString()}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteNote('${n.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.deleteNote=(id)=>{
  if(!confirm('Delete this note?')) return;
  const all=Store.read(Store.keys.notes).filter(n=>n.id!==id);
  Store.write(Store.keys.notes, all);
  renderLsNotes(); updateLsTiles(); updateStorageInfo(); toast('Note deleted');
};
function renderLsApps(filter=''){
  const list=document.getElementById('ls-apps-list');
  const count=document.getElementById('ls-apps-count');
  const search=document.getElementById('ls-apps-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const apps=Store.read(Store.keys.applications);
  const filtered=apps.filter(a=> !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q) || a.status.toLowerCase().includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching applications':'No applications yet<br><span class="small">Use + Job</span>'}</div>`;
    return;
  }
  const statusColor={ wishlist:'#64748b', applied:'#3b82f6', interview:'#f59e0b', offer:'#16a34a', rejected:'#dc2626' };
  list.innerHTML=filtered.slice().reverse().map(a=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <span style="font-weight:700">${esc(a.company)} — ${esc(a.position)}</span>
        <span class="small" style="padding:2px 8px;border-radius:999px;background:${statusColor[a.status]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(a.status)}</span>
      </div>
      <div class="small muted">${esc(a.location||'')} ${a.dateApplied?'· '+esc(a.dateApplied):''}</div>
      ${a.notes?`<div class="small muted">${esc(a.notes)}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteApp('${a.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.deleteApp=(id)=>{
  if(!confirm('Delete this application?')) return;
  const all=Store.read(Store.keys.applications).filter(a=>a.id!==id);
  Store.write(Store.keys.applications, all);
  renderLsApps(); updateLsTiles(); updateStorageInfo(); toast('Application deleted');
};
function renderLsProjects(filter=''){
  const list=document.getElementById('ls-projects-list');
  const count=document.getElementById('ls-projects-count');
  const search=document.getElementById('ls-projects-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const projs=Store.read(Store.keys.projects);
  const filtered=projs.filter(p=> !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q) || p.status.includes(q) || (p.priority||'').includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching projects':'No projects yet<br><span class="small">Use + Project</span>'}</div>`;
    return;
  }
  const statusColor={ planning:'#64748b', active:'#3b82f6', on_hold:'#f59e0b', completed:'#16a34a' };
  const priorityColor={ low:'#64748b', medium:'#3b82f6', high:'#f59e0b', urgent:'#dc2626' };
  list.innerHTML=filtered.slice().reverse().map(p=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <span style="font-weight:700">${esc(p.name)}</span>
        <span style="display:flex;gap:6px;flex-shrink:0">
          ${p.priority?`<span class="small" style="padding:2px 8px;border-radius:999px;background:${priorityColor[p.priority]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(p.priority)}</span>`:''}
          <span class="small" style="padding:2px 8px;border-radius:999px;background:${statusColor[p.status]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(p.status)}</span>
        </span>
      </div>
      ${p.description?`<div class="small muted">${esc(p.description)}</div>`:''}
      ${p.dueDate?`<div class="small muted">Due: ${esc(p.dueDate)}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.deleteProject=(id)=>{
  if(!confirm('Delete this project?')) return;
  const all=Store.read(Store.keys.projects).filter(p=>p.id!==id);
  Store.write(Store.keys.projects, all);
  renderLsProjects(); updateLsTiles(); updateStorageInfo(); toast('Project deleted');
};
function renderLsTasks(filter=''){
  const list=document.getElementById('ls-tasks-list');
  const count=document.getElementById('ls-tasks-count');
  const search=document.getElementById('ls-tasks-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const tasks=Store.read(Store.keys.tasks);
  const filtered=tasks.filter(t=> !q || t.title.toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q) || t.priority.includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching tasks':'No tasks yet<br><span class="small">Use + Task</span>'}</div>`;
    return;
  }
  list.innerHTML=filtered.slice().reverse().map(t=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px;${t.completed?'opacity:.6':''}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer">
          <input type="checkbox" ${t.completed?'checked':''} onchange="toggleLsTask('${t.id}')" style="width:18px;height:18px">
          <span style="${t.completed?'text-decoration:line-through':''}">${esc(t.title)}</span>
        </label>
        <span class="small" style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-weight:700">${esc(t.priority)}</span>
      </div>
      <div class="small muted">${esc(t.dueDate)} ${t.notes?'· '+esc(t.notes):''}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteLsTask('${t.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.toggleLsTask=(id)=>{
  const all=Store.read(Store.keys.tasks);
  const t=all.find(x=>x.id===id);
  if(t){ t.completed=!t.completed; Store.write(Store.keys.tasks, all); renderLsTasks(); updateLsTiles(); }
};
window.deleteLsTask=(id)=>{
  if(!confirm('Delete this task?')) return;
  const all=Store.read(Store.keys.tasks).filter(t=>t.id!==id);
  Store.write(Store.keys.tasks, all);
  const evs=Store.read(Store.keys.events).filter(e=>e.id!=='evt_'+id);
  Store.write(Store.keys.events, evs);
  renderLsTasks(); renderCalendar(); updateLsTiles(); updateStorageInfo(); toast('Task deleted');
};

// ---------- LifeSpace: Goals ----------
function renderLsGoals(filter){
  const list=document.getElementById('ls-goals-list');
  const count=document.getElementById('ls-goals-count');
  const search=document.getElementById('ls-goals-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const goals=Store.read(Store.keys.goals);
  const filtered=goals.filter(g=> !q || g.title.toLowerCase().includes(q) || (g.notes||'').toLowerCase().includes(q) || g.category.includes(q) || (g.priority||'').includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching goals':'No goals yet<br><span class="small">Use + Goal</span>'}</div>`;
    return;
  }
  const priorityColor={ low:'#64748b', medium:'#3b82f6', high:'#f59e0b', urgent:'#dc2626' };
  list.innerHTML=filtered.slice().reverse().map(g=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px;${g.completed?'opacity:.6':''}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer">
          <input type="checkbox" ${g.completed?'checked':''} onchange="toggleLsGoal('${g.id}')" style="width:18px;height:18px">
          <span style="${g.completed?'text-decoration:line-through':''}">${esc(g.title)}</span>
        </label>
        <span style="display:flex;gap:6px;flex-shrink:0">
          ${g.priority?`<span class="small" style="padding:2px 8px;border-radius:999px;background:${priorityColor[g.priority]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(g.priority)}</span>`:''}
          <span class="small" style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-weight:700">${esc(g.category)}</span>
        </span>
      </div>
      <div class="small muted">${esc(g.targetDate)} ${g.notes?'· '+esc(g.notes):''}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteLsGoal('${g.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.toggleLsGoal=(id)=>{
  const all=Store.read(Store.keys.goals);
  const g=all.find(x=>x.id===id);
  if(g){ g.completed=!g.completed; Store.write(Store.keys.goals, all); renderLsGoals(); updateLsTiles(); }
};
window.deleteLsGoal=(id)=>{
  if(!confirm('Delete this goal?')) return;
  const all=Store.read(Store.keys.goals).filter(g=>g.id!==id);
  Store.write(Store.keys.goals, all);
  renderLsGoals(); updateLsTiles(); updateStorageInfo(); toast('Goal deleted');
};

// ---------- More ----------
function renderMore(){
  // Tasks/Notes/Applications are managed from LifeSpace; nothing else to render here.
}

// ---------- Sheet / Modal ----------
function openSheet(){
  document.getElementById('sheet-overlay').hidden=false;
  document.getElementById('action-sheet').hidden=false;
  document.body.style.overflow='hidden';
}
window.closeSheet = closeSheet; window.closeModal = closeModal; window.closeLsDetail = closeLsDetail; window.openLsDetail = openLsDetail; window.setPage = setPage; function closeSheet(){
  document.getElementById('sheet-overlay').hidden=true;
  document.getElementById('action-sheet').hidden=true;
  document.body.style.overflow='';
}
function openModal(title, bodyHtml){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=bodyHtml;
  document.getElementById('modal-overlay').hidden=false;
  document.getElementById('modal').hidden=false;
  closeSheet();
}
function closeModal(){
  document.getElementById('modal-overlay').hidden=true;
  document.getElementById('modal').hidden=true;
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', ()=>{
  // sync theme toggle (init ran before DOM, sync checkbox)
  try{ const cur=document.documentElement.getAttribute('data-theme'); if(cur) applyTheme(cur); }catch{}
  // Profile + greeting + dashboard
  // init collapsibles
  document.getElementById('profile-toggle')?.addEventListener('click', ()=> setProfileCollapsed(!profileCollapsed));
  document.getElementById('activity-toggle')?.addEventListener('click', ()=> setActivityCollapsed(!activityCollapsed));
  updateProfileUI();
  updateHomeGreeting();
  renderHome();
  renderActivityLog();
  document.getElementById('profile-save')?.addEventListener('click', ()=>{
    const v=document.getElementById('profile-input')?.value||'';
    setProfileName(v);
  });
  document.getElementById('profile-input')?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); setProfileName(e.target.value); }
  });
  renderFinance('');
  updateStorageInfo();

  // Nav (exclude FAB)
  document.querySelectorAll('.bottom-nav .nav-btn[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> setPage(btn.dataset.nav));
  });

  // FAB action
  document.getElementById('fab-action')?.addEventListener('click', openSheet);
  document.getElementById('sheet-overlay')?.addEventListener('click', closeSheet);
  document.getElementById('sheet-close')?.addEventListener('click', closeSheet);
  document.querySelectorAll('.sheet-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const act=b.dataset.sheet;
      if(act==='event') openAddEvent();
      if(act==='note') openAddNote();
      if(act==='task') openAddTask();
      if(act==='goal') openAddGoal();
      if(act==='application') openAddApplication();
      if(act==='project') openAddProject();
    });
  });

  // Calendar nav
  document.getElementById('cal-prev')?.addEventListener('click', ()=>{ calDate=new Date(calDate.getFullYear(), calDate.getMonth()-1, 1); renderCalendar(); });
  document.getElementById('cal-next')?.addEventListener('click', ()=>{ calDate=new Date(calDate.getFullYear(), calDate.getMonth()+1, 1); renderCalendar(); });
  document.getElementById('cal-add-btn')?.addEventListener('click', ()=> openAddEvent());

  // Finance search
  document.getElementById('fin-search')?.addEventListener('input', e=> renderFinance(e.target.value));

  document.getElementById('savings-toggle')?.addEventListener('click', ()=> setSavingsCollapsed(!savingsCollapsed));
  document.getElementById('btn-add-account')?.addEventListener('click', ()=> { if(savingsCollapsed) setSavingsCollapsed(false); openAddAccount(); });

  // LifeSpace toggle
  document.getElementById('ls-view-grid')?.addEventListener('click', ()=> setLsView('grid'));
  document.getElementById('ls-view-list')?.addEventListener('click', ()=> setLsView('list'));
  setLsView(lsView);
  // LifeSpace tiles + list rows
  document.querySelectorAll('.ls-tile').forEach(btn=>{
    btn.addEventListener('click', ()=> openLsDetail(btn.dataset.ls));
  });
  document.querySelectorAll('.ls-list-item').forEach(btn=>{
    btn.addEventListener('click', ()=> openLsDetail(btn.dataset.ls));
  });
  document.getElementById('ls-back')?.addEventListener('click', closeLsDetail);
  // LifeSpace search
  document.getElementById('ls-notes-search')?.addEventListener('input', e=> renderLsNotes(e.target.value));
  document.getElementById('ls-apps-search')?.addEventListener('input', e=> renderLsApps(e.target.value));
  document.getElementById('ls-projects-search')?.addEventListener('input', e=> renderLsProjects(e.target.value));
  document.getElementById('ls-tasks-search')?.addEventListener('input', e=> renderLsTasks(e.target.value));
  document.getElementById('ls-goals-search')?.addEventListener('input', e=> renderLsGoals(e.target.value));
  // (More page search boxes removed — Tasks/Notes/Applications are managed from LifeSpace)

  // Finance add buttons (since removed from FAB)
  document.getElementById('fin-add-income')?.addEventListener('click', ()=> openAddTx('income'));
  document.getElementById('fin-add-expense')?.addEventListener('click', ()=> openAddTx('expense'));
  document.getElementById('fin-add-btn')?.addEventListener('click', ()=>{
    openModal('Add Transaction', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-primary" id="modal-income">+ Income</button>
        <button class="btn btn-ghost" id="modal-expense">+ Expense</button>
      </div>
    `);
    document.getElementById('modal-income').addEventListener('click', ()=> openAddTx('income'));
    document.getElementById('modal-expense').addEventListener('click', ()=> openAddTx('expense'));
  });

  document.getElementById('import-file')?.addEventListener('change', (e)=>{
    const f=e.target.files && e.target.files[0];
    if(f) importBackupFile(f);
    e.target.value='';
  });
  document.getElementById('btn-clear-log')?.addEventListener('click', ()=>{
    if(!confirm('Clear activity log?')) return;
    Store.write(Store.keys.log, []);
    renderActivityLog();
    toast('Log cleared');
  });
  // More actions — theme toggle
  // theme toggle - robust: handle both change and label click
  const themeToggleEl=document.getElementById('theme-toggle');
  const themeRow=themeToggleEl ? themeToggleEl.closest('label') : null;
  function handleThemeToggle(e){
    if(e) e.preventDefault();
    toggleTheme();
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    toast(isDark ? 'Night mode' : 'Day mode', 1200);
  }
  if(themeRow){ themeRow.addEventListener('click', (e)=>{ if(e.target.id==='theme-toggle' || e.target.closest('.toggle')) return; handleThemeToggle(e); }); }
  document.getElementById('theme-toggle')?.addEventListener('click', (e)=>{
    e.preventDefault();
    handleThemeToggle(e);
  });
  // keep change as fallback
  document.getElementById('theme-toggle')?.addEventListener('change', ()=>{
    handleThemeToggle();
  });
  // expose
  window.toggleTheme=toggleTheme;
  document.querySelector('[data-action="clear"]')?.addEventListener('click', ()=>{
    if(!confirm('Clear ALL data (transactions, events, tasks, goals, notes, applications)?')) return;
    Object.values(Store.keys).forEach(k=> localStorage.removeItem(k));
    renderFinance(''); renderCalendar(); renderActivityLog(); updateStorageInfo(); toast('Cleared');
  });


  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeSheet(); closeModal(); }});

  // Install + Notifications
  document.getElementById('btn-install')?.addEventListener('click', triggerInstall);
  document.getElementById('btn-install-more')?.addEventListener('click', triggerInstall);
  document.getElementById('btn-notif')?.addEventListener('click', openNotifications);

  // Seed demo if empty (first run)
  if(Store.read(Store.keys.tx).length===0){
    Store.write(Store.keys.tx, [
      {id:'t1', type:'income', title:'Salary', amount:25000, category:'Salary', notes:'', date:ymd(new Date())},
      {id:'t2', type:'expense', title:'Groceries', amount:1250.5, category:'Food', notes:'SM', date:ymd(new Date())},
    ]);
    renderFinance('');
  }
  if(Store.read(Store.keys.events).length===0){
    Store.write(Store.keys.events, [{id:'e1', date:ymd(new Date()), time:'09:00', title:'Welcome event — tap to manage', notes:'Edit me'}]);
  }
  if(Store.read(Store.keys.accounts).length===0){
    Store.write(Store.keys.accounts, [
      {id:'a1', name:'Emergency Fund', icon:'🛡️', balance:8000, goal:50000, createdAt:new Date().toISOString()},
      {id:'a2', name:'Travel', icon:'✈️', balance:2500, goal:20000, createdAt:new Date().toISOString()},
    ]);
  }
  if(Store.read(Store.keys.tasks).length===0){
    Store.write(Store.keys.tasks, [
      {id:'tk1', title:'Finish portfolio', dueDate: ymd(new Date()), priority:'high', notes:'Add projects section', completed:false, createdAt:new Date().toISOString()},
    ]);
  }
  if(Store.read(Store.keys.notes).length===0){
    Store.write(Store.keys.notes, [
      {id:'n1', title:'Welcome note', content:'This is your first note — edit or delete me. Created via + Note.', date:new Date().toISOString()},
    ]);
  }
  if(Store.read(Store.keys.applications).length===0){
    Store.write(Store.keys.applications, [
      {id:'j1', company:'Acme Corp', position:'Frontend Dev', location:'Manila', status:'applied', dateApplied: ymd(new Date()), notes:'https://example.com/job', createdAt:new Date().toISOString()},
    ]);
  }
  if(Store.read(Store.keys.projects).length===0){
    Store.write(Store.keys.projects, [
      {id:'pr1', name:'Portfolio Website', description:'Personal portfolio to showcase work', status:'active', priority:'medium', dueDate:'', createdAt:new Date().toISOString()},
    ]);
  }

  renderCalendar();
  renderFinance('');
  renderMore();
  renderLifeSpace();
  setPage('home');
});
