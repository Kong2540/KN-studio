/* =====================================================================
   KN Studio · บัญชีผู้ใช้ สิทธิ์ โครงการ และหน้าแอดมิน (Supabase)
   เว็บ/มือถือ: ต้องออนไลน์ · โปรแกรม PC (.exe): ใช้ออฟไลน์ได้ภายในระยะที่แอดมินกำหนด
   ===================================================================== */
(function(){
'use strict';
const CFG=window.KN_CONFIG||{},DESK=!!window.knDesktop,SITE=CFG.site||'https://kong2540.github.io/KN-Studio/';
const PK=[['beam','KN-Detail · คาน','lvl'],['cut','Bar Cut','lvl'],['settings','ตั้งค่ามาตรฐาน','lvl'],['export','ส่งออก DXF / ไฟล์','bool'],['pc','ดาวน์โหลดและใช้โปรแกรม PC','bool']];
const LV={none:'ไม่เห็น',view:'ดูอย่างเดียว',edit:'แก้ไขได้'};
const ST={pending:'รออนุมัติ',active:'ใช้งาน',suspended:'ระงับ',rejected:'ปฏิเสธ'};
const DEF_SET={signup_fields:[{key:'phone',label:'เบอร์โทร',type:'tel',required:true}],
 roles:{admin:{label:'แอดมิน',beam:'edit',cut:'edit',export:true,pc:true,settings:'edit'},engineer:{label:'วิศวกร',beam:'edit',cut:'edit',export:true,pc:true,settings:'edit'},
  drafter:{label:'ผู้เขียนแบบ',beam:'edit',cut:'view',export:true,pc:false,settings:'view'},viewer:{label:'ผู้ดูอย่างเดียว',beam:'view',cut:'view',export:false,pc:false,settings:'none'}},
 offline:{grace_days:14},desktop:{url:'https://github.com/kong2540/KN-Studio/releases/latest',note:''}};
const K={ready:false,online:true,offline:false,sb:null,user:null,prof:null,set:JSON.parse(JSON.stringify(DEF_SET)),perm:{},proj:null,projs:[],dir:[],state:'',daysLeft:null};
window.KN=K;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const toast=t=>{if(window.toast)window.toast(t);else alert(t)};
const fmtD=t=>t?new Date(t).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'—';
const ERR={'Invalid login credentials':'อีเมลหรือรหัสผ่านไม่ถูกต้อง','User already registered':'อีเมลนี้สมัครไว้แล้ว ให้เข้าสู่ระบบหรือกดลืมรหัสผ่าน','Email not confirmed':'ยังไม่ได้ยืนยันอีเมล กรุณากดลิงก์ในอีเมลที่ระบบส่งไป',
 'Password should be at least 6 characters.':'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร','Failed to fetch':'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต'};
const errT=e=>{const m=(e&&(e.message||e.error_description))||String(e);for(const k in ERR)if(m.indexOf(k)>=0)return ERR[k];if(/rate limit/i.test(m))return'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';return m};
const netErr=e=>!navigator.onLine||/fetch|network|Load failed/i.test((e&&e.message)||String(e));

/* ---------- overlay ---------- */
function root(){let r=document.getElementById('knAuth');if(!r){r=document.createElement('div');r.id='knAuth';document.body.appendChild(r)}return r}
const MARK='<div class="mark"><span>KN</span></div>';
function card(inner,wide){const r=root();r.className='kna';r.innerHTML=`<div class="kna-wrap${wide?' wide':''}"><div class="kna-brand">${MARK}<div><b>KN STUDIO</b><small>ENGINEERING SUITE</small></div></div><div class="kna-card">${inner}</div><div class="kna-foot">KTY CONSTRUCTION${DESK?' · โปรแกรม PC':''}</div></div>`;r.style.display='block';document.body.classList.add('kn-lock');return r}
function page(title,inner,actions){const r=root();r.className='kna kna-pg';r.innerHTML=`<div class="kna-top">${MARK}<b>${esc(title)}</b><span style="flex:1"></span>${actions||''}<button class="ib" data-k="close">กลับเข้าโปรแกรม</button></div><div class="kna-body">${inner}</div>`;r.style.display='block';document.body.classList.add('kn-lock');return r}
function hide(){const r=root();r.style.display='none';r.innerHTML='';document.body.classList.remove('kn-lock')}
function busy(btn,on,txt){if(!btn)return;if(on){btn.dataset.t=btn.textContent;btn.textContent=txt||'กำลังดำเนินการ…';btn.disabled=true}else{btn.textContent=btn.dataset.t||btn.textContent;btn.disabled=false}}
const pw=(id,ac)=>`<div class="kpw"><input class="kin" id="${id}" type="password" autocomplete="${ac}"><button type="button" class="kpe" data-eye="${id}" aria-label="แสดงรหัสผ่าน">แสดง</button></div>`;
document.addEventListener('click',e=>{const b=e.target.closest('[data-eye]');if(!b)return;const i=document.getElementById(b.dataset.eye);if(i){i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'แสดง':'ซ่อน'}});

/* ---------- settings / permissions ---------- */
function mergeSet(rows){(rows||[]).forEach(r=>{K.set[r.key]=r.value});if(!K.set.roles||!K.set.roles.admin)K.set.roles=Object.assign({},DEF_SET.roles,K.set.roles||{})}
async function loadSet(){try{const{data,error}=await K.sb.from('app_settings').select('key,value');if(error)throw error;mergeSet(data);LS.set('kn.set',K.set)}catch(e){const c=LS.get('kn.set',null);if(c)K.set=c}}
function permOf(p){const R=K.set.roles||{},base=Object.assign({},R[p.role]||R.viewer||{}),o=p.perms||{},out={};
 PK.forEach(([k,,t])=>{let v=o[k]!=null&&o[k]!==''?o[k]:base[k];if(t==='lvl')v=LV[v]?v:'none';else v=!!v;out[k]=v});
 if(p.role==='admin')PK.forEach(([k,,t])=>{out[k]=t==='lvl'?'edit':true});return out}
K.can=(k,lv)=>{const v=K.perm[k];if(v===true||v===false)return v;return lv==='edit'?v==='edit':v==='edit'||v==='view'};
K.isAdmin=()=>!!(K.prof&&K.prof.role==='admin'&&!K.offline);
K.guard=name=>{if(!K.ready)return null;const m={beam:'beam',detail:'beam',cut:'cut',settings:'settings'}[name];if(m&&!K.can(m))return'home';return name};
function applyPerms(){const b=document.body;['beam','cut','settings'].forEach(k=>{b.classList.toggle('ro-'+k,K.can(k)&&!K.can(k,'edit'))});
 const hideGo=(sel,k)=>document.querySelectorAll(sel).forEach(el=>{el.style.display=K.can(k)?'':'none'});
 hideGo('[data-go="detail"],[data-go="beam"]','beam');hideGo('[data-go="cut"]','cut');hideGo('[data-go="settings"]','settings');renderUserBtn()}

/* ---------- boot ---------- */
K.boot=async function(){
 if(!CFG.url||!CFG.key||!window.supabase){card(`<h2>ยังไม่ได้ตั้งค่าการเชื่อมต่อ</h2><p class="kmu">แก้ไฟล์ <b>config.js</b> ใส่ Project URL และ publishable key ของ Supabase ตามคู่มือใน README</p>`);return}
 if(!K.sb)K.sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:!DESK,storageKey:'kn-studio-auth'}});
 if(!K._l){K._l=1;window.addEventListener('online',()=>{K.online=true;offBanner();if(DESK&&(K.offline||!K.ready))K.boot()});
 window.addEventListener('offline',()=>{K.online=false;offBanner()});
 K.sb.auth.onAuthStateChange((ev,ses)=>{if(ev==='PASSWORD_RECOVERY'){renderReset();return}if(ev==='SIGNED_OUT'){K.ready=false;K.user=null;K.prof=null;renderLogin()}})}
 if(!navigator.onLine)return DESK?offlineEnter():offScreen();
 card('<div class="kspin"></div><p class="kmu" style="text-align:center">กำลังเชื่อมต่อระบบ</p>');
 await loadSet();
 const rec=/type=recovery/.test(location.hash);
 let ses=null;try{ses=(await K.sb.auth.getSession()).data.session}catch(e){}
 if(rec&&ses){renderReset();return}
 if(ses){K.user=ses.user;await enter()}else renderLogin()};
