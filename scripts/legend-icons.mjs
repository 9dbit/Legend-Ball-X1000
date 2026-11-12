/* Pure Node PNG icon generator for the original Legend Ball identity.
 * Generates deterministic square raster icons; no dependencies or external fonts.
 * Run from scripts/prepare-play.mjs. Never alters game math. */
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const LUT=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;LUT[n]=c>>>0;}
function crc32(buf){let c=0xffffffff;for(const n of buf)c=LUT[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,bytes){const kind=Buffer.from(type,'ascii'),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([kind,bytes])));return Buffer.concat([len,kind,bytes,crc]);}
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a*(1-t)+b*t;
const smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v);};
function render(size,maskable=false){
  const pixel=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;
    const radius=Math.hypot(u,v);
    const angle=Math.atan2(v,u);
    const back=clamp((u+v+2)/4);
    const bg=[mix(8,27,back),mix(12,33,back),mix(32,66,back)];
    const glow=Math.exp(-Math.pow((radius-.58)/.29,2))*.15;
    const rline=Math.abs(radius-(maskable?.55:.67));
    const ring=1-smooth(.022,.095,rline);
    const diagonalA=1-smooth(.045,.125,Math.abs(v-u*.84));
    const diagonalB=1-smooth(.045,.125,Math.abs(v+u*.84));
    const within=smooth(.63,.47,Math.max(Math.abs(u),Math.abs(v)));
    const xGlyph=Math.max(diagonalA,diagonalB)*within;
    let core=xGlyph*.95+ring*.58+glow;
    const sparks=[-2.61,-1.56,-.52,.54,1.59,2.63].reduce((acc,a)=>{
      const dx=u-Math.cos(a)*.68,dy=v-Math.sin(a)*.68;
      return Math.max(acc,1-smooth(.022,.07,Math.hypot(dx,dy)));
    },0);
    let t=clamp(core);
    const copper=[246,190,119],cyan=[100,238,244];
    let highlight=clamp((v+u)*.5+.5);
    const col=highlight<.5?copper:cyan;
    const rgb=bg.map((n,i)=>clamp((n + (col[i]-n)*t + (255-n)*sparks*.8)/255)*255);
    const off=(y*size+x)*4;for(let i=0;i<3;i++)pixel[off+i]=Math.round(rgb[i]);pixel[off+3]=255;
  }
  const raw=Buffer.alloc(size*(1+4*size));for(let row=0;row<size;row++){const dst=row*(1+4*size);raw[dst]=0;pixel.copy(raw,dst+1,row*size*4,(row+1)*size*4);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([PNG,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
export async function generateLegendIcons(root){
  const play=resolve(root,'play'),icons=resolve(play,'icons');await mkdir(icons,{recursive:true});
  for(const size of [48,180,192,512]){
    const bytes=render(size);await writeFile(resolve(icons,'legend-touch-'+size+'.png'),bytes);
    if(size===180)await writeFile(resolve(play,'apple-touch-icon.png'),bytes);
  }
  await writeFile(resolve(icons,'legend-touch-maskable-512.png'),render(512,true));
}
