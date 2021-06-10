import Deferred from "../src/Deferred.js";

describe("Deferred", () => {
  test("resolve", () => {
    const deferred = new Deferred();
    expect(deferred.promise.isPending()).toBe(true);
    deferred.resolve(123);
    expect(deferred.promise.isFulfilled()).toBe(true);
    expect(deferred.promise).resolves.toBe(123);

  });
  test("reject", () => {
    const deferred = new Deferred();
    const error = new Error("abc");
    expect(deferred.promise.isPending()).toBe(true);
    deferred.reject(error);
    expect(deferred.promise.isRejected()).toBe(true);
    expect(deferred.promise).rejects.toBe(error);
  });
});