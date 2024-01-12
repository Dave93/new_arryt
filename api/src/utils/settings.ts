import Redis from "ioredis";

export async function getSetting(client: Redis, key: string) {
  let systemConfigsJson = await client.get(
    `${process.env.PROJECT_PREFIX}_system_configs`
  );
  try {
    const systemConfigs = JSON.parse(systemConfigsJson ?? "{}") as Record<
      string,
      any
    >;
    return systemConfigs[key];
  } catch (error) {
    return null;
  }
}
