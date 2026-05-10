import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { usePositions } from "@/hooks/usePositions";

interface Position {
  id: string;
  name: string;
  role: "staff" | "supervisor" | "manager" | "admin";
  description?: string;
}

interface EditPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  role: "staff" | "supervisor" | "manager" | "admin";
  description: string;
}

const ROLES = [
  { value: "staff" as const, label: "Staff" },
  { value: "supervisor" as const, label: "Supervisor" },
  { value: "manager" as const, label: "Manager" },
  { value: "admin" as const, label: "Admin" },
];

export default function EditPositionDialog({
  open,
  onOpenChange,
  position,
  onClose,
}: EditPositionDialogProps) {
  const { updatePosition } = usePositions();

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      role: "staff",
      description: "",
    },
  });

  useEffect(() => {
    if (position) {
      form.reset({
        name: position.name || "",
        role: position.role || "staff",
        description: position.description || "",
      });
    }
  }, [position, form]);

  const onSubmit = async (values: FormValues) => {
    if (!position) return;

    const { error } = await updatePosition(position.id, values);
    if (!error) {
      onOpenChange(false);
      onClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Position</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Position name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Runner, Cashier, FOH Supervisor"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              rules={{ required: "Role is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the responsibilities and duties of this position"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Updating..."
                  : "Update Position"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
