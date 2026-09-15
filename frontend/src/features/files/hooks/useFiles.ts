import { useQuery } from "@tanstack/react-query";
import { getFiles } from "@/api/files.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { GetFilesParams } from "@/types/file.types";

export function useFiles(params: GetFilesParams) {
  return useQuery({
    queryKey: ["files", "list", params],
    queryFn: async () => {
      const response = await getFiles(params);
      return unwrapResponse(response);
    },
    placeholderData: (prev) => prev,
  });
}
