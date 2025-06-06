import { AxiosInstance } from "axios";

import * as schemas from "@/lib/schemas";
import type * as types from "@/lib/types";

const DEFAULT_ENDPOINTS = {
  me: "/api/v1/auth/me"
};

export function registerUserAPI(
  instance: AxiosInstance,
  endpoints: typeof DEFAULT_ENDPOINTS = DEFAULT_ENDPOINTS,
) {
  async function getActiveUser(): Promise<types.User> {
    let response = await instance.get(endpoints.me);
    return schemas.UserSchema.parse(response.data);
  }

  return {
    me: getActiveUser,
  } as const;
}