function offScreen(){card(`<h2>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h2><p class="kmu">KN Studio บนเว็บและมือถือใช้ได้เฉพาะตอนออนไลน์ เพื่อให้ข้อมูลตรงกันทุกเครื่อง เมื่อเชื่อมต่อแล้วหน้านี้จะหายไปเอง</p><p class="kmu">ถ้าต้องการทำงานออฟไลน์ ใช้โปรแกรม KN Studio สำหรับ PC</p>`);
 const h=()=>{window.removeEventListener('online',h);K.boot()};window.addEventListener('online',h)}
function offBanner(){let b=document.getElementById('knOff');if(!b){b=document.createElement('div');b.id='knOff';document.body.appendChild(b)}
 if(navigator.onLine&&!K.offline){b.style.display='none';return}
 if(!DESK&&K.ready&&!navigator.onLine){b.className='knoff full';b.innerHTML='<div><b>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</b>หยุดบันทึกชั่วคราว ข้อมูลล่าสุดยังอยู่บนเครื่องนี้ เมื่อเชื่อมต่อแล้วระบบจะบันทึกต่อให้เอง</div>';b.style.display='flex';return}
 b.className='knoff';b.textContent='ออฟไลน์'+(K.daysLeft!=null?' · ใช้ได้อีก '+K.daysLeft+' วัน':'')+' · งานจะซิงก์เมื่อออนไลน์';b.style.display='block'}

/* ---------- login / signup / forgot / reset ---------- */
function renderLogin(mode){mode=mode||'login';const login=mode==='login',F=(K.set.signup_fields||[]).filter(f=>f&&f.key);
 const fld=f=>{const id='kf_'+f.key,req=f.required?' <i>*</i>':'';
  if(f.type==='select')return`<label class="kf"><span>${esc(f.label)}${req}</span><select class="kin" id="${id}"><option value="">— เลือก —</option>${String(f.options||'').split(',').map(o=>o.trim()).filter(Boolean).map(o=>`<option>${esc(o)}</option>`).join('')}</select></label>`;
  return`<label class="kf"><span>${esc(f.label)}${req}</span><input class="kin" id="${id}" type="${['tel','number','date','email'].includes(f.type)?f.type:'text'}"></label>`};
 card(`<div class="kseg"><button class="${login?'on':''}" data-m="login">เข้าสู่ระบบ</button><button class="${login?'':'on'}" data-m="signup">สมัครสมาชิก</button></div>
 <h2>${login?'ยินดีต้อนรับ':'สมัครใช้งาน KN Studio'}</h2><p class="kmu">${login?'เข้าสู่ระบบเพื่อเปิดงานเขียนแบบเหล็กเสริม':'หลังสมัคร แอดมินจะตรวจสอบและกำหนดสิทธิ์ให้ก่อนใช้งาน'}</p>
 <form id="kfm" novalidate>
 ${login?'':`<label class="kf"><span>ชื่อ-นามสกุล <i>*</i></span><input class="kin" id="kf_dn" autocomplete="name"></label>${F.map(fld).join('')}`}
 <label class="kf"><span>อีเมล <i>*</i></span><input class="kin" id="kf_em" type="email" autocomplete="email" inputmode="email"></label>
 <label class="kf"><span>${login?'รหัสผ่าน':'ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว)'} <i>*</i></span>${pw('kf_pw',login?'current-password':'new-password')}</label>
 ${login?'':`<label class="kf"><span>ยืนยันรหัสผ่าน <i>*</i></span>${pw('kf_pw2','new-password')}</label>`}
 <div class="kerr" id="kerr"></div>
 <button class="kbtn" id="kgo">${login?'เข้าสู่ระบบ':'สมัครใช้งาน'}</button></form>
 ${login?'<button class="klink" id="kforgot">ลืมรหัสผ่าน</button>':''}`);
 const r=root();r.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>renderLogin(b.dataset.m));
 const fg=r.querySelector('#kforgot');if(fg)fg.onclick=()=>renderForgot();
 r.querySelector('#kfm').onsubmit=async e=>{e.preventDefault();const er=r.querySelector('#kerr'),btn=r.querySelector('#kgo'),v=id=>(r.querySelector('#'+id)||{}).value||'';er.textContent='';
  const email=v('kf_em').trim(),pass=v('kf_pw');if(!/^\S+@\S+\.\S+$/.test(email)){er.textContent='กรุณากรอกอีเมลให้ถูกต้อง';return}if(!pass){er.textContent='กรุณากรอกรหัสผ่าน';return}
  if(!navigator.onLine){er.textContent='ไม่มีอินเทอร์เน็ต ต้องเชื่อมต่อเพื่อเข้าสู่ระบบ';return}
  busy(btn,true);
  try{if(login){const{data,error}=await K.sb.auth.signInWithPassword({email,password:pass});if(error)throw error;K.user=data.user;await enter();return}
   const dn=v('kf_dn').trim();if(!dn)throw new Error('กรุณากรอกชื่อ-นามสกุล');if(pass.length<8)throw new Error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');if(pass!==v('kf_pw2'))throw new Error('ยืนยันรหัสผ่านไม่ตรงกัน');
   const extra={};let phone='';for(const f of F){const x=v('kf_'+f.key).trim();if(f.required&&!x)throw new Error('กรุณากรอก '+f.label);if(f.key==='phone')phone=x;else extra[f.key]=x}
   const{data,error}=await K.sb.auth.signUp({email,password:pass,options:{data:{display_name:dn,phone,extra},emailRedirectTo:DESK?SITE:location.origin+location.pathname}});if(error)throw error;
   if(data.session){K.user=data.user;await enter()}else card(`<h2>ส่งอีเมลยืนยันแล้ว</h2><p class="kmu">กรุณาเปิดอีเมล <b>${esc(email)}</b> แล้วกดลิงก์ยืนยัน จากนั้นกลับมาเข้าสู่ระบบ<br><br>บัญชีจะใช้งานได้หลังแอดมินอนุมัติ</p><button class="kbtn" data-m="login">ไปหน้าเข้าสู่ระบบ</button>`),root().querySelector('[data-m]').onclick=()=>renderLogin()}
  catch(x){er.textContent=errT(x)}finally{busy(btn,false)}}}
