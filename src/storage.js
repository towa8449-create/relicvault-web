// 純粋なブラウザ内ストレージ（IndexedDB）ラッパー。
// サーバーには一切送信されません。データは常にこの端末・このブラウザの中だけに残ります。
// Claude Artifact専用だった window.storage と同じ形（{key, value}を返す）に合わせてあるので、
// 呼び出し側のコード（RelicVault.jsx）はほぼ無改造で動きます。
// 「shared」引数は互換性のために受け取りますが、このアプリでは意味を持ちません（常に個人用）。

const DB_NAME = "relicvault-db";
const STORE_NAME = "kv";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("このブラウザはIndexedDBに対応していません"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDBを開けませんでした"));
  });
  return dbPromise;
}

export const storage = {
  async get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result === undefined) resolve(null);
        else resolve({ key, value: req.result });
      };
      req.onerror = () => reject(req.error || new Error("読み込みに失敗しました"));
    });
  },

  async set(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve({ key, value });
      req.onerror = () => reject(req.error || new Error("保存に失敗しました"));
    });
  },

  async delete(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve({ key, deleted: true });
      req.onerror = () => reject(req.error || new Error("削除に失敗しました"));
    });
  },

  async list(prefix = "") {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result.filter((k) => String(k).startsWith(prefix));
        resolve({ keys });
      };
      req.onerror = () => reject(req.error || new Error("一覧取得に失敗しました"));
    });
  },
};
