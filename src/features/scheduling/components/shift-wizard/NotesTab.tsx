import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

type NotesTabProps = {
  notes: string;
  onNotesChange: (val: string) => void;
};

export function NotesTab({ notes, onNotesChange }: NotesTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional notes or instructions for this shift..."
          rows={4}
        />
      </div>

      <div>
        <Label>Attachments</Label>
        <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4">
          <div className="text-center">
            <Paperclip className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop files here, or click to select
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2">
              Choose Files
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
