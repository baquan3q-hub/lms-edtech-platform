import { beforeEach, vi } from "vitest";
vi.mock("@google/genai", async () => {
  const { aiFixture } = await import("./mocks/ai-provider");
  return {GoogleGenAI:class {models={generateContent:vi.fn(async ({contents}:{contents:string})=>aiFixture(contents))};}};
});
vi.mock("next/cache",()=>({revalidatePath:vi.fn(),revalidateTag:vi.fn()}));
beforeEach(()=>{
  vi.stubEnv("GEMINI_API_KEY","unit-test-only");
  vi.stubGlobal("fetch",vi.fn(()=>Promise.reject(new Error("Network is disabled in Vitest; mock the provider or use the dedicated E2E environment."))));
});
