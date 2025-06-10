import { z } from "zod";

import { instance, BASE_ROUTE } from "@/lib/api/common";

const FrontendConfigSchema = z.object({
  frontend_url: z.string(),
});

export type FrontendConfig = z.infer<typeof FrontendConfigSchema>;

const endpoints = {
  frontend: `${BASE_ROUTE}/config/frontend`,
};

let configCache: FrontendConfig | null = null;

export async function getFrontendConfig(): Promise<FrontendConfig> {
  if (configCache) {
    return configCache;
  }

  const response = await instance.get(endpoints.frontend);
  const config = FrontendConfigSchema.parse(response.data);
  configCache = config;
  return config;
}