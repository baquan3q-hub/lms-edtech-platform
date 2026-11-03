import "fake-indexeddb/auto";
import { beforeEach,describe,it,expect } from "vitest";
import { saveLocalDraft,readLocalDraft,clearLocalDrafts,deleteLocalDraft } from "@/lib/learning/draft-store";
beforeEach(async()=>{await clearLocalDrafts();});
describe("Private durable drafts",()=>{
  it("restores answers after a reload and keeps users, schools and attempts separate",async()=>{
    await saveLocalDraft({owner:"school-a:student-a",attemptId:"attempt-1",baseVersion:3,answers:[{textAnswer:"Bài giải chưa nộp"}],savedAt:Date.now()});
    expect((await readLocalDraft("school-a:student-a","attempt-1"))?.baseVersion).toBe(3);
    expect(await readLocalDraft("school-b:student-a","attempt-1")).toBeNull();
    expect(await readLocalDraft("school-a:student-b","attempt-1")).toBeNull();
    expect(await readLocalDraft("school-a:student-a","attempt-2")).toBeNull();
  });
  it("does not restore expired local drafts",async()=>{
    await saveLocalDraft({owner:"a",attemptId:"x",baseVersion:0,answers:[],savedAt:Date.now()-8*86400000});
    expect(await readLocalDraft("a","x")).toBeNull();
  });
  it("removes an acknowledged submission and clears all drafts on logout",async()=>{
    for(const owner of ["a","b"])await saveLocalDraft({owner,attemptId:"x",baseVersion:0,answers:[],savedAt:Date.now()});
    await deleteLocalDraft("a","x");expect(await readLocalDraft("a","x")).toBeNull();
    expect(await readLocalDraft("b","x")).not.toBeNull();
    await clearLocalDrafts();expect(await readLocalDraft("b","x")).toBeNull();
  });
});