function renderForgot(){card(`<h2>ลืมรหัสผ่าน</h2><p class="kmu">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้</p>
 <label class="kf"><span>อีเมล</span><input class="kin" id="kf_em" type="email" autocomplete="email"></label><div class="kerr" id="kerr"></div>
 <button class="kbtn" id="kgo">ส่งลิงก์ตั้งรหัสผ่าน</button><button class="klink" id="kback">กลับไปเข้าสู่ระบบ</button>`);
 const r=root();r.querySelector('#kback').onclick=()=>renderLogin();
 r.querySelector('#kgo').onclick=async e=>{const btn=e.target,er=r.querySelector('#kerr'),em=r.querySelector('#kf_em').value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){er.textContent='กรุณากรอกอีเมลให้ถูกต้อง';return}busy(btn,true);
  try{const{error}=await K.sb.auth.resetPasswordForEmail(em,{redirectTo:DESK?SITE:location.origin+location.pathname});if(error)throw error;card(`<h2>ส่งลิงก์แล้ว</h2><p class="kmu">ถ้ามีบัญชีของ <b>${esc(em)}</b> ระบบจะส่งลิงก์ไปที่อีเมลนี้ เปิดลิงก์แล้วตั้งรหัสผ่านใหม่${DESK?' (ลิงก์จะเปิดในเว็บเบราว์เซอร์)':''}</p><button class="kbtn" id="kback">กลับไปเข้าสู่ระบบ</button>`);root().querySelector('#kback').onclick=()=>renderLogin()}
  catch(x){er.textContent=errT(x)}finally{busy(btn,false)}}}
function renderReset(){card(`<h2>ตั้งรหัสผ่านใหม่</h2><label class="kf"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</span>${pw('kf_pw','new-password')}</label><label class="kf"><span>ยืนยันรหัสผ่าน</span>${pw('kf_pw2','new-password')}</label><div class="kerr" id="kerr"></div><button class="kbtn" id="kgo">บันทึกรหัสผ่าน</button>`);
 const r=root();r.querySelector('#kgo').onclick=async e=>{const a=r.querySelector('#kf_pw').value,b=r.querySelector('#kf_pw2').value,er=r.querySelector('#kerr');if(a.length<8){er.textContent='รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';return}if(a!==b){er.textContent='ยืนยันรหัสผ่านไม่ตรงกัน';return}
  busy(e.target,true);try{const{data,error}=await K.sb.auth.updateUser({password:a});if(error)throw error;history.replaceState(null,'',location.pathname);toast('ตั้งรหัสผ่านใหม่แล้ว');K.user=data.user;await enter()}catch(x){er.textContent=errT(x)}finally{busy(e.target,false)}}}

/* ---------- after login ---------- */
async function enter(){
 let p=null;try{const{data,error}=await K.sb.from('profiles').select('*').eq('id',K.user.id).single();if(error)throw error;p=data}
 catch(e){if(DESK&&netErr(e))return offlineEnter();card(`<h2>อ่านข้อมูลบัญชีไม่ได้</h2><p class="kmu">${esc(errT(e))}</p><p class="kmu">ถ้าเพิ่งตั้งระบบ ตรวจว่ารันไฟล์ supabase/schema.sql แล้ว</p><button class="kbtn" id="kout">ออกจากระบบ</button>`);root().querySelector('#kout').onclick=()=>K.logout();return}
 K.prof=p;K.offline=false;K.daysLeft=null;
 const today=new Date().toISOString().slice(0,10),exp=p.expires_at&&p.expires_at<today;
 if(p.status!=='active'||exp)return renderBlocked(p,exp);
 K.perm=permOf(p);
 if(DESK&&!K.perm.pc)return renderBlocked(p,false,'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้โปรแกรม PC ติดต่อแอดมิน หรือใช้งานผ่านเว็บแทน');
 LS.set('kn.cache',{uid:p.id,prof:p,set:K.set,checked:Date.now()});
 K.sb.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',p.id).then(()=>{},()=>{});
 K.ready=true;applyPerms();offBanner();
 const last=LS.get('kn.proj.'+p.id,null);if(last&&await openProject(last,true))return;
 renderProjects(true)}
