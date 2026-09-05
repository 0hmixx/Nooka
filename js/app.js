// Nooka — Home | LifeSpace | Action | Finance | More
// LifeSpace: Calendar + Events + Notes + Job Applications + Projects | Action sheet: Event/Note/Task/Job/Project
const TRASH_SVG='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function sanitizeId(id){ return String(id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32) || newId(); }
function isSafeId(id){ return /^[a-zA-Z0-9_-]{4,32}$/.test(String(id)); }
const Store = {
  keys: { tx: 'mobileApp_tx_v2', events: 'mobileApp_events_v2', tasks: 'mobileApp_tasks_v1', notes: 'mobileApp_notes_v1', applications: 'mobileApp_applications_v1', accounts: 'mobileApp_accounts_v1', projects: 'mobileApp_projects_v1', goals: 'mobileApp_goals_v1', habits: 'mobileApp_habits_v1', log: 'mobileApp_log_v1' },
  read(key){ try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch{ return []; } },
  write(key,val){
    try{
      const s=JSON.stringify(val);
      if(s.length>2000000) throw new Error('Quota');
      localStorage.setItem(key, s);
    }catch(e){
      if(e.name==='QuotaExceededError' || /Quota/.test(e.message)){
        toast('Storage full — export backup and clear old data');
        try{ if(navigator.storage && navigator.storage.estimate){ navigator.storage.estimate().then(est=> console.warn('storage',est)); } }catch{}
      } else { console.error('Store.write',e); }
      throw e;
    }
  },
};
function newId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseYMD(s){ const [y,m,da]=String(s).split('-').map(Number); return new Date(y, (m||1)-1, da||1); }
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
function validateBackupArray(arr, key){
  if(!Array.isArray(arr)) return false;
  if(arr.length>500) return false;
  if(JSON.stringify(arr).length>800000) return false;
  // basic shape check + sanitize ids
  return arr.every(o=>{
    if(!o || typeof o!=='object') return false;
    if(o.id && !isSafeId(String(o.id))) o.id=sanitizeId(o.id);
    return true;
  });
}
function importBackupFile(file){
  if(!file) return;
  if(file.size>2000000){ toast('Backup too large'); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(typeof data!=='object' || data===null) throw new Error('Invalid');
      let count=0;
      Object.entries(Store.keys).forEach(([k,v])=>{ if(validateBackupArray(data[v], v)){ const clean=data[v].slice(0,500); Store.write(v,clean); count++; } });
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
  const habits=Store.read(Store.keys.habits);
  const sLS=document.getElementById('home-stat-lifespace');
  if(sLS) sLS.textContent = `${notes.length} note${notes.length!==1?'s':''} · ${apps.length} job${apps.length!==1?'s':''} · ${projects.length} project${projects.length!==1?'s':''}${habits.length?` · ${habits.length} habit${habits.length!==1?'s':''}`:''}`;
  // Habits today (Home dashboard)
  const hCountEl=document.getElementById('home-habits-count');
  const hListEl=document.getElementById('home-habits-list');
  const hCardEl=document.getElementById('home-habits-card');
  if(hCountEl && hListEl && hCardEl){
    if(habits.length===0){
      hCountEl.textContent='· 0';
      hListEl.innerHTML=`<div class="list-empty" style="padding:12px">No habits yet — <button class="btn btn-ghost" style="min-height:32px;padding:0 10px;font-size:12px;margin-left:6px" onclick="openAddHabit()">+ Add Habit</button></div>`;
    } else {
      const todaySet=new Set(habits.filter(h=> (h.completions||[]).includes(todayStr)).map(h=>h.id));
      const doneToday=todaySet.size;
      hCountEl.textContent=`· ${doneToday}/${habits.length} done`;
      hListEl.innerHTML=habits.slice().reverse().slice(0,4).map(h=>{
        const st=computeHabitStreaks(h);
        const isDone=st.isToday;
        return `<div class="list-item" style="gap:10px;padding:10px 12px">
          <span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--border);font-size:18px">${esc(h.icon||'🔁')}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.name)} <span class="small muted" style="font-weight:400">· ${esc(h.frequency)}${h.customFrequency?' · '+esc(h.customFrequency):''}</span></span>
            <span class="small muted" style="display:flex;gap:6px;align-items:center">🔥 ${st.current} streak · 🏆 ${st.longest} best · <span class="progress" style="flex:1;max-width:80px;height:6px"><span class="progress-fill" style="width:${st.progressPct}%"></span></span> ${st.progressPct}%</span>
          </span>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600"><input type="checkbox" ${isDone?'checked':''} onchange="toggleHabit('${h.id}'); setTimeout(renderHome,80)" style="width:18px;height:18px">${isDone?'Done':'Do'}</label>
        </div>`;
      }).join('') + (habits.length>4?`<div class="small muted" style="text-align:center">+${habits.length-4} more in LifeSpace → Habits</div>`:'');
    }
  }
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
    const habits = localStorage.getItem(Store.keys.habits)||'[]';
    const len = new Blob([tx+ev+tasks+notes+apps+acc+projs+goals+habits]).size;
    const el=document.getElementById('storage-info');
    if(el) el.textContent = `${Store.read(Store.keys.tx).length} tx · ${Store.read(Store.keys.events).length} events · ${Store.read(Store.keys.tasks).length} tasks · ${Store.read(Store.keys.goals).length} goals · ${Store.read(Store.keys.habits).length} habits · ${Store.read(Store.keys.notes).length} notes · ${Store.read(Store.keys.applications).length} jobs · ${Store.read(Store.keys.projects).length} projects · ${Store.read(Store.keys.accounts).length} accounts · ~${(len/1024).toFixed(1)} KB`;
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
      selectedDate=parseYMD(btn.dataset.date);
      renderCalendar();
      renderCalEvents();
    });
  });
  renderCalEvents();
}
function renderCalEvents(){
  const label=document.getElementById('cal-selected-label');
  const list=document.getElementById('cal-events');
  const inlineLabel=document.getElementById('cal-inline-label');
  const inlineList=document.getElementById('cal-inline-events');
  const iso=ymd(selectedDate);
  if(label) label.textContent = selectedDate.toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'});
  if(inlineLabel) inlineLabel.textContent = selectedDate.toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'});
  const events=Store.read(Store.keys.events).filter(e=>e.date===iso).sort((a,b)=> (a.time||'').localeCompare(b.time||''));
  const html= events.length===0
    ? `<div class="list-empty">No events for ${iso}<br><span class="small">Tap + Event to create one.</span></div>`
    : events.map(e=>`
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteEvent('${e.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;cursor:pointer" onclick="openAddEvent(null,'${e.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <span style="font-weight:700">${esc(e.title)}</span>
          <span class="small muted">${esc(e.time||'')}</span>
        </div>
        ${e.notes?`<div class="small muted">${esc(e.notes)}</div>`:''}
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  if(list) { list.innerHTML=html; initSwipe('#cal-events'); }
  if(inlineList) { inlineList.innerHTML=html; initSwipe('#cal-inline-events'); }
  // if date has events and user is on calendar panel, ensure inline is visible; optionally auto-focus
  if(events.length>0 && inlineList){
    inlineList.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
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
function openAddEvent(prefillDate, editId){
  if(prefillDate) selectedDate=parseYMD(prefillDate);
  const isEdit=!!editId;
  const evEdit=isEdit ? Store.read(Store.keys.events).find(ev=>ev.id===editId) : null;
  if(isEdit && !evEdit){ toast('Event not found'); return; }
  const defaultDate=isEdit ? evEdit.date : ymd(selectedDate);
  openModal(isEdit?'Edit Event':'New Event', `
    <form id="form-event" class="form">
      <div class="field"><label>Date</label><input type="date" name="date" value="${esc(defaultDate)}" required></div>
      <div class="field"><label>Time</label><input type="time" name="time" value="${esc(evEdit?.time||'')}"></div>
      <div class="field"><label>Title</label><input name="title" required value="${esc(evEdit?.title||'')}" placeholder="e.g. Team standup" maxlength="60"></div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details...">${esc(evEdit?.notes||'')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteEvent('${evEdit.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-event').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    const date=String(fd.get('date'));
    if(!title||!date) return;
    if(isEdit){
      const all=Store.read(Store.keys.events);
      const t=all.find(x=>x.id===editId);
      if(t){ t.date=date; t.time=String(fd.get('time')||''); t.title=title; t.notes=String(fd.get('notes')||'').trim(); Store.write(Store.keys.events, all); logActivity('✏️','Event updated: '+title+' · '+date); toast('Event updated ✓'); }
    } else {
      const ev={ id:newId(), date, time:String(fd.get('time')||''), title, notes:String(fd.get('notes')||'').trim() };
      const all=Store.read(Store.keys.events);
      all.push(ev); Store.write(Store.keys.events, all);
      logActivity('📅','Event: '+ev.title+' · '+ev.date); toast('Event saved ✓');
    }
    closeModal(); renderCalendar(); updateLsTiles(); renderHome(); renderActivityLog(); updateStorageInfo();
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
        <button class="btn btn-ghost" onclick="deleteAccount('${a.id}')" style="color:#dc2626;border-color:#fecaca" aria-label="Delete" title="Delete">${TRASH_SVG}</button>
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
        <button class="btn btn-ghost" style="min-height:36px;padding:0 10px" onclick="deleteTx('${t.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button>
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
function openAddNote(editId){
  const isEdit=!!editId;
  const note=isEdit ? Store.read(Store.keys.notes).find(n=>n.id===editId) : null;
  if(isEdit && !note){ toast('Note not found'); return; }
  openModal(isEdit?'Edit Note':'Add Note', `
    <form id="form-note" class="form">
      <div class="field"><label>Title</label><input name="title" required value="${esc(note?.title||'')}" placeholder="Note title" maxlength="60"></div>
      <div class="field"><label>Content</label><textarea name="content" rows="4" required placeholder="Write something...">${esc(note?.content||'')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteNote('${note.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-note').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    const content=String(fd.get('content')).trim();
    if(!title || !content) return;
    if(isEdit){
      const all=Store.read(Store.keys.notes);
      const t=all.find(x=>x.id===editId);
      if(t){ t.title=title; t.content=content; Store.write(Store.keys.notes, all); logActivity('✏️','Note updated: '+title); toast('Note updated ✓'); }
    } else {
      const all=Store.read(Store.keys.notes);
      all.push({ id:newId(), title, content, date: new Date().toISOString() });
      Store.write(Store.keys.notes, all);
      logActivity('📝','Note: '+title); toast('Note saved ✓');
    }
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); renderActivityLog(); updateStorageInfo();
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddTask(editId){
  const isEdit=!!editId;
  const task=isEdit ? Store.read(Store.keys.tasks).find(t=>t.id===editId) : null;
  if(isEdit && !task){ toast('Task not found'); return; }
  openModal(isEdit?'Edit Task':'Add Task', `
    <form id="form-task" class="form">
      <div class="field"><label>Title</label><input name="title" required value="${esc(task?.title||'')}" placeholder="e.g. Finish report" maxlength="80"></div>
      <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${esc(task?.dueDate||ymd(new Date()))}" required></div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low" ${task?.priority==='low'?'selected':''}>Low</option>
          <option value="medium" ${!task||task?.priority==='medium'?'selected':''}>Medium</option>
          <option value="high" ${task?.priority==='high'?'selected':''}>High</option>
          <option value="urgent" ${task?.priority==='urgent'?'selected':''}>Urgent</option>
        </select>
      </div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details...">${esc(task?.notes||'')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteLsTask('${task.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-task').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    if(!title) return;
    if(isEdit){
      const all=Store.read(Store.keys.tasks);
      const t=all.find(x=>x.id===editId);
      if(t){ t.title=title; t.dueDate=String(fd.get('dueDate')); t.priority=String(fd.get('priority')); t.notes=String(fd.get('notes')||'').trim(); Store.write(Store.keys.tasks, all);
        // sync linked event
        const evs=Store.read(Store.keys.events);
        const ev=evs.find(ev=>ev.id==='evt_'+editId);
        if(ev){ ev.date=t.dueDate; ev.title='Task: '+t.title; ev.notes=t.priority + (t.notes?' · '+t.notes:''); Store.write(Store.keys.events, evs); }
        logActivity('✏️','Task updated: '+title); toast('Task updated ✓'); }
    } else {
      const taskNew={ id:newId(), title, dueDate:String(fd.get('dueDate')), priority:String(fd.get('priority')), notes:String(fd.get('notes')||'').trim(), completed:false, createdAt:new Date().toISOString() };
      const all=Store.read(Store.keys.tasks);
      all.push(taskNew); Store.write(Store.keys.tasks, all);
      const evs=Store.read(Store.keys.events);
      evs.push({ id:'evt_'+taskNew.id, date:taskNew.dueDate, time:'', title:'Task: '+taskNew.title, notes: taskNew.priority + (taskNew.notes? ' · '+taskNew.notes:'') });
      Store.write(Store.keys.events, evs);
      logActivity('✅','Task: '+title); toast('Task saved ✓');
    }
    closeModal(); renderCalendar(); renderMore(); renderLifeSpace(); renderHome(); renderActivityLog(); updateLsTiles(); updateStorageInfo();
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddGoal(editId){
  const isEdit=!!editId;
  const goal=isEdit ? Store.read(Store.keys.goals).find(g=>g.id===editId) : null;
  if(isEdit && !goal){ toast('Goal not found'); return; }
  openModal(isEdit?'Edit Goal':'Add Goal', `
    <form id="form-goal" class="form">
      <div class="field"><label>Title</label><input name="title" required value="${esc(goal?.title||'')}" placeholder="e.g. Learn coding" maxlength="80"></div>
      <div class="field"><label>Target Date</label><input type="date" name="targetDate" value="${esc(goal?.targetDate||ymd(new Date()))}" required></div>
      <div class="field"><label>Category</label>
        <select name="category">
          <option value="personal" ${goal?.category==='personal'?'selected':''}>Personal</option>
          <option value="career" ${goal?.category==='career'?'selected':''}>Career</option>
          <option value="finance" ${goal?.category==='finance'?'selected':''}>Finance</option>
          <option value="health" ${goal?.category==='health'?'selected':''}>Health</option>
          <option value="education" ${goal?.category==='education'?'selected':''}>Education</option>
        </select>
      </div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low" ${goal?.priority==='low'?'selected':''}>Low</option>
          <option value="medium" ${!goal||goal?.priority==='medium'?'selected':''}>Medium</option>
          <option value="high" ${goal?.priority==='high'?'selected':''}>High</option>
          <option value="urgent" ${goal?.priority==='urgent'?'selected':''}>Urgent</option>
        </select>
      </div>
      <div class="field"><label>Notes</label><textarea name="notes" rows="2" placeholder="Details...">${esc(goal?.notes||'')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteLsGoal('${goal.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-goal').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const title=String(fd.get('title')).trim();
    if(!title) return;
    if(isEdit){
      const all=Store.read(Store.keys.goals);
      const g=all.find(x=>x.id===editId);
      if(g){ g.title=title; g.targetDate=String(fd.get('targetDate')); g.category=String(fd.get('category')); g.priority=String(fd.get('priority')); g.notes=String(fd.get('notes')||'').trim(); Store.write(Store.keys.goals, all); logActivity('✏️','Goal updated: '+title); toast('Goal updated ✓'); }
    } else {
      const goalNew={ id:newId(), title, targetDate:String(fd.get('targetDate')), category:String(fd.get('category')), priority:String(fd.get('priority')), notes:String(fd.get('notes')||'').trim(), completed:false, createdAt:new Date().toISOString() };
      const all=Store.read(Store.keys.goals);
      all.push(goalNew); Store.write(Store.keys.goals, all);
      logActivity('🎯','Goal: '+title); toast('Goal saved ✓');
    }
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); renderActivityLog(); updateLsTiles(); updateStorageInfo();
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddApplication(editId){
  const isEdit=!!editId;
  const app=isEdit ? Store.read(Store.keys.applications).find(a=>a.id===editId) : null;
  if(isEdit && !app){ toast('Application not found'); return; }
  openModal(isEdit?'Edit Job Application':'Add Job Application', `
    <form id="form-app" class="form">
      <div class="field"><label>Company</label><input name="company" required value="${esc(app?.company||'')}" placeholder="e.g. Acme Corp"></div>
      <div class="field"><label>Position</label><input name="position" required value="${esc(app?.position||'')}" placeholder="e.g. Frontend Developer"></div>
      <div class="field"><label>Location</label><input name="location" value="${esc(app?.location||'')}" placeholder="e.g. Manila / Remote"></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="wishlist" ${app?.status==='wishlist'?'selected':''}>Wishlist</option>
          <option value="applied" ${!app||app?.status==='applied'?'selected':''}>Applied</option>
          <option value="interview" ${app?.status==='interview'?'selected':''}>Interview</option>
          <option value="offer" ${app?.status==='offer'?'selected':''}>Offer</option>
          <option value="rejected" ${app?.status==='rejected'?'selected':''}>Rejected</option>
        </select>
      </div>
      <div class="field"><label>Date Applied</label><input type="date" name="dateApplied" value="${esc(app?.dateApplied||ymd(new Date()))}"></div>
      <div class="field"><label>Notes / Link</label><textarea name="notes" rows="2" placeholder="Job link, notes...">${esc(app?.notes||'')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteApp('${app.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-app').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const company=String(fd.get('company')).trim();
    const position=String(fd.get('position')).trim();
    if(!company || !position) return;
    if(isEdit){
      const all=Store.read(Store.keys.applications);
      const t=all.find(x=>x.id===editId);
      if(t){ t.company=company; t.position=position; t.location=String(fd.get('location')||'').trim(); t.status=String(fd.get('status')); t.dateApplied=String(fd.get('dateApplied')); t.notes=String(fd.get('notes')||'').trim(); Store.write(Store.keys.applications, all); logActivity('✏️','Job updated: '+company+' — '+position); toast('Application updated ✓'); }
    } else {
      const appNew={ id:newId(), company, position, location:String(fd.get('location')||'').trim(), status:String(fd.get('status')), dateApplied:String(fd.get('dateApplied')), notes:String(fd.get('notes')||'').trim(), createdAt:new Date().toISOString() };
      const all=Store.read(Store.keys.applications);
      all.push(appNew); Store.write(Store.keys.applications, all);
      logActivity('💼','Job: '+company+' — '+position); toast('Application saved ✓');
    }
    closeModal(); renderMore(); renderLifeSpace(); renderHome(); renderActivityLog(); updateLsTiles(); updateStorageInfo();
    if(navigator.vibrate) navigator.vibrate(20);
  });
}
function openAddProject(editId){
  const isEdit=!!editId;
  const proj=isEdit ? Store.read(Store.keys.projects).find(p=>p.id===editId) : null;
  if(isEdit && !proj){ toast('Project not found'); return; }
  openModal(isEdit?'Edit Project':'Add Project', `
    <form id="form-project" class="form">
      <div class="field"><label>Project Name</label><input name="name" required value="${esc(proj?.name||'')}" placeholder="e.g. Portfolio Website" maxlength="80"></div>
      <div class="field"><label>Description</label><textarea name="description" rows="2" placeholder="What is this project about?">${esc(proj?.description||'')}</textarea></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="planning" ${proj?.status==='planning'?'selected':''}>Planning</option>
          <option value="active" ${!proj||proj?.status==='active'?'selected':''}>Active</option>
          <option value="on_hold" ${proj?.status==='on_hold'?'selected':''}>On Hold</option>
          <option value="completed" ${proj?.status==='completed'?'selected':''}>Completed</option>
        </select>
      </div>
      <div class="field"><label>Priority</label>
        <select name="priority">
          <option value="low" ${proj?.priority==='low'?'selected':''}>Low</option>
          <option value="medium" ${!proj||proj?.priority==='medium'?'selected':''}>Medium</option>
          <option value="high" ${proj?.priority==='high'?'selected':''}>High</option>
          <option value="urgent" ${proj?.priority==='urgent'?'selected':''}>Urgent</option>
        </select>
      </div>
      <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${esc(proj?.dueDate||'')}"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteProject('${proj.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  document.getElementById('form-project').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const name=String(fd.get('name')).trim();
    if(!name) return;
    if(isEdit){
      const all=Store.read(Store.keys.projects);
      const t=all.find(x=>x.id===editId);
      if(t){ t.name=name; t.description=String(fd.get('description')||'').trim(); t.status=String(fd.get('status')); t.priority=String(fd.get('priority')); t.dueDate=String(fd.get('dueDate')||''); Store.write(Store.keys.projects, all); logActivity('✏️','Project updated: '+name); toast('Project updated ✓'); }
    } else {
      const projNew={ id:newId(), name, description:String(fd.get('description')||'').trim(), status:String(fd.get('status')), priority:String(fd.get('priority')), dueDate:String(fd.get('dueDate')||''), createdAt:new Date().toISOString() };
      const all=Store.read(Store.keys.projects);
      all.push(projNew); Store.write(Store.keys.projects, all);
      logActivity('📁','Project: '+name); toast('Project saved ✓');
    }
    closeModal(); renderLifeSpace(); renderHome(); renderActivityLog(); updateLsTiles(); updateStorageInfo();
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
function updateViewToggleVisibility(){
  const toggle=document.getElementById('ls-view-toggle');
  if(!toggle) return;
  const total = Store.read(Store.keys.events).length + Store.read(Store.keys.notes).length + Store.read(Store.keys.applications).length + Store.read(Store.keys.projects).length + Store.read(Store.keys.tasks).length + Store.read(Store.keys.goals).length + Store.read(Store.keys.habits).length;
  const used = localStorage.getItem('ls_view_used') === '1';
  const needed = total > 0;
  toggle.hidden = !(needed || used);
  // when hidden and detail is not open, ensure hint reflects grid
  if(toggle.hidden){
    const hint=document.getElementById('ls-view-hint');
    if(hint && !document.getElementById('ls-detail')?.hidden===false) hint.textContent='Tap a tile to open — grid overview.';
  }
}
function setLsView(view){
  lsView = view;
  localStorage.setItem('ls_view', view);
  updateViewToggleVisibility();
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
  const toggle=document.getElementById('ls-view-toggle');
  if(inDetail){
    // keep detail visible, hide both overviews and toggle (does nothing in detail)
    if(toggle) toggle.hidden=true;
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
  const habitCount = Store.read(Store.keys.habits).length;
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
  const hSub = document.getElementById('ls-tile-habits-sub');
  if(hSub){
    if(habitCount===0) hSub.textContent='No habits';
    else {
      const today=ymd(new Date());
      const doneToday=Store.read(Store.keys.habits).filter(h=> (h.completions||[]).includes(today)).length;
      hSub.textContent=`${habitCount} habit${habitCount>1?'s':''} · ${doneToday} done today`;
    }
  }
  // list view subs
  const lCal=document.getElementById('ls-list-cal-sub'); if(lCal) lCal.textContent=calText;
  const lEv=document.getElementById('ls-list-events-sub'); if(lEv) lEv.textContent= evCount ? `${evCount} events` : 'No events';
  const lN=document.getElementById('ls-list-notes-sub'); if(lN) lN.textContent= noteCount ? `${noteCount} notes` : 'No notes';
  const lJ=document.getElementById('ls-list-jobs-sub'); if(lJ) lJ.textContent= jobCount ? `${jobCount} jobs` : 'No jobs';
  const lP=document.getElementById('ls-list-projects-sub'); if(lP) lP.textContent= projCount ? `${projCount} projects` : 'No projects';
  const lT=document.getElementById('ls-list-tasks-sub'); if(lT) lT.textContent= taskCount ? `${taskCount} tasks` : 'No tasks';
  const lG=document.getElementById('ls-list-goals-sub'); if(lG) lG.textContent= goalCount ? `${goalCount} goals` : 'No goals';
  const lH=document.getElementById('ls-list-habits-sub'); if(lH) lH.textContent= habitCount ? `${habitCount} habits` : 'No habits';
  updateViewToggleVisibility();
}
function openLsDetail(type){
  const grid=document.getElementById('ls-grid');
  const list=document.getElementById('ls-list');
  const detail=document.getElementById('ls-detail');
  if(!detail) return;
  const toggle=document.getElementById('ls-view-toggle');
  if(toggle) toggle.hidden=true;
  if(grid) grid.hidden=true;
  if(list) list.hidden=true;
  detail.hidden=false;
  document.querySelectorAll('.ls-detail-panel').forEach(p=> p.hidden=true);
  const map={ calendar:'ls-panel-calendar', events:'ls-panel-events', notes:'ls-panel-notes', jobs:'ls-panel-jobs', projects:'ls-panel-projects', tasks:'ls-panel-tasks', goals:'ls-panel-goals', habits:'ls-panel-habits' };
  const target=document.getElementById(map[type]);
  if(target) target.hidden=false;
  detail.scrollIntoView({behavior:'smooth', block:'start'});
  if(type==='calendar' || type==='events'){ renderCalendar(); }
  if(type==='notes') renderLsNotes();
  if(type==='jobs') renderLsApps();
  if(type==='projects') renderLsProjects();
  if(type==='tasks') renderLsTasks();
  if(type==='goals') renderLsGoals();
  if(type==='habits') renderLsHabits();
}
function closeLsDetail(){
  const detail=document.getElementById('ls-detail');
  if(detail) detail.hidden=true;
  document.querySelectorAll('.ls-detail-panel').forEach(p=> p.hidden=true);
  // restore correct overview
  setLsView(lsView);
  updateViewToggleVisibility();
}
function initSwipe(scopeSelector){
  const root = scopeSelector ? document.querySelector(scopeSelector) : document;
  if(!root) return;
  const cards = root.querySelectorAll('.swipe-card:not([data-swipe-bound])');
  cards.forEach(card=>{
    card.dataset.swipeBound='1';
    let startX=0, startY=0, curX=0, dragging=false, horiz=false;
    const wrap=card.closest('.swipe-wrap');
    const threshold=42, maxTranslate=90;
    const closeOthers=()=>{ document.querySelectorAll('.swipe-card').forEach(c=>{ if(c!==card){ c.style.transform=''; c.closest('.swipe-wrap')?.classList.remove('swiped'); }}); };
    const getDx=()=> parseFloat((card.style.transform.match(/translateX\((-?\d+(\.\d+)?)/)||[])[1]||'0');
    card.addEventListener('touchstart', e=>{
      closeOthers();
      const t=e.touches[0];
      startX=t.clientX; startY=t.clientY; curX=startX; dragging=true; horiz=false;
      card.style.transition='none';
    }, {passive:true});
    card.addEventListener('touchmove', e=>{
      if(!dragging) return;
      const t=e.touches[0];
      curX=t.clientX;
      const dx=curX-startX, dy=t.clientY-startY;
      if(!horiz){
        if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if(Math.abs(dy) > Math.abs(dx)){ dragging=false; card.style.transform=''; return; }
        horiz=true;
      }
      if(horiz){
        let tx=dx;
        if(tx < 0) tx=Math.max(tx, -maxTranslate);
        else tx=Math.min(tx, 20);
        card.style.transform=`translateX(${tx}px)`;
        if(tx < 0 && e.cancelable) e.preventDefault();
      }
    }, {passive:false});
    card.addEventListener('touchend', ()=>{
      if(!dragging && !horiz) return;
      dragging=false; horiz=false;
      card.style.transition='transform .22s ease';
      const dx=curX-startX;
      if(dx < -threshold) { card.style.transform=`translateX(${-maxTranslate}px)`; wrap.classList.add('swiped'); }
      else { card.style.transform='translateX(0)'; wrap.classList.remove('swiped'); }
    });
    // mouse for desktop
    card.addEventListener('mousedown', e=>{
      if(e.button!==0) return;
      closeOthers();
      startX=e.clientX; startY=e.clientY; curX=startX; dragging=true; horiz=false;
      card.style.transition='none';
      const onMove=(ev)=>{
        if(!dragging) return;
        curX=ev.clientX;
        const dx=curX-startX, dy=ev.clientY-startY;
        if(!horiz){
          if(Math.abs(dx) < 6) return;
          if(Math.abs(dy) > Math.abs(dx)){ dragging=false; card.style.transform=''; cleanup(); return; }
          horiz=true;
        }
        let tx=dx;
        if(tx < 0) tx=Math.max(tx,-maxTranslate); else tx=Math.min(tx,20);
        card.style.transform=`translateX(${tx}px)`;
      };
      const onUp=()=>{
        if(dragging || horiz){
          card.style.transition='transform .22s ease';
          const dx=curX-startX;
          if(dx < -threshold) { card.style.transform=`translateX(${-maxTranslate}px)`; wrap.classList.add('swiped'); }
          else { card.style.transform='translateX(0)'; wrap.classList.remove('swiped'); }
        }
        dragging=false; horiz=false;
        cleanup();
      };
      const cleanup=()=>{ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    // tap to close if open
    card.addEventListener('click', e=>{
      if(wrap.classList.contains('swiped') && getDx() < -10){
        // if card is open, first tap closes instead of editing
        e.stopImmediatePropagation(); e.preventDefault();
        card.style.transform='translateX(0)'; wrap.classList.remove('swiped');
        return;
      }
    }, true);
  });
  // tap outside to close
  if(!document.body.dataset.swipeOutside){
    document.body.dataset.swipeOutside='1';
    document.addEventListener('click', e=>{
      if(!e.target.closest('.swipe-wrap')){ document.querySelectorAll('.swipe-card').forEach(c=>{ c.style.transform=''; c.closest('.swipe-wrap')?.classList.remove('swiped'); }); }
    });
    document.addEventListener('touchstart', e=>{
      if(!e.target.closest('.swipe-wrap')){ document.querySelectorAll('.swipe-card').forEach(c=>{ c.style.transform=''; c.closest('.swipe-wrap')?.classList.remove('swiped'); }); }
    }, {passive:true});
  }
}
function renderLifeSpace(){
  updateLsTiles();
  renderLsNotes();
  renderLsApps();
  renderLsProjects();
  renderLsTasks();
  renderLsGoals();
  renderLsHabits();
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
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteNote('${n.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;cursor:pointer" onclick="openAddNote('${n.id}')">
        <div style="font-weight:700">${esc(n.title)}</div>
        <div class="small muted" style="white-space:pre-wrap">${esc(n.content)}</div>
        <div class="small muted">${new Date(n.date).toLocaleDateString()}</div>
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  initSwipe();
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
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteApp('${a.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;cursor:pointer" onclick="openAddApplication('${a.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span style="font-weight:700">${esc(a.company)} — ${esc(a.position)}</span>
          <span class="small" style="padding:2px 8px;border-radius:999px;background:${statusColor[a.status]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(a.status)}</span>
        </div>
        <div class="small muted">${esc(a.location||'')} ${a.dateApplied?'· '+esc(a.dateApplied):''}</div>
        ${a.notes?`<div class="small muted">${esc(a.notes)}</div>`:''}
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  initSwipe();
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
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteProject('${p.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;cursor:pointer" onclick="openAddProject('${p.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span style="font-weight:700">${esc(p.name)}</span>
          <span style="display:flex;gap:6px;flex-shrink:0">
            ${p.priority?`<span class="small" style="padding:2px 8px;border-radius:999px;background:${priorityColor[p.priority]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(p.priority)}</span>`:''}
            <span class="small" style="padding:2px 8px;border-radius:999px;background:${statusColor[p.status]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(p.status)}</span>
          </span>
        </div>
        ${p.description?`<div class="small muted">${esc(p.description)}</div>`:''}
        ${p.dueDate?`<div class="small muted">Due: ${esc(p.dueDate)}</div>`:''}
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  initSwipe();
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
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteLsTask('${t.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;${t.completed?'opacity:.6':''};cursor:pointer" onclick="openAddTask('${t.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer" onclick="event.stopPropagation()">
            <input type="checkbox" ${t.completed?'checked':''} onchange="event.stopPropagation(); toggleLsTask('${t.id}')" onclick="event.stopPropagation()" style="width:18px;height:18px">
            <span style="${t.completed?'text-decoration:line-through':''}">${esc(t.title)}</span>
          </label>
          <span class="small" style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-weight:700">${esc(t.priority)}</span>
        </div>
        <div class="small muted">${esc(t.dueDate)} ${t.notes?'· '+esc(t.notes):''}</div>
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  initSwipe();
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
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteLsGoal('${g.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:4px;${g.completed?'opacity:.6':''};cursor:pointer" onclick="openAddGoal('${g.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <label style="display:flex;gap:8px;align-items:center;font-weight:700;cursor:pointer" onclick="event.stopPropagation()">
            <input type="checkbox" ${g.completed?'checked':''} onchange="event.stopPropagation(); toggleLsGoal('${g.id}')" onclick="event.stopPropagation()" style="width:18px;height:18px">
            <span style="${g.completed?'text-decoration:line-through':''}">${esc(g.title)}</span>
          </label>
          <span style="display:flex;gap:6px;flex-shrink:0">
            ${g.priority?`<span class="small" style="padding:2px 8px;border-radius:999px;background:${priorityColor[g.priority]||'var(--surface-2)'};color:#fff;font-weight:700">${esc(g.priority)}</span>`:''}
            <span class="small" style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-weight:700">${esc(g.category)}</span>
          </span>
        </div>
        <div class="small muted">${esc(g.targetDate)} ${g.notes?'· '+esc(g.notes):''}</div>
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>
  `).join('');
  initSwipe();
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

// ---------- Habits ----------
function habitWeekKey(d){
  const date=parseYMD(d);
  const jan4=new Date(date.getFullYear(),0,4);
  const start=new Date(jan4); start.setDate(jan4.getDate() - ((jan4.getDay()+6)%7));
  const diff=Math.floor((date - start)/86400000);
  const week=Math.floor(diff/7)+1;
  return date.getFullYear()+'-W'+String(week).padStart(2,'0');
}
function isoWeekToDate(weekKey){
  const [y,w]=weekKey.split('-W').map(Number);
  const jan4=new Date(y,0,4);
  const start=new Date(jan4); start.setDate(jan4.getDate() - ((jan4.getDay()+6)%7));
  const d=new Date(start); d.setDate(start.getDate() + (w-1)*7);
  return ymd(d);
}
function computeHabitStreaks(habit){
  const completions=[...(habit.completions||[])].sort();
  const set=new Set(completions);
  const today=ymd(new Date());
  let current=0, longest=0;
  if(habit.frequency==='weekly'){
    // weekly streak: consecutive weeks with at least one completion
    const weekSet=new Set(completions.map(c=> habitWeekKey(c)));
    const weeks=[...weekSet].sort();
    // longest: compare actual week start dates (handles year boundary)
    let cur=0; let prevDate=null;
    weeks.forEach(w=>{
      const curDate=parseYMD(isoWeekToDate(w));
      if(prevDate){
        const diff=Math.round((curDate - prevDate)/86400000);
        if(diff===7) cur+=1; else cur=1;
      } else cur=1;
      longest=Math.max(longest,cur);
      prevDate=curDate;
    });
    // current: count backwards from this week
    let cursorWeek=habitWeekKey(today);
    if(!weekSet.has(cursorWeek)){
      const d=parseYMD(isoWeekToDate(cursorWeek)); d.setDate(d.getDate()-7); cursorWeek=habitWeekKey(ymd(d));
    }
    let guard=0;
    while(weekSet.has(cursorWeek) && guard<520){
      current+=1; guard+=1;
      const d=parseYMD(isoWeekToDate(cursorWeek)); d.setDate(d.getDate()-7); cursorWeek=habitWeekKey(ymd(d));
    }
    // if no completion this week, current already counts previous weeks; if never completed, 0
  } else {
    // daily / custom : consecutive days
    // longest
    let cur=0; let prevDate=null;
    completions.forEach(d=>{
      if(prevDate){
        const diff=(parseYMD(d) - parseYMD(prevDate))/86400000;
        if(diff===1) cur+=1; else cur=1;
      } else cur=1;
      longest=Math.max(longest,cur);
      prevDate=d;
    });
    // current: from today backwards
    let cursor=parseYMD(today);
    if(!set.has(today)){
      cursor.setDate(cursor.getDate()-1);
    }
    while(set.has(ymd(cursor))){
      current+=1;
      cursor.setDate(cursor.getDate()-1);
      if(current>1000) break;
    }
  }
  const isToday=set.has(today);
  // progress
  let progressPct=0;
  const targetNum=parseInt(String(habit.targetGoal||'').match(/\d+/)?.[0]||'0',10);
  if(targetNum>0){
    progressPct=Math.min(100, Math.round((completions.length/targetNum)*100));
  } else {
    // fallback: progress last 7 days for daily, or completions length vs 30
    if(habit.frequency==='daily'){
      const last7=[...Array(7)].map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return ymd(d); });
      const done7=last7.filter(d=> set.has(d)).length;
      progressPct=Math.round((done7/7)*100);
    } else {
      progressPct=completions.length ? Math.min(100, Math.round((current/(longest||1))*100)) : 0;
    }
  }
  return { current, longest, progressPct, isToday, count: completions.length };
}
function renderLsHabits(filter){
  const list=document.getElementById('ls-habits-list');
  const count=document.getElementById('ls-habits-count');
  const search=document.getElementById('ls-habits-search');
  if(!list) return;
  const q=(filter || search?.value || '').trim().toLowerCase();
  const habits=Store.read(Store.keys.habits);
  const filtered=habits.filter(h=> !q || h.name.toLowerCase().includes(q) || (h.category||'').toLowerCase().includes(q) || (h.icon||'').includes(q));
  if(count) count.textContent=`· ${filtered.length}`;
  if(filtered.length===0){
    list.innerHTML=`<div class="list-empty">${q?'No matching habits':'No habits yet<br><span class="small">Use + Habit to track daily routines</span>'}</div>`;
    return;
  }
  list.innerHTML=filtered.slice().reverse().map(h=>{
    const st=computeHabitStreaks(h);
    const freqLabel=h.frequency==='custom' ? `custom${h.customFrequency?' · '+esc(h.customFrequency):''}` : esc(h.frequency);
    return `
    <div class="swipe-wrap">
      <div class="swipe-actions"><button class="btn btn-ghost btn-swipe-delete" onclick="deleteHabit('${h.id}')" aria-label="Delete" title="Delete">${TRASH_SVG}</button></div>
      <div class="list-item swipe-card" style="flex-direction:column;align-items:stretch;gap:8px;cursor:pointer" onclick="openAddHabit('${h.id}')">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span style="display:flex;gap:8px;align-items:center;font-weight:700"><span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--border);font-size:18px">${esc(h.icon||'🔁')}</span> <span>${esc(h.name)}</span></span>
          <label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:13px;font-weight:600" onclick="event.stopPropagation()"><input type="checkbox" ${st.isToday?'checked':''} onchange="event.stopPropagation(); toggleHabit('${h.id}')" onclick="event.stopPropagation()" style="width:18px;height:18px"> ${st.isToday?'Done':'Mark today'}</label>
        </div>
      <div class="small muted" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border)">${esc(h.category||'general')}</span>
        <span style="padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border)">${freqLabel}</span>
        ${h.targetGoal?`<span>🎯 ${esc(h.targetGoal)}</span>`:''}
        ${h.reminder?`<span>⏰ ${esc(h.reminder)}</span>`:''}
        <span>📅 ${esc(h.startDate||'—')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-top:4px">
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:8px"><div class="small muted">Streak</div><div style="font-weight:800">${st.current} 🔥</div></div>
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:8px"><div class="small muted">Longest</div><div style="font-weight:800">${st.longest} 🏆</div></div>
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:8px"><div class="small muted">Progress</div><div style="font-weight:800">${st.progressPct}%</div></div>
      </div>
      <div class="progress" style="margin-top:2px"><div class="progress-fill" style="width:${st.progressPct}%"></div></div>
      <div class="small muted" style="text-align:center">${st.count} completion${st.count!==1?'s':''} · ${st.isToday?'Completed today ✓':'Not yet today'}</div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-ghost" style="min-height:36px;flex:1" onclick="event.stopPropagation(); toggleHabit('${h.id}')">${st.isToday?'Undo':'Complete'}</button>
        </div>
        <div class="small muted" style="margin-top:4px;opacity:.6">Tap to edit · Swipe left</div>
      </div>
    </div>`;
  }).join('');
  initSwipe();
}
window.toggleHabit=(id)=>{
  const all=Store.read(Store.keys.habits);
  const h=all.find(x=>x.id===id);
  if(!h) return;
  const today=ymd(new Date());
  h.completions=h.completions||[];
  const idx=h.completions.indexOf(today);
  if(idx>=0){ h.completions.splice(idx,1); }
  else { h.completions.push(today); h.completions.sort(); }
  // update streak caches
  const st=computeHabitStreaks(h);
  h.currentStreak=st.current; h.longestStreak=Math.max(h.longestStreak||0, st.longest);
  Store.write(Store.keys.habits, all);
  renderLsHabits(); updateLsTiles(); renderHome(); updateStorageInfo();
  toast(idx>=0?'Undone — streak '+st.current : 'Completed ✓ — streak '+st.current);
  logActivity(st.isToday?'↩️':'🔁', (idx>=0?'Undo habit: ':'Habit done: ')+h.name); renderActivityLog();
};
window.deleteHabit=(id)=>{
  if(!confirm('Delete this habit?')) return;
  const all=Store.read(Store.keys.habits).filter(h=>h.id!==id);
  Store.write(Store.keys.habits, all);
  renderLsHabits(); updateLsTiles(); renderHome(); updateStorageInfo(); toast('Habit deleted');
};
window.openAddHabit=(editId)=>{
  const isEdit=!!editId;
  const habit=isEdit ? Store.read(Store.keys.habits).find(h=>h.id===editId) : null;
  const title=isEdit ? 'Edit Habit' : 'New Habit';
  openModal(title, `
    <form id="form-habit" class="form">
      <div class="field"><label>Habit Name *</label><input name="name" required value="${esc(habit?.name||'')}" placeholder="e.g. Morning run, Drink water" maxlength="60"></div>
      <div class="field"><label>Icon (emoji)</label><input name="icon" value="${esc(habit?.icon||'🔁')}" placeholder="🔁" maxlength="4"></div>
      <div class="field"><label>Category</label>
        <select name="category">
          <option value="health" ${habit?.category==='health'?'selected':''}>Health</option>
          <option value="fitness" ${habit?.category==='fitness'?'selected':''}>Fitness</option>
          <option value="mindfulness" ${habit?.category==='mindfulness'?'selected':''}>Mindfulness</option>
          <option value="productivity" ${habit?.category==='productivity'?'selected':''}>Productivity</option>
          <option value="learning" ${habit?.category==='learning'?'selected':''}>Learning</option>
          <option value="social" ${habit?.category==='social'?'selected':''}>Social</option>
          <option value="finance" ${habit?.category==='finance'?'selected':''}>Finance</option>
          <option value="other" ${!habit||habit?.category==='other'?'selected':''}>Other</option>
        </select>
      </div>
      <div class="field"><label>Frequency *</label>
        <select name="frequency" id="habit-frequency">
          <option value="daily" ${habit?.frequency==='daily'?'selected':''}>Daily</option>
          <option value="weekly" ${habit?.frequency==='weekly'?'selected':''}>Weekly</option>
          <option value="custom" ${habit?.frequency==='custom'?'selected':''}>Custom</option>
        </select>
      </div>
      <div class="field" id="field-custom-frequency" style="${habit?.frequency==='custom'?'':'display:none'}"><label>Custom Frequency</label><input name="customFrequency" value="${esc(habit?.customFrequency||'')}" placeholder="e.g. Mon, Wed, Fri or 3×/week"></div>
      <div class="field"><label>Target / Goal</label><input name="targetGoal" value="${esc(habit?.targetGoal||'')}" placeholder="e.g. 30 days, 8 glasses/day, 3 times/week"></div>
      <div class="field"><label>Reminder</label><input type="time" name="reminder" value="${esc(habit?.reminder||'')}"></div>
      <div class="field"><label>Start Date *</label><input type="date" name="startDate" required value="${esc(habit?.startDate||ymd(new Date()))}"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Save</button>
      </div>
      ${isEdit?`<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;color:#dc2626;border-color:#fecaca" onclick="deleteHabit('${habit.id}'); closeModal();" aria-label="Delete" title="Delete">${TRASH_SVG}</button>`:''}
    </form>
  `);
  const freqEl=document.getElementById('habit-frequency');
  const customField=document.getElementById('field-custom-frequency');
  if(freqEl && customField){
    freqEl.addEventListener('change', ()=>{ customField.style.display = freqEl.value==='custom' ? '' : 'none'; });
  }
  document.getElementById('form-habit').addEventListener('submit', e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const name=String(fd.get('name')).trim();
    if(!name){ toast('Enter habit name'); return; }
    const startDate=String(fd.get('startDate'));
    if(!startDate){ toast('Enter start date'); return; }
    const data={
      name,
      icon: String(fd.get('icon')).trim() || '🔁',
      category: String(fd.get('category')),
      frequency: String(fd.get('frequency')),
      customFrequency: String(fd.get('customFrequency')||'').trim(),
      targetGoal: String(fd.get('targetGoal')||'').trim(),
      reminder: String(fd.get('reminder')||'').trim(),
      startDate
    };
    if(data.frequency!=='custom') data.customFrequency='';
    if(isEdit){
      const all=Store.read(Store.keys.habits);
      const t=all.find(x=>x.id===editId);
      if(!t) return;
      Object.assign(t, data);
      const st=computeHabitStreaks(t);
      t.currentStreak=st.current; t.longestStreak=Math.max(t.longestStreak||0, st.longest);
      Store.write(Store.keys.habits, all);
      toast('Habit updated ✓');
      logActivity('✏️','Habit updated: '+t.name);
    } else {
      const all=Store.read(Store.keys.habits);
      const habitNew={ id:newId(), ...data, completions:[], currentStreak:0, longestStreak:0, createdAt:new Date().toISOString() };
      all.push(habitNew);
      Store.write(Store.keys.habits, all);
      toast('Habit created ✓');
      logActivity('🔁','Habit created: '+habitNew.name);
    }
    closeModal(); renderLsHabits(); updateLsTiles(); renderHome(); updateStorageInfo(); renderActivityLog();
  });
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
      if(act==='habit') openAddHabit();
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
  document.getElementById('ls-view-grid')?.addEventListener('click', ()=> { localStorage.setItem('ls_view_used','1'); setLsView('grid'); });
  document.getElementById('ls-view-list')?.addEventListener('click', ()=> { localStorage.setItem('ls_view_used','1'); setLsView('list'); });
  setLsView(lsView);
  updateViewToggleVisibility();
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
  document.getElementById('ls-habits-search')?.addEventListener('input', e=> renderLsHabits(e.target.value));
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

  // Seed demo if empty (first run only) — never reseed after user deletes
  const SEED_FLAG='mobileApp_seeded_v1';
  if(!localStorage.getItem(SEED_FLAG)){
    const hasAnyData = Object.values(Store.keys).some(k=> Store.read(k).length>0) || !!localStorage.getItem(PROFILE_KEY) || !!localStorage.getItem('mobileApp_theme');
    if(!hasAnyData){
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
      if(Store.read(Store.keys.habits).length===0){
        const y=ymd(new Date());
        const yest=ymd(new Date(Date.now()-86400000));
        const twoDaysAgo=ymd(new Date(Date.now()-172800000));
        Store.write(Store.keys.habits, [
          {id:'hb1', name:'Drink Water', icon:'💧', category:'health', frequency:'daily', customFrequency:'', targetGoal:'8 glasses/day', reminder:'08:00', startDate:yest, completions:[yest, y], currentStreak:2, longestStreak:2, createdAt:new Date().toISOString()},
          {id:'hb2', name:'Morning Run', icon:'🏃', category:'fitness', frequency:'weekly', customFrequency:'', targetGoal:'3 times/week', reminder:'06:30', startDate:twoDaysAgo, completions:[twoDaysAgo], currentStreak:1, longestStreak:1, createdAt:new Date().toISOString()},
        ]);
      }
    }
    localStorage.setItem(SEED_FLAG,'1');
  }

  renderCalendar();
  renderFinance('');
  renderMore();
  renderLifeSpace();
  setPage('home');
});
