/* LEGEND BALL | Modular cutout scene renderer V7.
   Uses project JSON coordinates, not static CSS forcing position/size.
   Only the 6x5 reel geometry is intentionally constrained to square tiles.
   Presentation-only. RNG, credits and game math untouched. */
(() => {
 'use strict';
 const prior=window.LegendBallApplyLayout;
 if(typeof prior!=='function')throw Error('LegendBallApplyLayout must initialize before cutout-v7.js');
 const STAGE={w:1080,h:1920};
 const cssW=v=>(v/STAGE.w*100)+'cqw';
 const cssY=v=>(v/STAGE.h*100)+'%';
 const calc=(...parts)=>'calc('+parts.join(' + ')+')';
 const isV7=project=>project?.layers?.some(l=>l.id==='sky'&&l.asset==='legend-cutouts/scene-sky.webp');
 const PANEL_BASE={buybtn:1333,antebtn:1333,creditpanel:1463,betpanel:1463,
    credits:1470,betlabel:1470,minusbtn:1471,plusbtn:1471,spinbutton:1563,
    autobtn:1630,turbobtn:1630};
 const set=(node,key,value)=>node.style.setProperty(key,value,'important');
 const apply=(project)=>{
  if(!isV7(project))return;
  const scene=document.querySelector('.legend-scene');
  if(!scene)return;
  scene.dataset.uiVersion='cutout-v7';
  const layers=new Map(project.layers.map(l=>[l.id,l]));
  const element=id=>scene.querySelector('.published-layer[data-layer="'+id+'"]');
  const l=id=>layers.get(id);
  const reel=l('reels');
  if(!reel)return;
  const gridTop=cssY(reel.y);
  const gridHeight=cssW(reel.w*5/6);
  const boardBottom='('+gridTop+' + '+gridHeight+')';
  const featureTop='calc('+gridTop+' + '+gridHeight+' + 4cqw)';
  const featureHeight=cssW(l('buybtn')?.h||119);
  const walletTop='calc('+featureTop+' + '+featureHeight+' + 1cqw)';
  const slack='clamp(0px,calc(33% - 58.6667cqw),52px)';
  const spinTop='calc('+walletTop+' + 9.3cqw + '+slack+')';
  const topOffset=(id,baseline)=>cssY((l(id)?.y||baseline)-baseline);
  function position(id, top, opts={}){
   const item=l(id),node=element(id);if(!item||!node)return;
   if(item.visible===false){set(node,'display','none');return;}
   set(node,'display','flex');
   set(node,'left',(item.x/STAGE.w*100)+'%');
   set(node,'width',(item.w/STAGE.w*100)+'%');
   set(node,'top',top||cssY(item.y));
   set(node,'height',opts.height||cssW(item.h));
   set(node,'min-height','0');
   set(node,'overflow',opts.overflow||'visible');
   set(node,'z-index',String(item.z));
   node.querySelectorAll(':scope > img').forEach(img=>{set(img,'object-fit','contain');});
  }
  for(const id of ['sky','guardian','dragon','logo','winbanner','winamount','bonuscopy','provider','hint']){
   const item=l(id);if(!item)continue;
   position(id,cssY(item.y),{height:id==='sky'?'100%':cssW(item.h)});
  }
  position('reels',gridTop,{height:gridHeight,overflow:'hidden'});
  position('reelframe','calc('+gridTop+' - 2.6cqw + '+cssY(l('reelframe').y-481)+')',
            {height:cssW(l('reelframe').h)});
  for(const id of ['buybtn','antebtn']){
   position(id,calc(featureTop,' '+topOffset(id,PANEL_BASE[id])),{height:cssW(l(id).h)});
  }
  for(const id of ['creditpanel','betpanel','credits','betlabel','minusbtn','plusbtn']){
   const extra=id==='creditpanel'||id==='betpanel'?'0cqw':'0.4cqw';
   position(id,calc(walletTop,extra,topOffset(id,PANEL_BASE[id])),
     {height:['minusbtn','plusbtn'].includes(id)?cssW(l(id).w):cssW(l(id).h)});
  }
  position('spinbutton',calc(spinTop,topOffset('spinbutton',PANEL_BASE.spinbutton)),
    {height:cssW(l('spinbutton').w)});
  for(const id of ['autobtn','turbobtn']){
   const delta=(l('spinbutton').w-l(id).w)/2;
   position(id,calc(spinTop,cssW(delta),topOffset(id,PANEL_BASE[id])),
     {height:cssW(l(id).w)});
  }
  for(const id of ['menubtn','infobtn','soundbtn'])if(l(id))
    position(id,cssY(l(id).y),{height:cssW(l(id).w)});
  // Any asset inserted later through the Universal Studio Asset Library must
  // also respect independent source coordinates, size and aspect ratio.
  const known=new Set(['sky','guardian','dragon','logo','winbanner','winamount','bonuscopy',
   'provider','hint','reels','reelframe','buybtn','antebtn','creditpanel','betpanel',
   'credits','betlabel','minusbtn','plusbtn','spinbutton','autobtn','turbobtn',
   'menubtn','infobtn','soundbtn']);
  for(const layer of project.layers){
   if(known.has(layer.id)||!['image','circle'].includes(layer.kind))continue;
   position(layer.id,cssY(layer.y),{height:cssW(layer.h)});
  }
  // Images are independent from old approval composites. Every hit target
  // remains the original live DOM button with no SVG face.
  scene.querySelectorAll('.legend-master-control-image').forEach(img=>img.draggable=false);
  const bonus=document.getElementById('anteFeature');
  if(bonus)bonus.dataset.rasterPanel='true';
 };
 window.LegendBallApplyLayout=(project,asset)=>{
  prior(project,asset);
  apply(project);
 };
 window.LegendBallModularCutouts={apply,isV7};
})();