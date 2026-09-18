import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInviteAccessOptions } from "../../hooks/useInviteAccessOptions";
import { createInvitePersonCard, type InvitePersonCard } from "../../types/invites";
import { sendCompanyInvites } from "../../utils/sendCompanyInvites";
import { InvitePersonCardForm } from "./InvitePersonCard";

export function InvitePersonStack({
  onSuccess,
  hideIntro = false,
}: {
  onSuccess?: (inviteLink: string | null) => void;
  hideIntro?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    classes,
    defaultClass,
    locations,
    departments,
    showLocations,
    showDepartments,
    inviterLevel,
    inviterPermissions,
    isLoading,
  } = useInviteAccessOptions();
  const [cards, setCards] = useState<InvitePersonCard[]>([
    createInvitePersonCard(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!defaultClass) return;
    setCards((current) =>
      current.map((card) =>
        card.roleId ? card : { ...card, roleId: defaultClass.id },
      ),
    );
  }, [defaultClass]);

  const updateCard = (id: string, next: InvitePersonCard) => {
    setCards((current) => current.map((card) => (card.id === id ? next : card)));
  };

  const handleSubmit = async () => {
    const ready = cards.filter(
      (card) => card.roleId && (card.email.trim() || card.phone.trim()),
    );
    if (ready.length === 0) {
      toast({
        variant: "destructive",
        title: "Add a person",
        description: "Each card needs a class and an email or phone number.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendCompanyInvites(
        ready.map((card) => ({
          firstName: card.firstName,
          lastName: card.lastName,
          email: card.email,
          phone: card.phone,
          roleId: card.roleId,
          permissionOverrides: card.permissionOverrides,
          departmentId: card.departmentId,
        })),
      );
      const failed = result.results.filter((item) => !item.ok);
      if (failed.length > 0) {
        toast({
          variant: "destructive",
          title: "Some invites did not send",
          description: failed
            .map((item) => item.message)
            .filter(Boolean)
            .join(" "),
        });
      } else {
        toast({
          title: ready.length === 1 ? "Invite sent" : "Invites sent",
          description:
            "The class is painted. Give or take on a card later if you need to.",
        });
        setCards([createInvitePersonCard(defaultClass?.id ?? "")]);
        void queryClient.invalidateQueries({ queryKey: ["invites"] });
        onSuccess?.(result.inviteLink);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to send invite",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {hideIntro ? null : (
        <div>
          <h3 className="text-lg font-semibold">Invite teammates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a class. The boxes paint. Give or take only what you can
            grant.
          </p>
        </div>
      )}

      {cards.map((card, index) => (
        <InvitePersonCardForm
          key={card.id}
          card={card}
          index={index}
          classes={classes}
          locations={locations}
          departments={departments}
          showLocations={showLocations}
          showDepartments={showDepartments}
          inviterLevel={inviterLevel}
          inviterPermissions={inviterPermissions}
          canRemove={cards.length > 1}
          onChange={(next) => updateCard(card.id, next)}
          onRemove={() =>
            setCards((current) => current.filter((item) => item.id !== card.id))
          }
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setCards((current) => [
              ...current,
              createInvitePersonCard(defaultClass?.id ?? ""),
            ])
          }
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? "Sending..." : "Send invites"}
        </Button>
      </div>
    </div>
  );
}
