// Repository la lop duy nhat cham vao IndexedDB — Muc 22.1, 22.3.
// View khong goi IndexedDB truc tiep: view -> engine -> repository -> IndexedDB.
const DB_NAME = "ielts-rebuild";
const DB_VERSION = 1;

// Chuoi di tru: moi ham nang mot phien ban, co fixture test rieng khi co du lieu that.
// Khong bao gio xoa du lieu neu chua nhac sao luu.
const migrations = [
  function migrateTo1(db) {
    const cards = db.createObjectStore("cards", { keyPath: "id" });
    cards.createIndex("dueDay", "dueDay");
    cards.createIndex("state", "state");
    cards.createIndex("cardType", "cardType");
    cards.createIndex("unitId", "unitId");
    const reviews = db.createObjectStore("reviews", { keyPath: "id" });
    reviews.createIndex("cardId", "cardId");
    reviews.createIndex("reviewedAt", "reviewedAt");
    const errors = db.createObjectStore("errors", { keyPath: "id" });
    errors.createIndex("tag", "tag");
    errors.createIndex("skill", "skill");
    errors.createIndex("state", "state");
    errors.createIndex("createdAt", "createdAt");
    const attempts = db.createObjectStore("attempts", { keyPath: "id" });
    attempts.createIndex("testId", "testId");
    attempts.createIndex("skill", "skill");
    attempts.createIndex("createdAt", "createdAt");
    attempts.createIndex("mode", "mode");
    const lessons = db.createObjectStore("lessons", { keyPath: "id" });
    lessons.createIndex("unitId", "unitId");
    lessons.createIndex("skill", "skill");
    db.createObjectStore("lessonDrafts", { keyPath: "unitId" });
    const talk = db.createObjectStore("talkSessions", { keyPath: "id" });
    talk.createIndex("startedAt", "startedAt");
    talk.createIndex("mode", "mode");
    db.createObjectStore("progress", { keyPath: "key" });
    db.createObjectStore("settings", { keyPath: "key" });
    db.createObjectStore("meta", { keyPath: "key" });
  },
];

export function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (let v = e.oldVersion; v < DB_VERSION; v++) migrations[v](db);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const request = run(t.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createRepo(db) {
  return {
    get: (store, key) => tx(db, store, "readonly", (s) => s.get(key)),
    put: (store, value) => tx(db, store, "readwrite", (s) => s.put(value)),
    delete: (store, key) => tx(db, store, "readwrite", (s) => s.delete(key)),
    getAllByIndex: (store, index, query) =>
      tx(db, store, "readonly", (s) => s.index(index).getAll(query)),
  };
}
