/* eslint-disable no-undef */
import JobQueue from '../src/JobQueue';

const { performance } = require('perf_hooks');

const mySleep = (time) => new Promise((resolve) => setTimeout(resolve, time * 1000));

describe('JobQueue', () => {
  test('normal job', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const beginTime = performance.now() / 1000;
    const job = jobQueue.addJobFromTask(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(progress).toBe('ready');
    await job.promise;
    expect(progress).toBe('done');
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(1, 1);
    jobQueue.destroy();
  });
  test('add job', () => {
    const jobQueue = new JobQueue();
    // stop execution
    jobQueue.destroy();
    const job = jobQueue.makeJob(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(jobQueue.queue.length).toBe(0);
    expect(jobQueue.addJob(job)).toBe(job);
    expect(jobQueue.queue.length).toBe(1);
    expect(jobQueue.queue[0]).toBe(job);
  });
  test('add job from task', () => {
    const jobQueue = new JobQueue();
    // stop execution
    jobQueue.destroy();
    expect(jobQueue.queue.length).toBe(0);
    const job = jobQueue.addJobFromTask(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(job).not.toBeNull();
    expect(jobQueue.queue.length).toBe(1);
    expect(jobQueue.queue[0]).toBe(job);
  });
  test('abortAll', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.addJobFromTask(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(jobQueue.needsStop).toBeFalsy();
    jobQueue.abortAll();
    expect(job.promise).rejects.toThrow();
    expect(jobQueue.needsStop).toBeFalsy();
    expect(progress).toBe('ready');
    jobQueue.destroy();
  });
  test('destroy', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.makeJob(async () => {
      await mySleep(1);
      progress = 'done';
    });
    jobQueue.queue.push(job);
    expect(jobQueue.needsStop).toBeFalsy();
    jobQueue.destroy();
    expect(job.promise).rejects.toThrow();
    expect(jobQueue.needsStop).toBeTruthy();
    expect(progress).toBe('ready');
  });
  test('makeJob start', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.makeJob(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(progress).toBe('ready');
    expect(job.promise.isPending()).toBe(true);
    job.start();
    await job.promise;
    expect(job.promise.isFulfilled()).toBe(true);
    expect(progress).toBe('done');
    jobQueue.destroy();
  });
  test('makeJob abort', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.makeJob(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(progress).toBe('ready');
    expect(job.promise.isPending()).toBe(true);
    job.abort();
    // 非同期に解決されるため
    await mySleep(0.1);
    expect(job.promise.isRejected()).toBe(true);
    expect(job.promise).rejects.toThrow();
    expect(progress).toBe('ready');
    jobQueue.destroy();
  });
  test('joinAsync', async () => {
    const jobQueue = new JobQueue();
    const beginTime = performance.now() / 1000;
    jobQueue.addJobFromTask(async () => {
      await mySleep(1);
    });
    await jobQueue.joinAsync();
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(1, 0);
    jobQueue.destroy();
  });
  test('threadsSize 1', async () => {
    const jobQueue = new JobQueue({ threadsSize: 1 });
    const beginTime = performance.now() / 1000;
    for (let i = 0; i < 4; i += 1) {
      jobQueue.addJobFromTask(async () => {
        await mySleep(0.5);
      });
    }
    await jobQueue.joinAsync();
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(2, 0);
    jobQueue.destroy();
  });
  test('threadsSize 2', async () => {
    const jobQueue = new JobQueue({ threadsSize: 2 });
    const beginTime = performance.now() / 1000;
    for (let i = 0; i < 4; i += 1) {
      jobQueue.addJobFromTask(async () => {
        await mySleep(0.5);
      });
    }
    await jobQueue.joinAsync();
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(1, 0);
    jobQueue.destroy();
  });
  test('threadsSize 2 overtake', async () => {
    const jobQueue = new JobQueue({ threadsSize: 2 });
    const beginTime = performance.now() / 1000;
    for (let i = 0; i < 4; i += 1) {
      jobQueue.addJobFromTask(async () => {
        if (i % 2 === 0) {
          await mySleep(1);
        } else {
          await mySleep(0);
        }
      });
    }
    await jobQueue.joinAsync();
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(1, 0);
    jobQueue.destroy();
  });
});
