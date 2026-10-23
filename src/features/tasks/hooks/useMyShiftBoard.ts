import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  assembleMyShift,
  type AssembledShift,
  type MyShiftField,
  type MyShiftForm,
  type MyShiftSchedule,
  type MyShiftSubmission,
  type MyShiftTaskRow,
} from "@/features/tasks/utils/myShiftView";

export type MyShiftBoard = AssembledShift | { kind: "loading" } | { kind: "error" };

function rangeAround(now: Date): { start: string; end: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 2);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useMyShiftBoard(tasks: readonly MyShiftTaskRow[]): MyShiftBoard {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [board, setBoard] = useState<MyShiftBoard>({ kind: "loading" });

  useEffect(() => {
    if (!user?.id || profileLoading) {
      setBoard({ kind: "loading" });
      return;
    }
    if (!companyId) {
      setBoard({ kind: "error" });
      return;
    }
    let cancelled = false;
    const now = new Date();
    const range = rangeAround(now);
    setBoard({ kind: "loading" });

    void (async () => {
      const [schedulesResult, formsResult] = await Promise.all([
        supabase
          .from("schedules")
          .select(
            "id, role, title, start_time, end_time, user_id, is_published, is_template",
          )
          .eq("company_id", companyId)
          .gte("start_time", range.start)
          .lt("start_time", range.end),
        supabase.from("forms").select("id, title, settings").eq("company_id", companyId),
      ]);
      if (cancelled) return;
      if (schedulesResult.error || formsResult.error) {
        setBoard({ kind: "error" });
        return;
      }
      const forms = (formsResult.data ?? []) as MyShiftForm[];
      const formIds = forms.map((form) => form.id);
      let fields: MyShiftField[] = [];
      let submissions: MyShiftSubmission[] = [];
      if (formIds.length > 0) {
        const [fieldsResult, submissionsResult] = await Promise.all([
          supabase
            .from("form_fields")
            .select("id, form_id, label, field_order")
            .in("form_id", formIds),
          supabase
            .from("form_submissions")
            .select("form_id, submitted_at, submitted_by, submission_data")
            .in("form_id", formIds)
            .order("submitted_at", { ascending: false })
            .limit(100),
        ]);
        if (cancelled) return;
        if (fieldsResult.error || submissionsResult.error) {
          setBoard({ kind: "error" });
          return;
        }
        fields = (fieldsResult.data ?? []) as MyShiftField[];
        submissions = (submissionsResult.data ?? []) as MyShiftSubmission[];
      }
      setBoard(
        assembleMyShift({
          viewerId: user.id,
          now,
          schedules: (schedulesResult.data ?? []) as MyShiftSchedule[],
          forms,
          fields,
          submissions,
          tasks,
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, companyId, profileLoading, tasks]);

  return board;
}
