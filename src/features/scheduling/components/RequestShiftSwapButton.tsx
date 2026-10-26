import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createShiftSwap } from "@/features/scheduling/repositories/shiftSwapsRepository";

interface RequestShiftSwapButtonProps {
  scheduleId: string;
  requestingUserId: string;
}

export function RequestShiftSwapButton({
  scheduleId,
  requestingUserId,
}: RequestShiftSwapButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestSwap = useMutation({
    mutationFn: () =>
      createShiftSwap({
        scheduleId,
        requestingUserId,
      }),
    onSuccess: async () => {
      toast({
        title: t("schedule.swapRequested"),
        description: t("schedule.swapRequestedHelp"),
      });
      await queryClient.invalidateQueries({ queryKey: ["shift-swaps"] });
    },
    onError: (error) => {
      toast({
        title: t("schedule.unableToRequestSwap"),
        description:
          error instanceof Error
            ? error.message
            : t("schedule.pleaseTryAgainLater"),
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      data-testid="request-shift-swap"
      disabled={requestSwap.isPending}
      onClick={() => requestSwap.mutate()}
    >
      {t("schedule.requestSwap")}
    </Button>
  );
}
