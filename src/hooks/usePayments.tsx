import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface User {
  first_name: string;
  last_name: string;
}

function isUser(u: any): u is User {
  return (
    u != null &&
    typeof u === "object" &&
    typeof u.first_name === "string" &&
    typeof u.last_name === "string"
  );
}

export interface Payment {
  id: string;
  payment_type: string;
  recipient_type: string;
  recipient_id?: string;
  recipient_name: string;
  amount: number;
  currency: string;
  payment_method?: string;
  reference_number?: string;
  description: string;
  status: string;
  due_date?: string;
  paid_date?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  attachments?: any[];
  approver?: {
    first_name: string;
    last_name: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
  };
}

type PaymentWithUsers = Payment & {
  creator: User;
  approver: User;
};

export function usePayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery<PaymentWithUsers[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          approver:profiles!payments_approved_by_fkey(first_name, last_name),
          creator:profiles!payments_created_by_fkey(first_name, last_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!Array.isArray(data)) {
        return [];
      }

      // first map into a nullable PaymentWithUsers (so we can drop any with missing users)
      const withUsers = data.map((payment: any) => {
        const approver = isUser(payment.approver) ? payment.approver : null;
        const creator = isUser(payment.creator) ? payment.creator : null;
        if (!approver || !creator) return null;
        // now we know both are non-null, so cast to PaymentWithUsers
        return {
          ...payment,
          creator,
          approver,
        } as PaymentWithUsers;
      });

      // drop the nulls
      return withUsers.filter((p): p is PaymentWithUsers => p !== null);
    },
  });

  const createPayment = useMutation({
    mutationFn: async (
      paymentData: Omit<
        Payment,
        "id" | "created_at" | "updated_at" | "approver" | "creator"
      >,
    ) => {
      const { data, error } = await supabase
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Success",
        description: "Payment created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
      logger.error("Create payment error", { error, tags: ["error"] });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
      logger.error("Update payment error", { error, tags: ["error"] });
    },
  });

  return {
    payments,
    isLoading,
    createPayment,
    updatePayment,
  };
}