function renderBlocked(p,exp,msg){const pend=p.status==='pending';
 card(`<h2>${msg?'ไม่มีสิทธิ์ใช้งานส่วนนี้':pend?'รอแอดมินอนุมัติ':exp?'บัญชีหมดอายุ':p.status==='rejected'?'คำขอไม่ได้รับอนุมัติ':'บัญชีนี้ถูกระงับ'}</h2>
 <p class="kmu">${msg?esc(msg):pend?'สมัครเรียบร้อยแล้ว แอดมินจะตรวจสอบและกำหนดสิทธิ์ให้ เมื่ออนุมัติแล้วกด "ตรวจสอบอีกครั้ง"':exp?'บัญชีหมดอายุเมื่อ '+esc(p.expires_at)+' ติดต่อแอดมินเพื่อต่ออายุ':'ติดต่อแอดมินเพื่อสอบถามรายละเอียด'}</p>
 <div class="kinfo"><div><span>ชื่อ</span><b>${esc(p.display_name||'—')}</b></div><div><span>อีเมล</span><b>${esc(p.email)}</b></div><div><span>สมัครเมื่อ</span><b>${fmtD(p.created_at)}</b></div><div><span>สถานะ</span><b>${ST[p.status]||p.status}</b></div></div>
 <button class="kbtn" id="kre">ตรวจสอบอีกครั้ง</button><button class="klink" id="kout">ออกจากระบบ</button>`);
 const r=root();r.querySelector('#kre').onclick=()=>enter();r.querySelector('#kout').onclick=()=>K.logout()}
function offlineEnter(){const c=LS.get('kn.cache',null),g=+(((c&&c.set&&c.set.offline)||{}).grace_days||0);
 if(!c){card(`<h2>ต้องเชื่อมต่ออินเทอร์เน็ตครั้งแรก</h2><p class="kmu">เข้าสู่ระบบแบบออนไลน์อย่างน้อยหนึ่งครั้งในเครื่องนี้ จากนั้นจึงใช้งานออฟไลน์ได้</p>`);return}
 const left=g-(Date.now()-c.checked)/864e5;
 if(g<=0||left<0){card(`<h2>ต้องเชื่อมต่อเพื่อตรวจสอบสิทธิ์</h2><p class="kmu">${g<=0?'แอดมินยังไม่เปิดให้ใช้งานออฟไลน์':'ใช้งานออฟไลน์ครบ '+g+' วันแล้ว'} กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อยืนยันบัญชี (ตรวจล่าสุด ${fmtD(c.checked)})</p><p class="kmu">งานที่ทำค้างไว้ยังอยู่ในเครื่อง จะซิงก์ทันทีที่เชื่อมต่อ</p>`);return}
 K.set=c.set;K.prof=c.prof;K.perm=permOf(c.prof);K.offline=true;K.daysLeft=Math.ceil(left);K.ready=true;applyPerms();offBanner();
 const last=LS.get('kn.proj.'+c.prof.id,null),loc=last&&LS.get('kn.pdata.'+last,null);
 if(loc){K.proj={id:last,name:loc.name,owner:loc.owner,can_edit:loc.can_edit!==false};renderUserBtn();window.knApply(loc.data);hide();setState(loc.dirty?'dirty':'saved')}
 else card(`<h2>ไม่มีโครงการในเครื่อง</h2><p class="kmu">โหมดออฟไลน์เปิดได้เฉพาะโครงการที่เคยเปิดในเครื่องนี้ เชื่อมต่ออินเทอร์เน็ตเพื่อเลือกโครงการอื่น</p>`)}
K.logout=async()=>{try{await K.sb.auth.signOut()}catch(e){}K.ready=false;K.prof=null;K.proj=null;LS.del('kn.cache');renderLogin()};

/* ---------- projects + sync ---------- */
let T=null,SAVING=false;
function setState(s){K.state=s;const el=document.getElementById('knSync');if(el){el.className='knsync '+s;el.textContent={saved:'บันทึกแล้ว',saving:'กำลังบันทึก…',dirty:'รอซิงก์',ro:'ดูอย่างเดียว',err:'บันทึกไม่ได้'}[s]||''}}
function localSave(dirty){if(!K.proj)return;LS.set('kn.pdata.'+K.proj.id,{name:K.proj.name,owner:K.proj.owner,can_edit:K.proj.can_edit,data:window.knSnapshot(),dirty:!!dirty,t:Date.now()})}
K.dirty=()=>{if(!K.ready||!K.proj)return;if(!K.proj.can_edit){setState('ro');return}localSave(true);setState('dirty');clearTimeout(T);T=setTimeout(push,1200)};
async function push(){if(!K.proj||!K.proj.can_edit||SAVING)return;if(!navigator.onLine||K.offline){setState('dirty');return}
 SAVING=true;setState('saving');const id=K.proj.id;
 try{const{error}=await K.sb.from('projects').update({data:window.knSnapshot(),name:K.proj.name}).eq('id',id);if(error)throw error;if(K.proj&&K.proj.id===id){localSave(false);setState('saved')}}
 catch(e){setState(netErr(e)?'dirty':'err');if(!netErr(e))toast('บันทึกขึ้นเซิร์ฟเวอร์ไม่ได้: '+errT(e))}finally{SAVING=false}}
window.addEventListener('online',()=>{if(K.state==='dirty')push()});
window.addEventListener('beforeunload',e=>{if(K.state==='dirty'&&!DESK&&navigator.onLine){push()}});
async function loadDir(){try{const{data}=await K.sb.rpc('kn_directory');K.dir=data||[]}catch(e){K.dir=[]}}
const nameOf=id=>{const u=K.dir.find(x=>x.id===id);return u?(u.display_name||u.email):'—'};
async function listProjects(){const{data,error}=await K.sb.from('projects').select('id,name,owner,updated_at,updated_by,rev').order('updated_at',{ascending:false});if(error)throw error;
 const{data:mem}=await K.sb.from('project_members').select('project_id,can_edit').eq('user_id',K.prof.id);const me={};(mem||[]).forEach(m=>{me[m.project_id]=m.can_edit});
 K.projs=(data||[]).map(p=>Object.assign(p,{mine:p.owner===K.prof.id,can_edit:p.owner===K.prof.id||!!me[p.id]}));return K.projs}
