import Promise from 'bluebird';
import Deferred from './Deferred';

export default class JobQueue {
  constructor({ interval = 0.01, threadsSize = 10, paused = false } = {}) {
    this.interval = interval;
    this.threadsSize = threadsSize;
    this.queue = [];
    this.paused = true;
    this.timeoutId = null;
    if (!paused) {
      this.resume();
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      this.activateTimerIf();
    }
  }

  abortAll() {
    this.queue.forEach((job) => {
      job.abort(new Error('中断'));
    });
  }

  pause() {
    if (!this.paused) {
      this.paused = true;
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
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
    const promise = Promise.resolve(taskWrapperAsync());

    const job = {
      start: deferred.resolve,
      abort: deferred.reject,
      promise,
    };

    return job;
  }

  activateTimerIf() {
    const needsNextTick = () => this.queue.length > 0 && !this.paused && !this.timeoutId;
    const tick = async () => {
      this.timeoutId = null;
      if (!this.paused) {
        await this.onTickAsync();
      }
      if (needsNextTick()) {
        this.timeoutId = setTimeout(tick, 1000 * this.interval);
      }
    };
    if (needsNextTick()) {
      this.timeoutId = setTimeout(tick, 0);
    }
  }

  addJob(job) {
    this.queue.push(job);
    this.activateTimerIf();
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
