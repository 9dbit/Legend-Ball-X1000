import { shippedAssets } from '../release-store.mjs';

// Publish only shipped game art/audio, never Studio settings or uploaded assets.
import { mkdir, copyFile, access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const [file, archive] of [['scene/hero_composite_reference.jpg','media_assets.tar.gz'], ['audio/bgm_celestial_loop.mp3','audio_mp3.tar.gz']]) {
  try { await access(resolve(root,'studio/assets',file)); }
  catch { execFileSync('tar', ['--no-same-owner','-xzf',archive], {cwd:root}); }
}
const files = shippedAssets;
for (const file of files) {
  const target=resolve(root,'play/assets',file);
  await mkdir(dirname(target),{recursive:true});
  await copyFile(resolve(root,'studio/assets',file),target);
}
await copyFile(resolve(root,'studio/audio_engine.js'),resolve(root,'play/audio_engine.js'));
await copyFile(resolve(root,'studio/math/studio_math.js'),resolve(root,'play/studio_math.js'));
await mkdir(resolve(root,'play/icons'),{recursive:true});
for(const size of [48,180,192,512]){
 await copyFile(resolve(root,'studio/assets/legend-raster/icons/legend-touch-'+size+'.png'),resolve(root,'play/icons/legend-touch-'+size+'.png'));
 await copyFile(resolve(root,'play/icons/legend-touch-'+size+'.png'),resolve(root,'play/icons/legend-raster-v2-'+size+'.png'));
}
await copyFile(resolve(root,'studio/assets/legend-raster/icons/legend-touch-maskable-512.png'),resolve(root,'play/icons/legend-touch-maskable-512.png'));
await copyFile(resolve(root,'play/icons/legend-touch-maskable-512.png'),resolve(root,'play/icons/legend-raster-v2-maskable-512.png'));
for(const target of ['apple-touch-icon.png','studio/apple-touch-icon.png','play/apple-touch-icon.png'])await copyFile(resolve(root,'play/icons/legend-touch-180.png'),resolve(root,target));
const project=JSON.parse(await readFile(resolve(root,'studio/project.json'),'utf8'));
await writeFile(resolve(root,'play/legend/default-project.js'),'window.LEGEND_DEFAULT_PROJECT = '+JSON.stringify(project)+';\n');
await writeFile(resolve(root,'studio/project-data.js'),'window.SKY_PROJECT_DEFAULT = '+JSON.stringify(project)+';\n');
console.log(`Prepared ${files.length} original Skygate-source game assets plus Legend Ball PWA icons and mixer.`);
