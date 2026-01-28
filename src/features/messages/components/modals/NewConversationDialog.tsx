import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type ConversationType = "direct" | "team";

export interface ConversationDraft {
  type: ConversationType;
  name: string;
  participantIds: string[];
  initialMessage: string;
}

export interface ChatUserSummary {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  status?: "online" | "offline" | "away";
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  users: ChatUserSummary[];
  currentUserId: string;
  onCreate: (draft: ConversationDraft) => void;
}

const conversationSchema = z
  .object({
    type: z.enum(["direct", "team"]),
    teamName: z.string().optional(),
    participantIds: z.array(z.string()),
    initialMessage: z.string().min(1, "Please write the first message."),
  })
  .superRefine((data, ctx) => {
    if (data.type === "direct") {
      if (data.participantIds.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select exactly one teammate for a direct message.",
          path: ["participantIds"],
        });
      }
    } else {
      if (!data.teamName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Team conversations need a name.",
          path: ["teamName"],
        });
      }
      if (data.participantIds.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick at least two teammates for a team chat.",
          path: ["participantIds"],
        });
      }
    }
  });

type ConversationFormValues = z.infer<typeof conversationSchema>;

export function NewConversationDialog({
  open,
  onOpenChange,
  users,
  currentUserId,
  onCreate,
}: NewConversationDialogProps) {
  const form = useForm<ConversationFormValues>({
    resolver: zodResolver(conversationSchema),
    defaultValues: {
      type: "direct",
      teamName: "",
      participantIds: [],
      initialMessage: "",
    },
  });

  const selectableUsers = users.filter((user) => user.id !== currentUserId);
  const hasSelectableUsers = selectableUsers.length > 0;

  const type = form.watch("type");
  const participantIds = form.watch("participantIds");

  const toggleParticipant = (id: string) => {
    const current = form.getValues("participantIds");
    form.setValue(
      "participantIds",
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
      { shouldValidate: true },
    );
  };

  const handleSubmit = form.handleSubmit((values) => {
    const draft: ConversationDraft = {
      type: values.type,
      name: values.type === "direct" ? "" : (values.teamName?.trim() ?? ""),
      participantIds: values.participantIds,
      initialMessage: values.initialMessage.trim(),
    };

    onCreate(draft);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>
            Choose who you want to talk with and send the first message.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversation type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as ConversationType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct message</SelectItem>
                        <SelectItem value="team">Team / group</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "team" && (
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kitchen Supervisors" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="participantIds"
              render={() => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-48 rounded-md border p-2">
                      <div className="space-y-2">
                        {hasSelectableUsers ? (
                          selectableUsers.map((user) => {
                            const checked = participantIds.includes(user.id);
                            return (
                              <label
                                key={user.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-md border p-2 text-sm transition",
                                  checked
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted/40",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    toggleParticipant(user.id)
                                  }
                                  aria-label={`Select ${user.name}`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.name}
                                  </span>
                                  {user.role && (
                                    <span className="text-xs text-muted-foreground">
                                      {user.role}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div className="flex h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                            <Users className="h-8 w-8" />
                            <div>
                              <p>No teammates are available yet.</p>
                              <p className="text-xs">
                                New chats unlock automatically as colleagues
                                join the workspace.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormDescription>
                    {hasSelectableUsers
                      ? type === "direct"
                        ? "Select exactly one teammate to start a private chat."
                        : "Select at least two teammates to start a group conversation."
                      : "Ask an administrator to register teammates so you can start chatting."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write the first message..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Start conversation</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewConversationDialog;
