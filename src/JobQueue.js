import Promise from 'bluebird';
import Deferred from './Deferred';

const JOB_INTERVAL = 0.01;
const JOB_THREADS_SIZE = 10;

export default class JobQueue {
  constructor({ interval = JOB_INTERVAL, threadsSize = JOB_THREADS_SIZE } = {}) {
    this.interval = interval;
    this.threadsSize = threadsSize;
    this.queue = [];
    this.needsStop = false;
    this.setup();
  }

  setup() {
    const tick = async () => {
      if (!this.needsStop) {
        await this.onTickAsync();
      }
      if (!this.needsStop) {
        this.timeoutId = setTimeout(tick, 1000 * this.interval);
      }
    };
    tick();
  }

  abortAll() {
    this.queue.forEach((job) => {
      job.abort(new Error('中断'));
    });
  }

  destroy() {
    this.needsStop = true;
    this.abortAll();
  }

  async onTickAsync() {
    if (this.queue.length > 0) {
      const threadsSize = Math.min(this.threadsSize, this.queue.length);
      // 非同期関数を先にスタートさせることで並列化する
      for (let i = 0; i < threadsSize; i += 1) {
        const job = this.queue[i];
        job.start();
      }
      let i = this.queue.length;
      // eslint-disable-next-line no-plusplus
      while (i--) {
        const job = this.queue[i];
        // bluebirdのisPendingを使ってovertake可能にする
        if (!job.promise.isPending()) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await job.promise;
          } catch (error) {
            console.error(error.toString());
          }
          this.queue.splice(i, 1);
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  makeJob(taskAsync) {
    const deferred = new Deferred();

    const taskWrapperAsync = async () => {
      await deferred.promise;
      const result = await taskAsync();
      return result;
    };
    // bluebirdのPromiseを使う
    const promise = Promise.all([taskWrapperAsync()]);

    const job = {
      start: deferred.resolve,
      abort: deferred.reject,
      promise,
    };

    return job;
  }

  addJob(job) {
    this.queue.push(job);
    return job;
  }

  addJobFromTask(taskAsync) {
    const job = this.makeJob(taskAsync);
    return this.addJob(job);
  }

  joinAsync() {
    const promises = this.queue.map((job) => job.promise);
    return Promise.all(promises);
  }
}
