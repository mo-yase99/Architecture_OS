import { NextResponse } from 'next/server';

const skillPriority=['3ds Max','Corona','V-Ray','Shop Drawing','Photoshop','Illustrator','Revit / BIM'];
const energyScore:Record<string,number>={Low:1,Medium:2,High:3};
export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}));
  const minutes=Number(body.minutes??120), energy=String(body.energy??'Medium');
  const tasks=Array.isArray(body.tasks)?body.tasks:[], skillLevels=body.skillLevels??{};
  const pending=tasks.filter((t:any)=>!['Done','Completed'].includes(t.status));
  const taskScore=(t:any)=>{const p=t.priority==='P0'?40:t.priority==='P1'?30:t.priority==='P2'?20:10;const tm=t.minutes?Math.max(0,20-Math.abs(minutes-t.minutes)/5):0;const en=t.energy?Math.max(0,10-Math.abs((energyScore[t.energy]??2)-(energyScore[energy]??2))*5):5;return p+tm+en};
  const task=pending.filter((t:any)=>(t.minutes??t.mins??30)<=minutes).sort((a:any,b:any)=>taskScore(b)-taskScore(a))[0];
  const skill=skillPriority.find(s=>Number(skillLevels[s]??0)<4)||'3ds Max';
  const recommendation=task?{...task,reason:'Highest-priority executable task within your available window.'}:{title:`Adaptive ${skill} practice`,skill,minutes:Math.min(minutes,60),priority:'P0',reason:`No suitable pending task fits this window. MYOS recommends closing the current ${skill} skill gap.`};
  return NextResponse.json({recommendation,score:task?taskScore(task):0,criteria:{minutes,energy,currentSkill:skill,pendingTasks:pending.length}});
 }catch{return NextResponse.json({error:'Invalid recommendation payload'},{status:400});}
}
