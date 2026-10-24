import { db } from './lib/db.js';
import { runOnce } from './workers/run-once.js';
const oneShot=process.argv.includes('--once');
let stopping=false;
for (const signal of ['SIGTERM','SIGINT']) process.once(signal,()=>{stopping=true;});
async function main(){
  do {
    try { const result=await runOnce(); if(oneShot)console.log('Worker result:',JSON.stringify(result)); }
    catch(error){console.error('Worker iteration failed:',error);if(oneShot)process.exitCode=1;}
    if(oneShot || stopping)break;
    await new Promise(resolve=>setTimeout(resolve,4000));
  }while(!stopping);
  await db.$disconnect();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
