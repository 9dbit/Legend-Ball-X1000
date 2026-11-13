/* One presentation contract for the game and Universal Game Studio. */
(() => {
 'use strict';
 const base=window.LegendBallApplyLayout, unit=n=>`${n/10.8}cqw`;
 const set=(el,key,value)=>el.style.setProperty(key,value,'important');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden||!!document.getElementById('batterySetting')?.checked;
 let current,resolveAsset,scene,frame=0,tiltX=0,tiltY=0,targetX=0,targetY=0;
 const films=new Map();
 function movie(wrap,layer){
  if(!layer.motion||films.has(layer.id)||window.SkygateEditorPreview)return;
  const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.src=resolveAsset(layer.motion.src);
  const canvas=document.createElement('canvas');canvas.className='legend-motion';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl)return;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Movie compositor unavailable');return s;};
  try{
   const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*.5,(1.0-p.y)*.5);gl_Position=vec4(p,0.,1.);}'));
   // Black matte only. A retained transparent poster protects deep hair tones.
   gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D movie;varying vec2 uv;void main(){vec3 c=texture2D(movie,uv).rgb;float m=max(max(c.r,c.g),c.b);float a=smoothstep(.015,.07,m);gl_FragColor=vec4(c,a);}'));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   let alive=true,callback=0;
   const paint=()=>{if(!alive)return;if(!reduced()&&video.readyState>=2&&!video.paused){
    if(canvas.width!==video.videoWidth){canvas.width=video.videoWidth;canvas.height=video.videoHeight;gl.viewport(0,0,canvas.width,canvas.height);}
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);canvas.classList.add('ready');
   }callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(paint):requestAnimationFrame(paint);};
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;video.pause();canvas.remove();});
   video.addEventListener('error',()=>{alive=false;canvas.remove();});
   wrap.append(canvas);films.set(layer.id,{video,canvas});
   const start=()=>{if(reduced())return;video.play().then(()=>{if(!callback)paint();}).catch(()=>{});};
   document.getElementById('bootPlay')?.addEventListener('click',start,{once:true});
   if(document.documentElement.dataset.boot==='entered')start();
  }catch{canvas.remove();}
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
   if(img&&l.asset){if(img.getAttribute('src')!==asset(l.asset))img.src=asset(l.asset);set(img,'width','100%');set(img,'height','100%');set(img,'object-fit',l.id==='sky'?'cover':scene.dataset.layoutVersion==='12'&&['winbanner','creditpanel','betpanel','lavaground'].includes(l.id)?'fill':'contain');}
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
 const refreshMotion=()=>{for(const {video,canvas} of films.values()){if(reduced()){video.pause();canvas.classList.remove('ready');}else video.play().catch(()=>{});}};
 document.addEventListener('visibilitychange',refreshMotion);
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',refreshMotion);
 document.getElementById('batterySetting')?.addEventListener('change',refreshMotion);
 window.LegendV10={apply,enableTilt,getProject:()=>structuredClone(current),getMotionState:()=>[...films].map(([id,{video,canvas}])=>({id,ready:canvas.classList.contains('ready'),time:video.currentTime,duration:video.duration,paused:video.paused,loop:video.loop,error:video.error?.code||null}))};
})();
