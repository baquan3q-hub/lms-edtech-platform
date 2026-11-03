import { z } from "zod";

export const localDraftSchema = z.object({
  owner: z.string(), attemptId: z.string(), baseVersion: z.number().int().min(0),
  answers: z.array(z.json()).max(200), savedAt: z.number().finite(),
  requestKey: z.uuid().optional(),
});
export type LocalDraft = z.infer<typeof localDraftSchema>;
const DATABASE = "lms-private-drafts-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("DRAFT_STORE_BLOCKED"));
  });
}

async function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("drafts", mode);
      const request = work(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("DRAFT_SAVE_FAILED"));
    });
  } finally { db.close(); }
}

const key = (owner: string, attemptId: string) => `${owner}:${attemptId}`;
export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  const checked = localDraftSchema.parse(draft);
  await transact("readwrite", store => store.put(checked, key(checked.owner, checked.attemptId)));
}
export async function readLocalDraft(owner: string, attemptId: string): Promise<LocalDraft | null> {
  const raw = await transact("readonly", store => store.get(key(owner, attemptId)));
  const result = localDraftSchema.safeParse(raw);
  if (!result.success || result.data.owner !== owner || result.data.attemptId !== attemptId ||
      result.data.savedAt < Date.now() - MAX_AGE_MS || result.data.savedAt > Date.now() + 60000) {
    if (raw) await deleteLocalDraft(owner, attemptId);
    return null;
  }
  return result.data;
}
export async function deleteLocalDraft(owner: string, attemptId: string) {
  await transact("readwrite", store => store.delete(key(owner, attemptId)));
}
export async function clearLocalDrafts() {
  if (typeof indexedDB !== "undefined") await transact("readwrite", store => store.clear());
}
