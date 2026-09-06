export const SNAPSHOT_KEY = "ensuku-notebook-snapshot-v1";
const notebookKeys = ["overrides", "metadata", "lessons", "cards", "resources"];
const catalogKeys = ["theories", "items", "orders"];
export const validSnapshot = (value) =>
  Boolean(
    value &&
    notebookKeys.every((k) => Array.isArray(value.notebook?.[k])) &&
    catalogKeys.every((k) => Array.isArray(value.catalog?.[k])),
  );

// A lesson list and its checks/order must become visible as one complete snapshot.
export function readContentSnapshot(storage) {
  try {
    const current = JSON.parse(storage.getItem(SNAPSHOT_KEY) ?? "null");
    if (validSnapshot(current)) return current;
  } catch {}
  try {
    const legacy = {
      notebook: JSON.parse(
        storage.getItem("ensuku-notebook-content-v1") ?? "null",
      ),
      catalog: JSON.parse(storage.getItem("ensuku-catalog-v1") ?? "null"),
    };
    return validSnapshot(legacy) ? legacy : null;
  } catch {
    return null;
  }
}

export function saveContentSnapshot(storage, snapshot) {
  if (!validSnapshot(snapshot)) return false;
  try {
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export async function loadContentSnapshot(request, timeoutMs = 15000) {
  let timer;
  try {
    const [notebook, catalog] = await Promise.race([
      Promise.all([request("/api/notebook"), request("/api/catalog")]),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("教材の読み込みがタイムアウトしました。")),
          timeoutMs,
        );
      }),
    ]);
    const snapshot = { notebook, catalog };
    if (!validSnapshot(snapshot))
      throw new Error("教材データを確認できませんでした。");
    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}
