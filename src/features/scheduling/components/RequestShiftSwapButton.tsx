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
        title: "Swap requested",
        description: "It will show under My swaps.",
      });
      await queryClient.invalidateQueries({ queryKey: ["shift-swaps"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to request swap",
        description:
          error instanceof Error ? error.message : "Please try again later.",
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
      Request swap
    </Button>
  );
}
