import Deferred from "../src/lib/Deferred.js";

describe("Deferred",()=>{
  test("resolve",()=>{
    const deferred=new Deferred();
    deferred.resolve(123);
    expect(deferred.promise).resolves.toBe(123);

  });
  test("reject",()=>{
    const deferred=new Deferred();
    const error=new Error("abc");
    deferred.reject(error);
    expect(deferred.promise).rejects.toBe(error);
  });
});