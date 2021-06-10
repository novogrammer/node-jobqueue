
import JobQueue from "../src/lib/JobQueue.js";
const performance = require('perf_hooks').performance;

const mySleep=(time)=>new Promise((resolve)=>setTimeout(resolve,time*1000));

describe("JobQueue",()=>{
  test("normal job",async ()=>{
    const jobQueue=new JobQueue();
    let progress="ready";
    const beginTime=performance.now()/1000;
    const job=jobQueue.makeJob(async ()=>{
      await mySleep(1);
      progress="done";
    });
    jobQueue.queue.push(job);
    expect(progress).toBe("ready");
    await job.promise;
    expect(progress).toBe("done");
    const endTime=performance.now()/1000;
    expect(endTime-beginTime).toBeCloseTo(1,1);
    jobQueue.destroy();
  });
  test("abortAll",async ()=>{
    const jobQueue=new JobQueue();
    let progress="ready";
    const job=jobQueue.makeJob(async ()=>{
      await mySleep(1);
      progress="done";
    });
    jobQueue.queue.push(job);
    expect(jobQueue.needsStop).toBeFalsy();
    jobQueue.abortAll();
    expect(job.promise).rejects.toThrow();
    expect(jobQueue.needsStop).toBeFalsy();
    expect(progress).toBe("ready");
    jobQueue.destroy();

  });
  test("destroy",async ()=>{
    const jobQueue=new JobQueue();
    let progress="ready";
    const job=jobQueue.makeJob(async ()=>{
      await mySleep(1);
      progress="done";
    });
    jobQueue.queue.push(job);
    expect(jobQueue.needsStop).toBeFalsy();
    jobQueue.destroy();
    expect(job.promise).rejects.toThrow();
    expect(jobQueue.needsStop).toBeTruthy();
    expect(progress).toBe("ready");

  });
  test("makeJob start",async ()=>{
    const jobQueue=new JobQueue();
    let progress="ready";
    const job=jobQueue.makeJob(async ()=>{
      await mySleep(1);
      progress="done";
    });
    expect(progress).toBe("ready");
    expect(job.promise.isPending()).toBe(true);
    job.start();
    await job.promise;
    expect(job.promise.isFulfilled()).toBe(true);
    expect(progress).toBe("done");
    jobQueue.destroy();
  });
  test("makeJob abort",async ()=>{
    const jobQueue=new JobQueue();
    let progress="ready";
    const job=jobQueue.makeJob(async ()=>{
      await mySleep(1);
      progress="done";
    });
    expect(progress).toBe("ready");
    expect(job.promise.isPending()).toBe(true);
    job.abort();
    //非同期に解決されるため
    await mySleep(0.1);
    expect(job.promise.isRejected()).toBe(true);
    expect(job.promise).rejects.toThrow();
    expect(progress).toBe("ready");
    jobQueue.destroy();
  });

  test("threadsSize 1",async ()=>{
    const jobQueue=new JobQueue({threadsSize:1});
    const beginTime=performance.now()/1000;
    for(let i=0;i<4;++i){
      const job=jobQueue.makeJob(async ()=>{
        await mySleep(0.5);
      });
      jobQueue.queue.push(job);
    }
    const promises=jobQueue.queue.map((job)=>job.promise);
    await Promise.all(promises);
    const endTime=performance.now()/1000;
    expect(endTime-beginTime).toBeCloseTo(2,0);
    jobQueue.destroy();
  });
  test("threadsSize 2",async ()=>{
    const jobQueue=new JobQueue({threadsSize:2});
    const beginTime=performance.now()/1000;
    for(let i=0;i<4;++i){
      const job=jobQueue.makeJob(async ()=>{
        await mySleep(0.5);
      });
      jobQueue.queue.push(job);
    }
    const promises=jobQueue.queue.map((job)=>job.promise);
    await Promise.all(promises);
    const endTime=performance.now()/1000;
    expect(endTime-beginTime).toBeCloseTo(1,0);
    jobQueue.destroy();
  });
  test("threadsSize 2 overtake",async ()=>{
    const jobQueue=new JobQueue({threadsSize:2});
    const beginTime=performance.now()/1000;
    for(let i=0;i<4;++i){
      const job=jobQueue.makeJob(async ()=>{
        if(i%2==0){
          await mySleep(1);
        }else{
          await mySleep(0);
        }
      });
      jobQueue.queue.push(job);
    }
    const promises=jobQueue.queue.map((job)=>job.promise);
    await Promise.all(promises);
    const endTime=performance.now()/1000;
    expect(endTime-beginTime).toBeCloseTo(1,0);
    jobQueue.destroy();
  });

});