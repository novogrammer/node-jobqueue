import Deferred from "./Deferred.js";
import Promise from "bluebird";

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
    for (let job of this.queue) {
      job.abort(new Error("中断"));
    }
  }
  destroy() {
    this.needsStop = true;
    this.abortAll();
  }
  async onTickAsync() {
    if (0 < this.queue.length) {
      const threadsSize = Math.min(this.threadsSize, this.queue.length);
      //非同期関数を先にスタートさせることで並列化する
      for (let i = 0; i < threadsSize; ++i) {
        const job = this.queue[i];
        job.start();

      }
      let i = this.queue.length;
      while (i--) {
        const job = this.queue[i];
        //bluebirdのisPendingを使ってovertake可能にする
        if (!job.promise.isPending()) {
          try {
            await job.promise;
          } catch (error) {
            console.error(error.toString());
          }
          this.queue.splice(i, 1);
        }
      }
    }
  }
  makeJob(taskAsync) {
    const deferred = new Deferred();

    const taskWrapperAsync = async () => {
      await deferred.promise;
      return await taskAsync();
    }
    //bluebirdのPromiseを使う
    const promise = Promise.all([taskWrapperAsync()]);

    const job = {
      start: deferred.resolve,
      abort: deferred.reject,
      promise,
    }

    return job;
  }

}
