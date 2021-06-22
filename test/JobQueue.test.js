/* eslint-disable no-undef */
import JobQueue from '../src/JobQueue';

const { performance } = require('perf_hooks');

const mySleep = (time) => new Promise((resolve) => setTimeout(resolve, time * 1000));

// UnhandledPromiseRejectionWarningを取り除く
// https://github.com/facebook/jest/issues/6028
function defuse(promise) {
  promise.catch(() => { });
  return promise;
}

describe('JobQueue', () => {
  test('normal job', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const beginTime = performance.now() / 1000;
    expect(jobQueue.timeoutId).toBeNull();
    const job = jobQueue.addJobFromTask(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(jobQueue.timeoutId).not.toBeNull();
    expect(progress).toBe('ready');
    await job.promise;
    expect(progress).toBe('done');
    const endTime = performance.now() / 1000;
    expect(endTime - beginTime).toBeCloseTo(1, 1);
    await mySleep(0.1);
    expect(jobQueue.timeoutId).toBeNull();
  });
  test('add job', async () => {
    const jobQueue = new JobQueue();
    // stop execution
    jobQueue.pause();
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
    jobQueue.pause();
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
    // console.error()が発生するのでmockに差し替える
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.addJobFromTask(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(jobQueue.paused).toBe(false);
    jobQueue.abortAll();
    expect(job.promise).rejects.toThrow();
    expect(jobQueue.paused).toBe(false);
    expect(progress).toBe('ready');
    expect(jobQueue.joinAsync()).rejects.toThrow();
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
  });
  test('makeJob abort', async () => {
    const jobQueue = new JobQueue();
    let progress = 'ready';
    const job = jobQueue.makeJob(async () => {
      await mySleep(1);
      progress = 'done';
    });
    expect(progress).toBe('ready');
    defuse(job.promise);
    expect(job.promise.isPending()).toBe(true);
    job.abort(new Error('some reason'));
    // 非同期に解決されるため
    await mySleep(0.1);
    expect(job.promise.isRejected()).toBe(true);
    expect(job.promise).rejects.toThrow();
    expect(progress).toBe('ready');
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
  });
  test('resume', async () => {
    const jobQueue = new JobQueue({ paused: true });
    expect(jobQueue.paused).toBe(true);
    let progress = 'ready';
    jobQueue.addJobFromTask(() => {
      progress = 'done';
    });
    await mySleep(0.1);
    expect(progress).toBe('ready');
    expect(jobQueue.timeoutId).toBeNull();
    jobQueue.resume();
    expect(jobQueue.timeoutId).not.toBeNull();
    expect(jobQueue.paused).toBe(false);
    await jobQueue.joinAsync();
    expect(progress).toBe('done');
  });
  test('pause', async () => {
    const jobQueue = new JobQueue();
    expect(jobQueue.paused).toBe(false);
    jobQueue.pause();
    expect(jobQueue.paused).toBe(true);
    let progress = 'ready';
    jobQueue.addJobFromTask(() => {
      progress = 'done';
    });
    await mySleep(0.1);
    expect(progress).toBe('ready');
    jobQueue.resume();
    expect(jobQueue.paused).toBe(false);
    await jobQueue.joinAsync();
    expect(progress).toBe('done');
  });
  test('activateTimerIf not paused', async () => {
    const jobQueue = new JobQueue({ paused: true });
    expect(jobQueue.paused).toBe(true);
    let progress = 'ready';
    jobQueue.addJobFromTask(() => {
      progress = 'done';
    });
    await mySleep(0.1);
    expect(progress).toBe('ready');
    jobQueue.paused = false;
    expect(jobQueue.timeoutId).toBeNull();
    jobQueue.activateTimerIf();
    expect(jobQueue.timeoutId).not.toBeNull();
    await mySleep(0.1);
    expect(progress).toBe('done');
    await jobQueue.joinAsync();
  });
  test('activateTimerIf paused', async () => {
    const jobQueue = new JobQueue({ paused: true });
    expect(jobQueue.paused).toBe(true);
    let progress = 'ready';
    jobQueue.addJobFromTask(() => {
      progress = 'done';
    });
    await mySleep(0.1);
    expect(progress).toBe('ready');
    expect(jobQueue.timeoutId).toBeNull();
    jobQueue.activateTimerIf();
    expect(jobQueue.timeoutId).toBeNull();
    await mySleep(0.1);
    expect(progress).toBe('ready');
    jobQueue.resume();
    await jobQueue.joinAsync();
    expect(progress).toBe('done');
  });
});
