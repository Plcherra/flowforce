import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const vendorFormSchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters long")
    .max(120, "Company name is too long"),
  contact_name: z
    .string()
    .max(120, "Contact name is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Enter a valid email address")
    .max(180, "Email is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(40, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(280, "Address is too long")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "Notes are too long").optional().or(z.literal("")),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export function useVendorForm(options?: {
  defaultValues?: Partial<VendorFormValues>;
}) {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      ...options?.defaultValues,
    },
  });

  const reset = useCallback(() => {
    form.reset();
    form.clearErrors();
  }, [form]);

  return {
    form,
    reset,
    schema: vendorFormSchema,
  };
}
