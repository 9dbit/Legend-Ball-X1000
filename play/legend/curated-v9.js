/* LEGEND BALL X1000 | V9 source-of-truth renderer.
 * Every layer uses one 1080x1920 coordinate plane, scaled uniformly.
 * Art/UI only. Settlement, spin, free spins, and wallet untouched.
 */
(() => {
  'use strict';
  const original=window.LegendBallApplyLayout;
  if(typeof original!=='function')throw Error('Expected core Legend renderer');
  const EXPECTED='legend-v9/scene-sky.webp';
  const unit=n=>(n/1080*100)+'cqw';
  const set=(element,name,value)=>element.style.setProperty(name,value,'important');
  const apply=project=>{
    if(project.layers.find(l=>l.id==='sky')?.asset!==EXPECTED)return;
    const scene=document.querySelector('.legend-scene');
    if(!scene)return;
    scene.dataset.uiVersion='curated-v9';
    const map=new Map(project.layers.map(l=>[l.id,l]));
    for(const [id,l] of map){
      const wrap=scene.querySelector('.published-layer[data-layer="'+id+'"]');
      if(!wrap)continue;
      set(wrap,'position','absolute');
      set(wrap,'display',l.visible===false?'none':'flex');
      set(wrap,'left',unit(l.x));
      set(wrap,'top',unit(l.y));
      set(wrap,'right','auto');
      set(wrap,'bottom','auto');
      set(wrap,'width',unit(l.w));
      set(wrap,'height',unit(id==='reels' ? l.w*5/6:l.h));
      set(wrap,'min-width','0');
      set(wrap,'min-height','0');
      set(wrap,'max-width','none');
      set(wrap,'max-height','none');
      set(wrap,'margin','0');
      set(wrap,'padding','0');
      set(wrap,'z-index',String(l.z));
      set(wrap,'opacity',String(l.opacity/100));
      set(wrap,'transform','rotate('+(l.rotate||0)+'deg)');
      set(wrap,'overflow',id==='reels'?'hidden':'visible');
      const image=wrap.querySelector(':scope > img');
      if(image){
        set(image,'width','100%');set(image,'height','100%');
        set(image,'object-fit',id==='sky'?'cover':'contain');
      }
    }
    // Legacy animations must not hide Studio-authored character layers.
    for(const id of ['guardian','dragon','logo']){
      const wrap=scene.querySelector('.published-layer[data-layer="'+id+'"]');
      if(!wrap)continue;
      set(wrap,'visibility','visible');
      set(wrap,'opacity',String((map.get(id)?.opacity??100)/100));
      set(wrap,'filter','none');
    }
    const board=scene.querySelector('[data-layer="reels"]');
    if(board)set(board,'aspect-ratio','6/5');
    scene.dataset.authoringWidth='1080';
    scene.dataset.authoringHeight='1920';
    window.dispatchEvent(new Event('legend-v9-ready'));
  };
  window.LegendBallApplyLayout=(project,asset)=>{
    original(project,asset);
    apply(project);
  };
  window.LegendV9={apply};
})();