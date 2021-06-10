
import JobQueue from "./lib/JobQueue.js";

const mySleep=(time)=>new Promise((resolve)=>setTimeout(resolve,time*1000));
const jobQueue=new JobQueue();

{
  const task=jobQueue.makeJob(async ()=>{
    console.log("before");
    await mySleep(1);
    console.log("after");
  });
  jobQueue.queue.push(task);
}


setTimeout(()=>{
  jobQueue.destroy();

},1000*2);


