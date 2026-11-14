/* One presentation contract for the game and Universal Game Studio. */
(() => {
 'use strict';
 const base=window.LegendBallApplyLayout, unit=n=>`${n/10.8}cqw`;
 const set=(el,key,value)=>el.style.setProperty(key,value,'important');
 const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden||!!document.getElementById('batterySetting')?.checked;
 let current,resolveAsset,scene,frame=0,tiltX=0,tiltY=0,targetX=0,targetY=0;
 let pageSuspended=false;
 const films=new Map();
 function movie(wrap,layer){
  if(!layer.motion||films.has(layer.id)||window.SkygateEditorPreview)return;
  const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.src=resolveAsset(layer.motion.src);
  // Keep the inline decoder in the document so Safari can resume its media pipeline.
  video.className='legend-motion-source';video.setAttribute('aria-hidden','true');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.tabIndex=-1;
  const canvas=document.createElement('canvas');canvas.className='legend-motion';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl)return;
  let contextLost=false,callback=0,watchdog=0,generation=0,pending=false,needsGesture=false;
  let paintedFrames=0,restores=0,reloads=0,retries=0,lastMediaTime=-1,lastProgress=0;
  const allowed=()=>!pageSuspended&&!reduced()&&document.documentElement.dataset.boot==='entered';
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Movie compositor unavailable');return s;};
  function initGraphics(){
   const program=gl.createProgram();
   const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*.5,(1.0-p.y)*.5);gl_Position=vec4(p,0.,1.);}');
   // Black matte only. The transparent poster remains the paused/error fallback.
   const fragment=shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D movie;varying vec2 uv;void main(){vec3 c=texture2D(movie,uv).rgb;float m=max(max(c.r,c.g),c.b);float a=smoothstep(.015,.07,m);gl_FragColor=vec4(c,a);}');
   gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   gl.deleteShader(vertex);gl.deleteShader(fragment);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Movie compositor unavailable');
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.uniform1i(gl.getUniformLocation(program,'movie'),0);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   // Restored contexts have fresh state even when the canvas dimensions did not change.
   gl.viewport(0,0,canvas.width,canvas.height);
  }
  const cancelFrame=()=>{if(!callback)return;if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);callback=0;};
  const clearWatchdog=()=>{clearTimeout(watchdog);watchdog=0;};
  const stop=()=>{generation++;pending=false;clearWatchdog();cancelFrame();video.pause();canvas.classList.remove('ready');};
  const queueFrame=()=>{if(!callback&&allowed()&&!contextLost&&!video.paused)callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(paint):requestAnimationFrame(paint);};
  function paint(){
   callback=0;if(!allowed()||contextLost||gl.isContextLost()||video.paused)return;
   if(video.readyState>=2&&video.videoWidth&&video.videoHeight){
    if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;gl.viewport(0,0,canvas.width,canvas.height);}
    try{
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
     if(!gl.isContextLost()){
      canvas.classList.add('ready');paintedFrames++;
      if(video.currentTime!==lastMediaTime){lastMediaTime=video.currentTime;lastProgress=performance.now();retries=0;}
     }
    }catch{canvas.classList.remove('ready');}
   }
   queueFrame();
  }
  function requestPlayback(){
   if(pending||!allowed()||contextLost)return;
   pending=true;const ticket=generation;
   video.play().then(()=>{
    if(ticket!==generation)return;
    pending=false;if(!allowed()||contextLost)return;
    needsGesture=false;queueFrame();
   }).catch(error=>{
    if(ticket!==generation)return;
    pending=false;
    if(error.name==='NotAllowedError'){needsGesture=true;clearWatchdog();}
   });
  }
  function watch(){
   watchdog=0;if(!allowed()||contextLost||needsGesture)return;
   // A resolved play() is not proof of animation: suspended decoders can stop
   // delivering frames after unlock. Retry, then reload only that video stream.
   if(performance.now()-lastProgress>2600){
    canvas.classList.remove('ready');cancelFrame();generation++;pending=false;
    video.pause();retries++;
    if(retries>3){needsGesture=true;clearWatchdog();return;}
    if(retries>1||video.error){video.load();reloads++;}
    lastProgress=performance.now();requestPlayback();
   }
   armWatchdog();
  }
  function armWatchdog(){if(!watchdog&&allowed()&&!contextLost&&!needsGesture)watchdog=setTimeout(watch,1000);}
  function start(){
   if(!allowed()||contextLost||gl.isContextLost())return;
   if(watchdog&&!video.paused&&callback&&!needsGesture)return;
   needsGesture=false;retries=0;lastProgress=performance.now();
   requestPlayback();queueFrame();armWatchdog();
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;stop();});
  canvas.addEventListener('webglcontextrestored',()=>{
   try{initGraphics();contextLost=false;restores++;lastMediaTime=-1;start();}catch{canvas.classList.remove('ready');}
  });
  video.addEventListener('playing',queueFrame);
  video.addEventListener('pause',()=>{cancelFrame();canvas.classList.remove('ready');armWatchdog();});
  video.addEventListener('error',()=>{canvas.classList.remove('ready');armWatchdog();});
  try{initGraphics();}catch{return;}
  wrap.append(video,canvas);
  films.set(layer.id,{video,canvas,start,stop,needsResume:()=>needsGesture||video.paused,getPaintedFrames:()=>paintedFrames,getRecovery:()=>({contextLost,restores,reloads,needsGesture})});
  document.getElementById('bootPlay')?.addEventListener('click',start,{once:true});
  start();
 }
 function apply(project,asset=resolveAsset){
  if(!project.layers.some(l=>l.asset==='legend-v10/background.webp'))return;
  current=project;resolveAsset=asset;scene=document.querySelector('.legend-scene');if(!scene)return;
  scene.dataset.uiVersion='unified-v10';
  scene.dataset.layoutVersion=project.layers.some(l=>l.id==='betpanel'&&l.asset==='legend-v12/bet-frame.webp')?'12':'10';
  const ids=new Set(project.layers.map(l=>l.id));
  for(const wrap of scene.querySelectorAll('.published-layer'))if(!ids.has(wrap.dataset.layer)){wrap.hidden=true;set(wrap,'display','none');}
  for(const l of project.layers){
   let wrap=scene.querySelector(`[data-layer="${l.id}"]`);
   if(!wrap){wrap=document.createElement('div');wrap.className='published-layer legend-art';wrap.dataset.layer=l.id;scene.append(wrap);if(l.asset){const img=document.createElement('img');img.alt=l.name;img.draggable=false;wrap.append(img);}else wrap.textContent=l.text||'';}
   wrap.hidden=false;
   for(const [k,v] of Object.entries({position:'absolute',display:l.visible===false?'none':'flex',left:unit(l.x),top:unit(l.y),right:'auto',bottom:'auto',width:unit(l.w),height:unit(l.id==='reels'?l.w*5/6:l.h),'min-width':'0','min-height':'0','max-width':'none','max-height':'none',margin:'0',padding:'0','z-index':String(l.z),opacity:String(l.opacity/100),transform:`rotate(${l.rotate||0}deg)`,overflow:l.id==='reels'?'hidden':'visible'}))set(wrap,k,v);
   wrap.dataset.parallaxX=l.parallax?.x||0;wrap.dataset.parallaxY=l.parallax?.y||0;
   const img=wrap.querySelector(':scope > img');
   if(img&&l.asset){if(img.getAttribute('src')!==asset(l.asset))img.src=asset(l.asset);const panel=scene.dataset.layoutVersion==='12'&&['creditpanel','betpanel'].includes(l.id);set(img,'width',panel?'var(--panel-w)':'100%');set(img,'height',panel?'var(--panel-h)':'100%');set(img,'object-fit',l.id==='sky'?'cover':scene.dataset.layoutVersion==='12'&&['winbanner','creditpanel','betpanel','lavaground'].includes(l.id)?'fill':'contain');}
   const control=wrap.querySelector('button');
   if(['minusbtn','plusbtn'].includes(l.id)&&!l.asset){wrap.classList.remove('legend-master-control');wrap.querySelector('.legend-master-control-image')?.remove();}
   if(control&&['buybtn','antebtn'].includes(l.id))control.style.setProperty('--legend-panel',`url(${JSON.stringify(asset(l.asset))})`);
   if(l.id==='reelframe'&&scene.dataset.layoutVersion==='12'){
    const grid=project.layers.find(x=>x.id==='reels');
    wrap.style.setProperty('--reel-border-image',`url(${JSON.stringify(asset(l.asset))})`);
    wrap.style.setProperty('--reel-border-width',[grid.y-l.y,l.x+l.w-grid.x-grid.w,l.y+l.h-grid.y-grid.w*5/6,grid.x-l.x].map(n=>unit(Math.max(0,n))).join(' '));
   }
   if(l.id==='spinbutton'){const spin=wrap.querySelector('.spin-frame');if(spin)spin.src=asset(l.asset);}
   if(wrap.classList.contains('legend-copy'))wrap.textContent=l.text||'';
   movie(wrap,l);
  }
  window.dispatchEvent(new Event('legend-v10-ready'));
 }
 window.LegendBallApplyLayout=(p,a)=>{base(p,a);apply(p,a);};
 function move(){
  if(!scene)return;
  if(reduced()||window.SkygateEditorPreview){targetX=0;targetY=0;}
  tiltX+=(targetX-tiltX)*.09;tiltY+=(targetY-tiltY)*.09;
  const scale=scene.clientWidth/1080;
  for(const el of scene.querySelectorAll('[data-parallax-x]')){el.style.translate=`${tiltX*Number(el.dataset.parallaxX)*scale}px ${tiltY*Number(el.dataset.parallaxY)*scale}px`;}
  frame=requestAnimationFrame(move);
 }
 window.addEventListener('legend-v10-ready',()=>{if(!frame)move();});
 window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){targetX=(e.clientX/innerWidth-.5)*2;targetY=(e.clientY/innerHeight-.5)*2;}});
 const orientation=e=>{if(e.gamma==null||e.beta==null)return;targetX=Math.max(-1,Math.min(1,e.gamma/20));targetY=Math.max(-1,Math.min(1,(e.beta-45)/20));};
 async function enableTilt(){try{if(typeof DeviceOrientationEvent==='undefined')return false;if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')return false;window.addEventListener('deviceorientation',orientation);return true;}catch{return false;}}
 document.getElementById('bootPlay')?.addEventListener('click',enableTilt,{once:true});
 const refreshMotion=()=>{for(const {start,stop} of films.values()){if(pageSuspended||reduced())stop();else start();}};
 const suspendMotion=()=>{pageSuspended=true;refreshMotion();};
 const resumeMotion=()=>{if(document.hidden)return;pageSuspended=false;refreshMotion();};
 document.addEventListener('visibilitychange',()=>document.hidden?suspendMotion():resumeMotion());
 window.addEventListener('pagehide',suspendMotion);
 window.addEventListener('pageshow',resumeMotion);
 window.addEventListener('focus',resumeMotion);
 document.addEventListener('freeze',suspendMotion);
 document.addEventListener('resume',resumeMotion);
 // If Safari requires a new gesture, recover on the next normal interaction.
 const gestureResume=()=>{if(!pageSuspended&&!reduced())for(const film of films.values())if(film.needsResume())film.start();};
 document.addEventListener('pointerdown',gestureResume,{passive:true});
 document.addEventListener('keydown',gestureResume);
 motionPreference.addEventListener('change',refreshMotion);
 document.getElementById('batterySetting')?.addEventListener('change',refreshMotion);
 window.LegendV10={apply,enableTilt,getProject:()=>structuredClone(current),getMotionState:()=>[...films].map(([id,{video,canvas,getPaintedFrames,getRecovery}])=>({id,...getRecovery(),paintedFrames:getPaintedFrames(),ready:canvas.classList.contains('ready'),connected:canvas.isConnected,readyState:video.readyState,networkState:video.networkState,src:video.currentSrc,time:video.currentTime,duration:video.duration,paused:video.paused,seeking:video.seeking,ended:video.ended,rate:video.playbackRate,bufferedEnd:video.buffered.length?video.buffered.end(video.buffered.length-1):0,loop:video.loop,error:video.error?.code||null,errorMessage:video.error?.message||null}))};
})();
