
// ⚠️ Remplacez par l'URL de votre Web App (doit finir par /exec)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuMna5F_FLzrOy5OBCtKEW2aUGi3f0UMK3qVfB9VNUzEUZ87VSQlh8JitSiBqphe6G/exec";

const groups=[
 {title:"Installations",items:["G-DEG","G-IAM","RTC-DEG","RTC-IAM"]},
 {title:"Dérangements",items:["FIXE","ADSL-IAM","ADSL-DEG","GPON-IAM","GPON-DEG"]}
];
let counts={};try{counts=JSON.parse(localStorage.getItem("sit_counts")||"{}")}catch(e){}
const save=()=>{try{localStorage.setItem("sit_counts",JSON.stringify(counts))}catch(e){}};
const get=k=>counts[k]||0;
document.getElementById("date").textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
function render(){const app=document.getElementById("app");app.innerHTML="";groups.forEach(g=>{const total=g.items.reduce((s,n)=>s+get(g.title+"|"+n),0);const card=document.createElement("div");card.className="card";card.innerHTML=`<div class="card-h"><h2>${g.title}</h2><span class="total">Total ${total}</span></div>`;g.items.forEach(n=>{const k=g.title+"|"+n,v=get(k);const row=document.createElement("div");row.className="row";row.innerHTML=`<span class="name">${n}</span><button class="rb minus" aria-label="Moins">−</button><span class="num${v?" on":""}">${v}</span><button class="rb plus" aria-label="Plus">+</button>`;row.querySelector(".plus").onclick=()=>{counts[k]=get(k)+1;save();render()};row.querySelector(".minus").onclick=()=>{counts[k]=Math.max(0,get(k)-1);save();render()};card.appendChild(row)});app.appendChild(card)})}
function buildData(){let data={};groups.forEach(g=>g.items.forEach(n=>data[n]=get(g.title+"|"+n)));return data}
function buildText(){return groups.map(g=>g.title+"\n"+g.items.map(n=>{const sep=(n==="G-DEG"||n==="G-IAM")?": ":" : ";return n+sep+get(g.title+"|"+n)}).join("\n")).join("\n")}
function toast(m,ok=false){const t=document.getElementById("toast");t.textContent=m;t.style.color=ok?"#17843b":"var(--red)";setTimeout(()=>{t.textContent=""},4000)}
document.getElementById("copyBtn").onclick=async()=>{const text=buildText();try{await navigator.clipboard.writeText(text);toast("✓ Copié",true)}catch(e){const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");toast("✓ Copié",true)}catch(_){toast("Échec de la copie")}ta.remove()}};
const modal=document.getElementById("loginModal");
document.getElementById("sendBtn").onclick=()=>{document.getElementById("username").value=(()=>{try{return localStorage.getItem("sit_user")||""}catch(e){return ""}})();document.getElementById("password").value="";modal.classList.add("show");setTimeout(()=>document.getElementById("username").focus(),100)};
document.getElementById("cancelLogin").onclick=()=>modal.classList.remove("show");modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show")});
document.getElementById("loginBtn").onclick=async()=>{
 const username=document.getElementById("username").value.trim();
 const password=document.getElementById("password").value;
 if(!username||!password){toast("Veuillez remplir les deux champs.");return}
 if(!GOOGLE_SCRIPT_URL||GOOGLE_SCRIPT_URL.includes("COLLEZ_ICI")){toast("URL Google Apps Script non configurée.");return}

 const btn=document.getElementById("loginBtn");btn.disabled=true;btn.textContent="Envoi...";

 // ✅ Form-urlencoded => Apps Script remplit e.parameter correctement
 const formBody = new URLSearchParams({
   action: "saveSituation",
   username: username,
   password: password,
   situation: JSON.stringify(buildData()),
   clientDate: new Date().toISOString()
 }).toString();

 try{
   const response = await fetch(GOOGLE_SCRIPT_URL, {
     method: "POST",
     headers: {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
     body: formBody,
     redirect: "follow"
   });

   const raw = await response.text();
   let result;
   try { result = JSON.parse(raw); }
   catch(_) {
     console.error("Réponse non-JSON:", raw);
     toast("Réponse invalide du serveur.");
     return;
   }

   if(result.success){
     modal.classList.remove("show");
     toast("Situation envoyée avec succès",true);
   } else {
     toast("✗ " + (result.message || "Nom ou password incorrect."));
   }
 }catch(e){
   console.error(e);
   toast("Impossible de contacter Google Sheets. Vérifiez l'URL et le déploiement.");
 }finally{
   btn.disabled=false;btn.textContent="Envoyer";
 }
};
document.getElementById("password").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("loginBtn").click()});
const resetBtn=document.getElementById("resetBtn");let armTimer=null;function disarm(){resetBtn.classList.remove("armed");resetBtn.textContent="Remettre tout à zéro";clearTimeout(armTimer);armTimer=null}function doReset(){counts={};try{localStorage.removeItem("sit_counts")}catch(e){}save();render();disarm();toast("✓ Remis à zéro",true)}resetBtn.addEventListener("click",()=>{if(armTimer){doReset();return}resetBtn.classList.add("armed");resetBtn.textContent="Appuyer à nouveau pour confirmer";armTimer=setTimeout(disarm,3500)});
// ===== Première connexion : nom + création du mot de passe =====
const wm=document.getElementById("welcomeModal"),wName=document.getElementById("wName"),wPass=document.getElementById("wPass"),wPass2=document.getElementById("wPass2"),wBtn=document.getElementById("wBtn"),wBack=document.getElementById("wBack");
const wLabels={name:"Continuer",create:"Enregistrer le mot de passe",login:"Se connecter"};
let wStep="name";
async function api(params){
  const r=await fetch(GOOGLE_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=utf-8"},body:new URLSearchParams(params).toString(),redirect:"follow"});
  return JSON.parse(await r.text());
}
function wMsg(m,ok=false){const e=document.getElementById("wMsg");e.textContent=m||"";e.style.color=ok?"#17843b":"var(--red)"}
function wSet(step){
  wStep=step;wMsg("");wBtn.textContent=wLabels[step];
  wName.readOnly=step!=="name";wBack.hidden=step==="name";
  wPass.hidden=step==="name";wPass2.hidden=step!=="create";
  wPass.placeholder=step==="create"?"Nouveau mot de passe (6 caractères min.)":"Mot de passe";
  wPass.autocomplete=step==="create"?"new-password":"current-password";
  wPass.value="";wPass2.value="";
  document.getElementById("wTitle").textContent=step==="create"?"Créez votre mot de passe":step==="login"?"Connexion":"Bienvenue";
  document.getElementById("wSub").textContent=step==="create"?"Première connexion : choisissez un mot de passe personnel.":step==="login"?"Entrez votre mot de passe.":"Entrez votre nom pour commencer.";
  setTimeout(()=>(step==="name"?wName:wPass).focus(),100);
}
function finishWelcome(name,r,pw){
  try{localStorage.setItem("sit_user",name)}catch(e){}
  adminPass=r.isAdmin?pw:"";adminData=null;
  wm.classList.remove("show");
  applyRole(!!r.isUser,!!r.isAdmin);
  toast("✓ Bienvenue "+name,true);
}
wBack.onclick=()=>{wSet("name");wName.focus()};
wBtn.onclick=async()=>{
  const name=wName.value.trim();
  if(!name){wMsg("Entrez votre nom.");return}
  if(!GOOGLE_SCRIPT_URL){wMsg("URL Google Apps Script non configurée.");return}
  wBtn.disabled=true;wBtn.textContent="Veuillez patienter...";
  try{
    if(wStep==="name"){
      const r=await api({action:"checkUser",username:name});
      if(!r.success){wMsg(r.message||"Nom introuvable.");return}
      wName.value=r.username||name;
      wSet(r.hasPassword?"login":"create");
    }else if(wStep==="create"){
      if(wPass.value.length<6){wMsg("6 caractères minimum.");return}
      if(wPass.value!==wPass2.value){wMsg("Les mots de passe ne correspondent pas.");return}
      const r=await api({action:"setPassword",username:name,password:wPass.value});
      if(!r.success){wMsg(r.message||"Échec de l'enregistrement.");return}
      finishWelcome(r.username||name,r,wPass.value);
    }else{
      const r=await api({action:"login",username:name,password:wPass.value});
      if(!r.success){wMsg(r.message||"Mot de passe incorrect.");return}
      finishWelcome(r.username||name,r,wPass.value);
    }
  }catch(e){
    console.error(e);wMsg("Impossible de contacter le serveur.");
  }finally{
    wBtn.disabled=false;wBtn.textContent=wLabels[wStep];
  }
};
[wName,wPass,wPass2].forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter")wBtn.click()}));
let savedUser="";try{savedUser=localStorage.getItem("sit_user")||""}catch(e){}
if(!savedUser){wm.classList.add("show");setTimeout(()=>wName.focus(),150)}

// ===== Espace administrateur =====
const adminBtn=document.getElementById("adminBtn"),panel=document.getElementById("adminPanel"),aAuth=document.getElementById("adminAuth"),aPass=document.getElementById("aPass"),aMsg=document.getElementById("aMsg"),adminMsg=document.getElementById("adminMsg"),adminContent=document.getElementById("adminContent"),dPick=document.getElementById("dPick");
const INST=["G-DEG","G-IAM","RTC-DEG","RTC-IAM"],DER=["FIXE","ADSL-IAM","ADSL-DEG","GPON-IAM","GPON-DEG"],ALLI=INST.concat(DER);
const C_INST="#e30613",C_DER="#2563eb";
const pad=n=>String(n).padStart(2,"0");
const isoOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const iso2dmy=s=>{const p=s.split("-");return p[2]+"/"+p[1]+"/"+p[0]};
const addDays=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return isoOf(d)};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
let adminPass="",adminData=null,adminDay=isoOf(new Date());
const curUser=()=>{try{return localStorage.getItem("sit_user")||""}catch(e){return ""}};
// Rôles : utilisateur seul / admin seul (accès direct à l'analyse) / les deux (page + bouton admin)
function applyRole(isU,isA){
  try{localStorage.setItem("sit_admin",isA?"1":"0");localStorage.setItem("sit_isuser",isU?"1":"0")}catch(e){}
  const only=isA&&!isU;
  adminBtn.hidden=!(isA&&isU);
  document.body.classList.toggle("adminonly",only);
  document.getElementById("adminClose").hidden=only;
  document.getElementById("adminOut").hidden=!only;
  document.getElementById("aCancel").hidden=only;
  document.getElementById("aOut").hidden=!only;
  if(only&&panel.hidden&&!aAuth.classList.contains("show"))startAdmin();
}
function logout(){try{["sit_user","sit_admin","sit_isuser"].forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()}
try{
  if(curUser()&&localStorage.getItem("sit_admin")!==null)applyRole(localStorage.getItem("sit_isuser")!=="0",localStorage.getItem("sit_admin")==="1");
}catch(e){}
if(curUser()){api({action:"checkUser",username:curUser()}).then(r=>{if(r&&r.success)applyRole(!!r.isUser,!!r.isAdmin)}).catch(()=>{})}

async function loadAdmin(){
  const r=await api({action:"getAdminData",username:curUser(),password:adminPass,days:"30"});
  if(!r.success)throw new Error(r.message||"Erreur.");
  adminData=r;
}
function openPanel(){panel.hidden=false;document.body.style.overflow="hidden";dPick.value=adminDay;renderAdmin()}
function promptAuth(msg){aPass.value="";aMsg.textContent=msg||"";aAuth.classList.add("show");setTimeout(()=>aPass.focus(),100)}
function startAdmin(){
  if(adminPass&&adminData){openPanel();return}
  if(adminPass){loadAdmin().then(openPanel).catch(e=>{adminPass="";promptAuth(e&&e.message&&e.message.indexOf("fetch")===-1?e.message:"")});return}
  promptAuth();
}
adminBtn.onclick=startAdmin;
document.getElementById("adminOut").onclick=logout;
document.getElementById("aOut").onclick=logout;
document.getElementById("aCancel").onclick=()=>aAuth.classList.remove("show");
document.getElementById("aOk").onclick=async()=>{
  if(!aPass.value){aMsg.textContent="Entrez votre mot de passe.";return}
  const b=document.getElementById("aOk");b.disabled=true;b.textContent="...";
  adminPass=aPass.value;
  try{await loadAdmin();aAuth.classList.remove("show");openPanel()}
  catch(e){adminPass="";aMsg.textContent=(e&&e.message&&e.message.indexOf("fetch")===-1)?e.message:"Impossible de contacter le serveur."}
  finally{b.disabled=false;b.textContent="Ouvrir"}
};
aPass.addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("aOk").click()});
document.getElementById("adminClose").onclick=()=>{panel.hidden=true;document.body.style.overflow=""};
dPick.onchange=()=>{if(dPick.value){adminDay=dPick.value;renderAdmin()}};
document.getElementById("dPrev").onclick=()=>{adminDay=addDays(adminDay,-1);dPick.value=adminDay;renderAdmin()};
document.getElementById("dNext").onclick=()=>{adminDay=addDays(adminDay,1);dPick.value=adminDay;renderAdmin()};
document.getElementById("dRef").onclick=async()=>{adminMsg.textContent="Actualisation...";try{await loadAdmin();renderAdmin()}catch(e){adminMsg.textContent="✗ "+(e.message||"Erreur")}};