async function openProject(id,quiet){
 try{const{data,error}=await K.sb.from('projects').select('*').eq('id',id).single();if(error)throw error;
  let can=data.owner===K.prof.id;if(!can){const{data:m}=await K.sb.from('project_members').select('can_edit').eq('project_id',id).eq('user_id',K.prof.id).maybeSingle();can=!!(m&&m.can_edit)}
  const loc=LS.get('kn.pdata.'+id,null);let src=data.data;
  if(loc&&loc.dirty&&can&&loc.t>new Date(data.updated_at).getTime()-1000){src=loc.data;toast('พบงานที่ยังไม่ได้ซิงก์ในเครื่องนี้ ระบบใช้ฉบับล่าสุดในเครื่องและกำลังซิงก์ขึ้นเซิร์ฟเวอร์')}
  K.proj={id,name:data.name,owner:data.owner,can_edit:can};renderUserBtn();LS.set('kn.proj.'+K.prof.id,id);
  window.knApply(src);localSave(src!==data.data);hide();setState(can?'saved':'ro');if(src!==data.data)push();
  if(!can)toast('โครงการนี้ถูกแชร์ให้ดูอย่างเดียว การแก้ไขจะไม่ถูกบันทึก');return true}
 catch(e){if(!quiet)toast('เปิดโครงการไม่ได้: '+errT(e));return false}}
async function renderProjects(first){
 page('โครงการ',`<div class="kspin"></div>`,`<button class="ib" data-k="new">+ โครงการใหม่</button>`);
 let L=[];try{await loadDir();L=await listProjects()}catch(e){root().querySelector('.kna-body').innerHTML=`<p class="kmu">${esc(errT(e))}</p>`;return}
 const old=(()=>{try{const o=JSON.parse(localStorage.getItem('kgstudio.v3')||'null');return o&&o.beams&&o.beams.length?o:null}catch(e){return null}})();
 const row=p=>`<div class="kpj${K.proj&&K.proj.id===p.id?' cur':''}"><div class="kpj-m" data-open="${p.id}"><b>${esc(p.name)}</b><small>${p.mine?'ของฉัน':'แชร์โดย '+esc(nameOf(p.owner))+(p.can_edit?' · แก้ไขได้':' · ดูอย่างเดียว')} · แก้ล่าสุด ${fmtD(p.updated_at)}</small></div>
  <div class="kpj-a">${p.mine?`<button class="ib" data-ren="${p.id}">เปลี่ยนชื่อ</button><button class="ib" data-share="${p.id}">แชร์</button><button class="ib" data-cp="${p.id}">คัดลอก</button><button class="ib kdanger" data-del="${p.id}">ลบ</button>`:`<button class="ib" data-cp="${p.id}">คัดลอกเป็นของฉัน</button>`}</div></div>`;
 const mine=L.filter(p=>p.mine),sh=L.filter(p=>!p.mine);
 root().querySelector('.kna-body').innerHTML=`${first&&!L.length?'<div class="kempty"><h2>เริ่มโครงการแรก</h2><p class="kmu">ทุกโครงการเก็บบนเซิร์ฟเวอร์ เปิดได้ทุกเครื่องที่ล็อกอินบัญชีนี้</p></div>':''}
  ${old?`<div class="kbox"><b>พบข้อมูลคานเดิมในเครื่องนี้</b> (${old.beams.length} คาน จากเวอร์ชันก่อนมีระบบบัญชี) <button class="ib" data-k="import">นำเข้าเป็นโครงการ</button></div>`:''}
  <div class="ksh">โครงการของฉัน · ${mine.length}</div>${mine.map(row).join('')||'<p class="kmu">ยังไม่มีโครงการ</p>'}
  ${sh.length?`<div class="ksh">แชร์ให้ฉัน · ${sh.length}</div>${sh.map(row).join('')}`:''}`;
 if(!K.proj)root().querySelector('[data-k="close"]').style.display='none'}
