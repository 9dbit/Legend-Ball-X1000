/* Geometry groups for the native Studio's 1080 x 1920 layout. */
(() => {
 'use strict';
 const children=new Set(['minusbtn','plusbtn','betlabel']);
 window.LegendLayoutGroups={patch(project,id,changes){
  const layer=project.layers.find(l=>l.id===id);if(!layer)return [];
  const before={...layer},after={...layer,...changes},affected=[layer];
  if(after.w<=0||after.h<=0)return [];
  if(id==='betpanel'&&layer.asset==='legend-v12/bet-frame.webp'){
   for(const child of project.layers.filter(l=>children.has(l.id))){
    const sx=after.w/before.w,sy=after.h/before.h;
    Object.assign(child,{x:after.x+(child.x-before.x)*sx,y:after.y+(child.y-before.y)*sy,w:child.w*sx,h:child.h*sy});
    affected.push(child);
   }
  }
  Object.assign(layer,changes);return affected;
 }};
})();
