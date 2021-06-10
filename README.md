# node-jobqueue

## install

`npm install novogrammer/node-jobqueue`

## example
```
const JobQueue = require("node-jobqueue");

async function main(){
  const jobQueue=new JobQueue();
  const mySleep = (time) => new Promise((resolve)=>setTimeout(resolve,time*1000));
  console.log("begin");
  for(let i=0;i<10;++i){
    jobQueue.addJobFromTask(async () => {
      await mySleep(1);
    });
  }
  await jobQueue.joinAsync();
  console.log("end");
  jobQueue.destroy();
}

main();
```

## new JobQueue(options)
```
constructor({ interval = 0.01, threadsSize = 10, paused = false } = {})
```