async function newProject(name,data){const{data:row,error}=await K.sb.from('projects').insert({name,data:data||{}}).select('id').single();if(error)throw error;return row.id}
async function renderShare(id){const p=K.projs.find(x=>x.id===id);if(!p)return;await loadDir();
 const{data:mem}=await K.sb.from('project_members').select('user_id,can_edit').eq('project_id',id);const M=mem||[];
 const opts=K.dir.filter(u=>u.id!==K.prof.id&&!M.some(m=>m.user_id===u.id));
 modal(`<h3>แชร์ "${esc(p.name)}"</h3>${M.map(m=>`<div class="kmem"><span>${esc(nameOf(m.user_id))}</span><select class="kin" data-mem="${m.user_id}"><option value="0"${m.can_edit?'':' selected'}>ดูอย่างเดียว</option><option value="1"${m.can_edit?' selected':''}>แก้ไขได้</option></select><button class="ib kdanger" data-unmem="${m.user_id}">เอาออก</button></div>`).join('')||'<p class="kmu">ยังไม่ได้แชร์ให้ใคร</p>'}
 ${opts.length?`<div class="kmem"><select class="kin" id="kshu">${opts.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)} · ${esc(u.email)}</option>`).join('')}</select><select class="kin" id="kshe"><option value="0">ดูอย่างเดียว</option><option value="1">แก้ไขได้</option></select><button class="ib" id="kshadd">เพิ่ม</button></div>`:'<p class="kmu">ไม่มีผู้ใช้อื่นที่เพิ่มได้</p>'}`,async(m)=>{
  m.querySelectorAll('[data-mem]').forEach(s=>s.onchange=async()=>{await K.sb.from('project_members').update({can_edit:s.value==='1'}).eq('project_id',id).eq('user_id',s.dataset.mem);toast('ปรับสิทธิ์แล้ว')});
  m.querySelectorAll('[data-unmem]').forEach(b=>b.onclick=async()=>{await K.sb.from('project_members').delete().eq('project_id',id).eq('user_id',b.dataset.unmem);m.remove();renderShare(id)});
  const a=m.querySelector('#kshadd');if(a)a.onclick=async()=>{const{error}=await K.sb.from('project_members').insert({project_id:id,user_id:m.querySelector('#kshu').value,can_edit:m.querySelector('#kshe').value==='1'});if(error){toast(errT(error));return}m.remove();renderShare(id)}})}
function modal(html,bind){const m=document.createElement('div');m.className='kmodal';m.innerHTML=`<div class="kmodal-c">${html}<div style="text-align:right;margin-top:14px"><button class="ib" data-x>ปิด</button></div></div>`;document.body.appendChild(m);
 m.querySelector('[data-x]').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};if(bind)bind(m);return m}
function ask(title,val){return new Promise(res=>{const m=modal(`<h3>${esc(title)}</h3><input class="kin" id="kask" value="${esc(val||'')}"><div style="text-align:right;margin-top:10px"><button class="kbtn sm" id="kok">ตกลง</button></div>`);const i=m.querySelector('#kask');i.focus();i.select();
 const ok=()=>{const v=i.value.trim();m.remove();res(v||null)};m.querySelector('#kok').onclick=ok;i.onkeydown=e=>{if(e.key==='Enter')ok()};m.querySelector('[data-x]').onclick=()=>{m.remove();res(null)}})}
function sure(msg){return new Promise(res=>{const m=modal(`<h3>ยืนยัน</h3><p>${msg}</p><div style="text-align:right;margin-top:10px"><button class="kbtn sm kdanger" id="kok">ยืนยัน</button></div>`);m.querySelector('#kok').onclick=()=>{m.remove();res(true)};m.querySelector('[data-x]').onclick=()=>{m.remove();res(false)}})}
root().addEventListener('click',async e=>{const t=e.target.closest('button,[data-open]');if(!t)return;const d=t.dataset;
 try{
 if(d.k==='close'){if(K.proj)hide();return}
 if(d.k==='new'){const n=await ask('ชื่อโครงการใหม่','โครงการ '+(K.projs.length+1));if(!n)return;const id=await newProject(n,{beams:[]});await openProject(id);toast('สร้างโครงการ "'+n+'" แล้ว');return}
 if(d.k==='import'){const o=JSON.parse(localStorage.getItem('kgstudio.v3'));const n=await ask('ชื่อโครงการที่นำเข้า','ข้อมูลเดิมในเครื่อง');if(!n)return;const id=await newProject(n,{settings:o.settings,beams:o.beams,stock:o.stock,cutCfg:o.cutCfg,manual:o.manual});localStorage.setItem('kgstudio.v3.imported',localStorage.getItem('kgstudio.v3'));localStorage.removeItem('kgstudio.v3');await openProject(id);toast('นำเข้าแล้ว');return}
 if(d.open){await openProject(d.open);return}
 if(d.ren){const p=K.projs.find(x=>x.id===d.ren),n=await ask('เปลี่ยนชื่อโครงการ',p.name);if(!n)return;const{error}=await K.sb.from('projects').update({name:n}).eq('id',d.ren);if(error)throw error;if(K.proj&&K.proj.id===d.ren){K.proj.name=n;renderUserBtn()}renderProjects();return}
 if(d.cp){const{data,error}=await K.sb.from('projects').select('name,data').eq('id',d.cp).single();if(error)throw error;await newProject(data.name+' (สำเนา)',data.data);toast('คัดลอกแล้ว');renderProjects();return}
 if(d.del){const p=K.projs.find(x=>x.id===d.del);if(!await sure(`ลบโครงการ <b>${esc(p.name)}</b> ถาวร? ข้อมูลทุกคานในโครงการนี้จะหายและกู้คืนไม่ได้`))return;const{error}=await K.sb.from('projects').delete().eq('id',d.del);if(error)throw error;LS.del('kn.pdata.'+d.del);if(K.proj&&K.proj.id===d.del)K.proj=null;renderProjects();return}
 if(d.share){renderShare(d.share);return}
 if(d.at){renderAdmin(d.at);return}
 }catch(x){toast(errT(x))}});

/* ---------- user button (top bar) ---------- */
function renderUserBtn(){const b=document.getElementById('knUser');if(!b||!K.prof)return;const R=(K.set.roles||{})[K.prof.role];
 b.style.display='';b.innerHTML=`<span id="knSync" class="knsync ${K.state}"></span><span class="knu-n">${esc(K.proj?K.proj.name:'เลือกโครงการ')}</span>`;setState(K.state);
 b.onclick=()=>{const pend=K.isAdmin()?'<span class="kbadge" id="kpend"></span>':'';
  const m=modal(`<div class="kme"><b>${esc(K.prof.display_name||K.prof.email)}</b><small>${esc(K.prof.email)} · ${esc(R?R.label:K.prof.role)}${K.offline?' · ออฟไลน์':''}</small></div>
  <div class="kmenu"><button data-mm="proj">โครงการทั้งหมด</button>${K.isAdmin()?`<button data-mm="admin">หน้าแอดมิน ${pend}</button>`:''}${!DESK&&K.perm.pc?'<button data-mm="pc">ดาวน์โหลดโปรแกรม PC (.exe)</button>':''}${K.offline?'':'<button data-mm="pw">เปลี่ยนรหัสผ่าน</button>'}<button data-mm="out" class="kdanger">ออกจากระบบ</button></div>`,m=>{
   m.querySelectorAll('[data-mm]').forEach(x=>x.onclick=async()=>{const a=x.dataset.mm;m.remove();
    if(a==='proj'){if(K.offline)toast('ต้องออนไลน์เพื่อดูรายการโครงการ');else renderProjects()}
    else if(a==='admin')renderAdmin('users');else if(a==='pc')window.open((K.set.desktop||{}).url||SITE,'_blank');else if(a==='pw')renderReset();
    else if(a==='out'){if(K.state==='dirty'&&!await sure('ยังมีงานที่ยังไม่ได้ซิงก์ขึ้นเซิร์ฟเวอร์ ออกจากระบบตอนนี้งานส่วนนั้นจะค้างอยู่ในเครื่องนี้'))return;K.logout()}})});
  if(K.isAdmin())K.sb.from('profiles').select('id',{count:'exact',head:true}).eq('status','pending').then(r=>{const s=document.getElementById('kpend');if(s&&r.count)s.textContent=r.count})}}

/* ---------- admin ---------- */
let AU=[],AF='pending';
async function renderAdmin(tab){if(!K.isAdmin())return;tab=tab||'users';
 const T=[['users','ผู้ใช้'],['roles','บทบาทและสิทธิ์'],['fields','ช่องสมัครสมาชิก'],['sys','ระบบ']];
 page('หน้าแอดมิน',`<div class="kseg wide">${T.map(([k,t])=>`<button class="${tab===k?'on':''}" data-at="${k}">${t}</button>`).join('')}</div><div id="kad"><div class="kspin"></div></div>`);
 const el=root().querySelector('#kad');
 try{await loadSet();if(tab==='users'){const{data,error}=await K.sb.from('profiles').select('*').order('created_at',{ascending:false});if(error)throw error;AU=data||[];adUsers(el)}
  else if(tab==='roles')adRoles(el);else if(tab==='fields')adFields(el);else adSys(el)}catch(e){el.innerHTML=`<p class="kmu">${esc(errT(e))}</p>`}}
async function saveSet(key,value){const{error}=await K.sb.from('app_settings').upsert({key,value,updated_at:new Date().toISOString()});if(error)throw error;K.set[key]=value;LS.set('kn.set',K.set)}
function adUsers(el){const cnt=s=>AU.filter(u=>s==='all'||u.status===s).length,R=K.set.roles||{};
 const F=(K.set.signup_fields||[]),L=AU.filter(u=>AF==='all'||u.status===AF);
 el.innerHTML=`<div class="kchips">${[['pending','รออนุมัติ'],['active','ใช้งาน'],['suspended','ระงับ'],['rejected','ปฏิเสธ'],['all','ทั้งหมด']].map(([k,t])=>`<button class="ib${AF===k?' on':''}" data-af="${k}">${t} ${cnt(k)}</button>`).join('')}</div>
 ${L.map(u=>{const pm=u.perms||{},self=u.id===K.prof.id;return`<details class="kusr"${AF==='pending'?' open':''}><summary><b>${esc(u.display_name||'—')}</b><span>${esc(u.email)}</span><span class="kst ${u.status}">${ST[u.status]||u.status}</span><span>${esc((R[u.role]||{}).label||u.role)}</span><small>สมัคร ${fmtD(u.created_at)} · เข้าล่าสุด ${fmtD(u.last_seen)}</small></summary>
  <div class="kusr-b" data-u="${u.id}">
   <div class="kinfo">${u.phone?`<div><span>เบอร์โทร</span><b>${esc(u.phone)}</b></div>`:''}${Object.entries(u.extra||{}).map(([k,v])=>`<div><span>${esc((F.find(f=>f.key===k)||{}).label||k)}</span><b>${esc(v)}</b></div>`).join('')}${u.approved_at?`<div><span>อนุมัติเมื่อ</span><b>${fmtD(u.approved_at)}</b></div>`:''}</div>
   <div class="kgrid">
    <label class="kf"><span>บทบาท</span><select class="kin" data-f="role"${self?' disabled':''}>${Object.entries(R).map(([k,r])=>`<option value="${esc(k)}"${u.role===k?' selected':''}>${esc(r.label||k)}</option>`).join('')}</select></label>
    <label class="kf"><span>หมดอายุ (เว้นว่าง = ไม่หมด)</span><input class="kin" type="date" data-f="expires_at" value="${esc(u.expires_at||'')}"></label>
    <label class="kf" style="grid-column:1/-1"><span>บันทึกของแอดมิน</span><input class="kin" data-f="note" value="${esc(u.note||'')}"></label></div>
   <div class="ksh">สิทธิ์รายคน (ทับค่าของบทบาท)</div><div class="kgrid">${PK.map(([k,t,ty])=>`<label class="kf"><span>${t}</span><select class="kin" data-p="${k}"><option value="">ตามบทบาท (${ty==='lvl'?LV[(R[u.role]||{})[k]]||'—':((R[u.role]||{})[k]?'ได้':'ไม่ได้')})</option>${ty==='lvl'?Object.entries(LV).map(([v,l])=>`<option value="${v}"${pm[k]===v?' selected':''}>${l}</option>`).join(''):`<option value="1"${pm[k]===true?' selected':''}>ได้</option><option value="0"${pm[k]===false?' selected':''}>ไม่ได้</option>`}</select></label>`).join('')}</div>
   <div class="kchips" style="margin-top:10px">${self?'<span class="kmu">บัญชีของคุณเอง</span>':`${u.status!=='active'?'<button class="kbtn sm" data-st="active">อนุมัติ / เปิดใช้</button>':''}${u.status==='active'?'<button class="ib" data-st="suspended">ระงับ</button>':''}${u.status==='pending'?'<button class="ib kdanger" data-st="rejected">ปฏิเสธ</button>':''}`}<span style="flex:1"></span><button class="ib on" data-save="1">บันทึกการตั้งค่า</button></div></div></details>`}).join('')||'<p class="kmu">ไม่มีผู้ใช้ในกลุ่มนี้</p>'}`;
 el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.af){AF=b.dataset.af;adUsers(el);return}const box=b.closest('[data-u]');if(!box)return;const id=box.dataset.u;
  const upd={};if(b.dataset.st)upd.status=b.dataset.st;
  if(b.dataset.save||b.dataset.st==='active'){box.querySelectorAll('[data-f]').forEach(i=>{if(!i.disabled)upd[i.dataset.f]=i.value||null});const pm={};box.querySelectorAll('[data-p]').forEach(s=>{if(s.value==='')return;const ty=PK.find(x=>x[0]===s.dataset.p)[2];pm[s.dataset.p]=ty==='lvl'?s.value:s.value==='1'});upd.perms=pm}
  if(upd.status==='rejected'&&!await sure('ปฏิเสธคำขอของผู้ใช้นี้?'))return;
  busy(b,true);try{const{data,error}=await K.sb.from('profiles').update(upd).eq('id',id).select().single();if(error)throw error;Object.assign(AU.find(u=>u.id===id),data);toast(upd.status?'เปลี่ยนสถานะเป็น "'+ST[upd.status]+'" แล้ว':'บันทึกแล้ว');adUsers(el)}catch(x){toast(errT(x));busy(b,false)}}}
function adRoles(el){const R=JSON.parse(JSON.stringify(K.set.roles||DEF_SET.roles));
 const draw=()=>{el.innerHTML=`<p class="kmu">สิทธิ์ตั้งต้นของแต่ละบทบาท · ปรับรายคนเพิ่มได้ที่แท็บผู้ใช้ · บทบาทแอดมินได้ทุกสิทธิ์เสมอ</p><div class="ktbl"><table><tr><th>บทบาท</th>${PK.map(p=>`<th>${p[1]}</th>`).join('')}<th></th></tr>
  ${Object.entries(R).map(([k,r])=>`<tr data-r="${esc(k)}"><td><input class="kin" data-l value="${esc(r.label||k)}"><small>${esc(k)}</small></td>${PK.map(([pk,,ty])=>`<td>${k==='admin'?'✓':ty==='lvl'?`<select class="kin" data-k="${pk}">${Object.entries(LV).map(([v,l])=>`<option value="${v}"${r[pk]===v?' selected':''}>${l}</option>`).join('')}</select>`:`<input type="checkbox" data-k="${pk}"${r[pk]?' checked':''}>`}</td>`).join('')}<td>${['admin','viewer'].includes(k)?'':`<button class="ib kdanger" data-rdel="${esc(k)}">ลบ</button>`}</td></tr>`).join('')}</table></div>
  <div class="kchips" style="margin-top:12px"><button class="ib" id="kradd">+ บทบาทใหม่</button><span style="flex:1"></span><button class="kbtn sm" id="krsave">บันทึกบทบาท</button></div>`;
  el.querySelectorAll('tr[data-r]').forEach(tr=>{const k=tr.dataset.r;tr.querySelector('[data-l]').oninput=e=>{R[k].label=e.target.value};tr.querySelectorAll('[data-k]').forEach(i=>i.onchange=()=>{R[k][i.dataset.k]=i.type==='checkbox'?i.checked:i.value})});
  el.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{delete R[b.dataset.rdel];draw()});
  el.querySelector('#kradd').onclick=async()=>{const n=await ask('ชื่อบทบาทใหม่ เช่น ช่างเหล็ก','');if(!n)return;let k='r'+Date.now().toString(36);R[k]={label:n,beam:'view',cut:'view',export:false,pc:false,settings:'none'};draw()};
  el.querySelector('#krsave').onclick=async e=>{busy(e.target,true);try{R.admin=Object.assign({},DEF_SET.roles.admin,{label:R.admin.label});await saveSet('roles',R);toast('บันทึกบทบาทแล้ว · ผู้ใช้ที่ใช้บทบาทที่ลบไปจะได้สิทธิ์เท่าผู้ดูอย่างเดียว')}catch(x){toast(errT(x))}busy(e.target,false)}};draw()}
function adFields(el){const F=JSON.parse(JSON.stringify(K.set.signup_fields||[]));const TY=[['text','ข้อความ'],['tel','เบอร์โทร'],['number','ตัวเลข'],['date','วันที่'],['email','อีเมล'],['select','ตัวเลือก']];
 const draw=()=>{el.innerHTML=`<p class="kmu">ช่องที่ผู้สมัครต้องกรอก · ชื่อ-นามสกุล อีเมล และรหัสผ่านเป็นช่องบังคับของระบบ แก้ไม่ได้ · ช่องที่เพิ่มจะแสดงในหน้าสมัครทันทีหลังบันทึก</p>
  <div class="kfx locked"><b>ชื่อ-นามสกุล</b><span>บังคับ</span></div>
  ${F.map((f,i)=>`<div class="kfx" data-i="${i}"><input class="kin" data-x="label" value="${esc(f.label)}" placeholder="ชื่อช่อง"><select class="kin" data-x="type">${TY.map(([v,l])=>`<option value="${v}"${f.type===v?' selected':''}>${l}</option>`).join('')}</select>
   ${f.type==='select'?`<input class="kin" data-x="options" value="${esc(f.options||'')}" placeholder="ตัวเลือก คั่นด้วย ,">`:'<span></span>'}<label class="kck"><input type="checkbox" data-x="required"${f.required?' checked':''}> บังคับกรอก</label>
   <span class="kchips"><button class="ib" data-mv="-1"${i?'':' disabled'}>↑</button><button class="ib" data-mv="1"${i<F.length-1?'':' disabled'}>↓</button><button class="ib kdanger" data-rm>ลบ</button></span></div>`).join('')}
  <div class="kfx locked"><b>อีเมล · รหัสผ่าน</b><span>บังคับ</span></div>
  <div class="kchips" style="margin-top:12px"><button class="ib" id="kfadd">+ เพิ่มช่อง</button><span style="flex:1"></span><button class="kbtn sm" id="kfsave">บันทึกช่องสมัคร</button></div>`;
  el.querySelectorAll('[data-i]').forEach(row=>{const f=F[+row.dataset.i];row.querySelectorAll('[data-x]').forEach(i=>{i.oninput=i.onchange=()=>{const k=i.dataset.x;f[k]=i.type==='checkbox'?i.checked:i.value;if(k==='type')draw()}});
   row.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const i=+row.dataset.i,j=i+ +b.dataset.mv;[F[i],F[j]]=[F[j],F[i]];draw()});row.querySelector('[data-rm]').onclick=()=>{F.splice(+row.dataset.i,1);draw()}});
  el.querySelector('#kfadd').onclick=()=>{F.push({key:'f'+Date.now().toString(36),label:'',type:'text',required:false});draw()};
  el.querySelector('#kfsave').onclick=async e=>{if(F.some(f=>!String(f.label).trim())){toast('กรุณาตั้งชื่อทุกช่อง');return}busy(e.target,true);try{await saveSet('signup_fields',F);toast('บันทึกช่องสมัครแล้ว')}catch(x){toast(errT(x))}busy(e.target,false)}};draw()}
function adSys(el){const o=Object.assign({grace_days:14},K.set.offline||{}),d=Object.assign({},DEF_SET.desktop,K.set.desktop||{});
 el.innerHTML=`<div class="ksh">โปรแกรม PC (.exe)</div><div class="kgrid">
  <label class="kf"><span>ใช้งานออฟไลน์ได้ต่อเนื่อง (วัน) · 0 = ไม่อนุญาต</span><input class="kin" type="number" min="0" id="kgr" value="${o.grace_days}"></label>
  <label class="kf"><span>ลิงก์ดาวน์โหลด .exe</span><input class="kin" id="kdl" value="${esc(d.url)}"></label></div>
  <p class="kmu">ทุกครั้งที่โปรแกรม PC ต่ออินเทอร์เน็ตได้ จะตรวจสิทธิ์และเริ่มนับวันใหม่ · ถ้าระงับบัญชี ผู้ใช้จะใช้ออฟไลน์ต่อได้ไม่เกินจำนวนวันนี้</p>
  <div class="kchips"><span style="flex:1"></span><button class="kbtn sm" id="kssave">บันทึก</button></div>`;
 el.querySelector('#kssave').onclick=async e=>{busy(e.target,true);try{await saveSet('offline',{grace_days:Math.max(0,Math.round(+el.querySelector('#kgr').value||0))});await saveSet('desktop',Object.assign(d,{url:el.querySelector('#kdl').value.trim()}));toast('บันทึกแล้ว')}catch(x){toast(errT(x))}busy(e.target,false)}}
})();
