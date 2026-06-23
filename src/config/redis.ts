import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const url = new URL(process.env.REDIS_URL!);
const useTLS = process.env.REDIS_TLS === "true";

const redis = new Redis.Cluster(
  [{ host: url.hostname, port: Number(url.port) || 6379 }],
  {
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      tls: useTLS ? {} : undefined,
      maxRetriesPerRequest: 3,
    },
  }
);

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

export default redis;
