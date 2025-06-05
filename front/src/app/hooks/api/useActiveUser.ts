import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import api from "@/app/api";

import type { User } from "@/lib/types";

export default function useActiveUser({
  user: initial,
  enabled = true,
}: {
  user?: User;
  enabled?: boolean;
} = {}) {
  const client = useQueryClient();

  const query = useQuery<User, AxiosError>({
    queryKey: ["me"],
    queryFn: api.user.me,
    initialData: initial,
    staleTime: 30_000,
    retry: false,
    enabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    refetchIntervalInBackground: false,
  });

  
  return {
    ...query,
  };
}
