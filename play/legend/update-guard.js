/* LEGEND BALL X1000 - iOS / in-app browser build guard.
   Only checks presentation version; it never changes spins, wallet, or RNG.
   Never reload a running round without the player's explicit tap. */
(()=>{
 'use strict';
 const build=document.querySelector('meta[name="legend-ui-build"]')?.content;
 if(!build)return;
 const root=document.documentElement;
 root.dataset.uiBuild=build;
 const playPage=location.pathname==='/play/'||location.pathname==='/play/index.html';
 if(playPage){
  const url=new URL(location.href);
  const old=url.searchParams.has('square')||url.searchParams.has('art');
  if(old){url.searchParams.delete('square');url.searchParams.delete('art');}
  if(url.searchParams.get('ui')!==build){url.searchParams.set('ui',build);}
  if(old||url.href!==location.href)history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 }
 function createVerifyMark(){
  if(!playPage||new URLSearchParams(location.search).get('verify')!=='1')return;
  if(document.getElementById('legend-ui-version-stamp'))return;
  const mark=document.createElement('div');
  mark.id='legend-ui-version-stamp';
  mark.textContent='UI V8 · CUTOUT';
  mark.setAttribute('aria-label','Legend Ball modular UI build '+build);
  Object.assign(mark.style,{
   position:'fixed',top:'max(8px,env(safe-area-inset-top))',right:'8px',zIndex:'9996',
   pointerEvents:'none',background:'#0f1229e6',color:'#e8d7ab',
   border:'1px solid #d9a95e66',borderRadius:'12px',padding:'3px 7px',
   font:'700 10px/1.4 system-ui',letterSpacing:'.05em'
  });
  document.body.append(mark);
 }
 function showUpdate(latest){
  if(!playPage||document.getElementById('legend-ui-outdated'))return;
  const notice=document.createElement('div');
  notice.id='legend-ui-outdated';
  notice.setAttribute('role','status');
  Object.assign(notice.style,{
   position:'fixed',left:'12px',right:'12px',
   bottom:'max(18px,env(safe-area-inset-bottom))',
   zIndex:'9999',maxWidth:'520px',margin:'auto',
   border:'1px solid #d8af6b',borderRadius:'16px',
   background:'#171027f5',color:'#fff6d9',
   boxShadow:'0 6px 32px #000b',padding:'12px',
   display:'flex',alignItems:'center',gap:'12px',
   font:'600 13px/1.35 system-ui'
  });
  const msg=document.createElement('span');
  msg.textContent='Layout game baru tersedia. Buka versi terbaru agar aset dan panel tidak tercampur.';
  const button=document.createElement('button');
  button.type='button';button.textContent='Muat terbaru';
  button.setAttribute('aria-label','Buka versi game terbaru');
  Object.assign(button.style,{flexShrink:'0',font:'700 12px system-ui',border:'0',
   borderRadius:'999px',padding:'10px 14px',background:'#efbe62',color:'#19122c',
   cursor:'pointer'});
  button.addEventListener('click',()=>{
   const url=new URL('/play/',location.href);
   url.searchParams.set('ui',latest);
   url.searchParams.set('fresh',String(Date.now()));
   if(new URLSearchParams(location.search).has('verify'))url.searchParams.set('verify','1');
   location.assign(url.toString());
  });
  notice.append(msg,button);
  document.body.append(notice);
 }
 let lastCheck=0,checking=false;
 async function checkBuild(){
  if(!playPage||checking||Date.now()-lastCheck<6000)return;
  lastCheck=Date.now();checking=true;
  try{
   const url='/play/ui-version.json?check='+Date.now();
   const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)return;
   const info=await response.json();
   if(typeof info?.ui==='string'&&info.ui!==build)showUpdate(info.ui);
  }catch{/* Offline play preview should remain usable. */}
  finally{checking=false;}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createVerifyMark,{once:true});
 else createVerifyMark();
 window.addEventListener('pageshow',()=>{void checkBuild();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkBuild();});
})();
