import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
function filePath(key: string) {
  const root = path.resolve(process.env.DATA_DIR || "data", "uploads");
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Invalid attachment path");
  return resolved;
}
export async function putFile(key: string, data: ArrayBuffer) {
  const file = filePath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, new Uint8Array(data), { flag: "wx", mode: 0o600 });
}
export async function getFile(key: string): Promise<Uint8Array<ArrayBuffer> | null> {
  try { return new Uint8Array(await readFile(filePath(key))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
