// Listar runtimes e SDKs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function show(d, depth=0){
  if(depth>2)return;
  try{
    for(const e of readdirSync(d,{withFileTypes:true})){
      const p=path.join(d,e.name);
      let extra='';
      if(e.isDirectory()){
        const rel=path.join(p,'release');
        if(existsSync(rel)){
          const r=readFileSync(rel,'utf8');
          const ver=r.match(/JAVA_VERSION="([^"]+)"/);
          const vend=r.match(/IMPLEMENTOR_VERSION="([^"]+)"/);
          const isJBR=r.match(/JBR="([^"]+)"/);
          extra=' [JAVA=' + (ver?ver[1]:'?') + ', ' + (vend?vend[1]:'?') + (isJBR?', JBR='+isJBR[1]:'') + ']';
        }
      }
      console.log('  '.repeat(depth) + (e.isDirectory()?'📁':'📄') + ' ' + e.name + extra);
      if(e.isDirectory()&&depth<2)show(p,depth+1);
    }
  }catch(e){console.log('  '.repeat(depth)+'ERRO: '+e.message)}
}

console.log('=== A:/AI/runtimes ===');
show('A:/AI/runtimes');
console.log('');
console.log('=== A:/AI/sdk ===');
show('A:/AI/sdk');
console.log('');
console.log('=== A:/AI/tools ===');
show('A:/AI/tools');