function renderAdmin(){
  adminMsg.textContent="";
  // dernière situation envoyée de chaque agent pour chaque jour
  const W=adminData.workers.map(w=>{const m={};w.rows.forEach(r=>{m[r.date]=r});return{name:w.user,days:m}});
  const dmy=iso2dmy(adminDay);
  const sum=(v,items)=>v?items.reduce((s,k)=>s+(Number(v[k])||0),0):0;
  const rec=W.map(w=>({name:w.name,r:w.days[dmy]||null}));
  const sent=rec.filter(x=>x.r);
  const tot={};ALLI.forEach(k=>{tot[k]=sent.reduce((s,x)=>s+(Number(x.r.values[k])||0),0)});
  const tI=sum(tot,INST),tD=sum(tot,DER);
  if(!sent.length)adminMsg.textContent="Aucune situation envoyée pour cette date.";

  // 1) Total par catégorie
  const max1=Math.max(1,...ALLI.map(k=>tot[k]));
  const cat=ALLI.map(k=>`<div class="ch-row"><span class="ch-l">${k}</span><div class="ch-t"><div class="ch-b" style="width:${tot[k]/max1*100}%;background:${INST.includes(k)?C_INST:C_DER}"></div></div><span class="ch-v">${tot[k]}</span></div>`).join("");

  // 2) Par agent (Installations + Dérangements)
  const r2=sent.map(x=>({n:x.name,i:sum(x.r.values,INST),d:sum(x.r.values,DER)})).sort((a,b)=>(b.i+b.d)-(a.i+a.d));
  const max2=Math.max(1,...r2.map(x=>x.i+x.d));
  const wk=r2.map(x=>`<div class="ch-row"><span class="ch-l">${esc(cap(x.n))}</span><div class="ch-t"><div class="ch-b" style="width:${x.i/max2*100}%;background:${C_INST}"></div><div class="ch-b" style="width:${x.d/max2*100}%;background:${C_DER}"></div></div><span class="ch-v">${x.i+x.d}</span></div>`).join("");

  // 3) 7 derniers jours
  const d7=[];for(let i=6;i>=0;i--)d7.push(addDays(adminDay,-i));
  const tr=d7.map(s=>{const k=iso2dmy(s);let a=0,b=0;W.forEach(w=>{const r=w.days[k];if(r){a+=sum(r.values,INST);b+=sum(r.values,DER)}});return{s,a,b}});
  const max3=Math.max(1,...tr.map(x=>Math.max(x.a,x.b)));
  const trend=tr.map(x=>`<div class="tcol"><div class="tn">${x.a}·${x.b}</div><div class="tbars"><div class="tbar" style="height:${x.a/max3*100}%;background:${C_INST}"></div><div class="tbar" style="height:${x.b/max3*100}%;background:${C_DER}"></div></div><div class="tl">${x.s.slice(8)}/${x.s.slice(5,7)}</div></div>`).join("");

  // 4) Tableau détaillé de tous les agents
  const head="<tr><th>Agent</th>"+ALLI.map(k=>`<th>${k}</th>`).join("")+"<th>Heure</th></tr>";
  const body=rec.map(x=>x.r
    ?`<tr><td>${esc(cap(x.name))}</td>${ALLI.map(k=>{const v=Number(x.r.values[k])||0;return `<td class="${v?"":"zero"}">${v}</td>`}).join("")}<td>${esc(x.r.time||"")}</td></tr>`
    :`<tr><td>${esc(cap(x.name))}</td><td class="miss" colspan="${ALLI.length+1}">pas encore envoyé</td></tr>`).join("");
  const totRow=`<tr class="tot"><td>Total</td>${ALLI.map(k=>`<td>${tot[k]}</td>`).join("")}<td></td></tr>`;

  const legend=`<div class="legend"><span><i style="background:${C_INST}"></i>Installations</span><span><i style="background:${C_DER}"></i>Dérangements</span></div>`;
  const cardS='class="card" style="padding-bottom:14px"';
  adminContent.innerHTML=
   `<div class="kpis"><div class="kpi"><b style="color:${C_INST}">${tI}</b><span>Installations</span></div><div class="kpi"><b style="color:${C_DER}">${tD}</b><span>Dérangements</span></div><div class="kpi"><b>${sent.length}/${W.length}</b><span>Agents ayant envoyé</span></div></div>`+
   `<div ${cardS}><div class="card-h"><h2>Total par catégorie</h2></div>${cat}</div>`+
   `<div ${cardS}><div class="card-h"><h2>Par agent</h2></div>${legend}${wk||'<div class="small">—</div>'}</div>`+
   `<div ${cardS}><div class="card-h"><h2>7 derniers jours</h2></div>${legend}<div class="trend">${trend}</div></div>`+
   `<div ${cardS}><div class="card-h"><h2>Détail de tous les agents</h2></div><div class="tbl-w"><table class="tbl">${head}${body}${totRow}</table></div></div>`;
}

render();
