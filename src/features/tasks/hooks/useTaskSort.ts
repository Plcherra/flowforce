import { useCallback, useMemo } from "react";
import { useSearchParams } from "@/lib/router-adapter";
import {
  parseTaskSortKey,
  type TaskSortKey,
} from "@/features/tasks/utils/taskListSort";

const SORT_URL_KEY = "taskSort";

export function useTaskSort() {
  const [params, setSearchParams] = useSearchParams();

  const sort = useMemo(
    () => parseTaskSortKey(params.get(SORT_URL_KEY)),
    [params],
  );

  const setSort = useCallback(
    (next: TaskSortKey) => {
      setSearchParams((previous) => {
        const copy = new URLSearchParams(previous.toString());
        if (next === "due") {
          copy.delete(SORT_URL_KEY);
        } else {
          copy.set(SORT_URL_KEY, next);
        }
        return copy;
      });
    },
    [setSearchParams],
  );

  return { sort, setSort };
}