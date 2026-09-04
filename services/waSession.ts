import { Redis } from "@upstash/redis";

// ─── Redis key prefix untuk WA session ───────────────────────
const KEY_PREFIX = "wa_session:";

function redisKey(file: string): string {
  return `${KEY_PREFIX}${file}`;
}

// ─── Lazy Redis client ────────────────────────────────────────
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN wajib diisi untuk Redis session"
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ─── Cek apakah Upstash dikonfigurasi ────────────────────────
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// ─── Hapus semua key session (untuk reset) ────────────────────
export async function clearRedisSession(): Promise<void> {
  const redis = getRedis();
  // Scan semua key dengan prefix wa_session:
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `${KEY_PREFIX}*`,
      count: 100,
    });
    cursor = Number(nextCursor);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
}

// ─── useRedisAuthState — pengganti useMultiFileAuthState ──────
// Menyimpan setiap credentials file sebagai key di Redis.
// Baileys memanggil readFile/writeFile/removeFile per-file,
// di sini kita map ke Redis get/set/del.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function useRedisAuthState(baileys: any) {
  const redis = getRedis();

  const { initAuthCreds, BufferJSON, proto } = baileys;

  // ─── Helper baca/tulis JSON ke Redis ─────────────────────
  async function readData(file: string): Promise<unknown | null> {
    const data = await redis.get<string>(redisKey(file));
    if (data === null || data === undefined) return null;
    // Upstash otomatis parse JSON, tapi kita perlu BufferJSON untuk Baileys
    const raw = typeof data === "string" ? data : JSON.stringify(data);
    return JSON.parse(raw, BufferJSON.reviver);
  }

  async function writeData(file: string, data: unknown): Promise<void> {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    await redis.set(redisKey(file), serialized);
  }

  async function removeData(file: string): Promise<void> {
    await redis.del(redisKey(file));
  }

  // ─── Load atau init creds ─────────────────────────────────
  const creds = (await readData("creds")) ?? initAuthCreds();

  return {
    state: {
      creds,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keys: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: async (type: string, ids: string[]): Promise<Record<string, any>> => {
          const data: Record<string, unknown> = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: async (data: Record<string, Record<string, any>>): Promise<void> => {
          const tasks: Promise<void>[] = [];
          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries ?? {})) {
              tasks.push(
                value
                  ? writeData(`${category}-${id}`, value)
                  : removeData(`${category}-${id}`)
              );
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData("creds", creds),
  };
}
