
import JobQueue from "./lib/JobQueue.js";

export default JobQueue;

const mySleep=(time)=>new Promise((resolve)=>setTimeout(resolve,time*1000));
const jobQueue=new JobQueue();


const addJob=(id,time)=>{
  const job=jobQueue.makeJob(async ()=>{
    console.log("before id:"+id);
    await mySleep(time);
    console.log("after id:"+id);
  });
  jobQueue.queue.push(job);
}
async function main(){
  for(let i=0;i<20;++i){
    addJob(i,1);
  }
  const promises=jobQueue.queue.map((job)=>job.promise);
  console.log("begin wait");
  await Promise.all(promises);
  console.log("end wait");

  jobQueue.destroy();
  
}

main();




