import { useCallback, useState } from "react";

type CommentState = Record<string, string>;

export function useCommentForm() {
  const [values, setValues] = useState<CommentState>({});
  const [errors, setErrors] = useState<CommentState>({});

  const handleChange = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearComment = useCallback((id: string) => {
    setValues((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setErrors((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setError = useCallback((id: string, message: string) => {
    setErrors((prev) => ({ ...prev, [id]: message }));
  }, []);

  return {
    values,
    errors,
    handleChange,
    clearComment,
    setError,
  };
}
