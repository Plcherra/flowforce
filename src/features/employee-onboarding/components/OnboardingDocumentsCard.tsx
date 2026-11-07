import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingDocument } from "../types";

export function OnboardingDocumentsCard({
  documents,
  canManage,
  busy,
  onUpload,
  onArchive,
  onOpen,
}: {
  documents: OnboardingDocument[];
  canManage: boolean;
  busy: boolean;
  onUpload: (title: string, file: File) => void;
  onArchive: (id: string) => void;
  onOpen: (document: OnboardingDocument) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const visible = documents.filter((document) => !document.archivedAt);
  return (
    <Card data-testid="onboarding-documents">
      <CardHeader>
        <CardTitle className="text-lg">{t("employeeOnboarding.documentsTitle")}</CardTitle>
        <CardDescription>{t("employeeOnboarding.documentsHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("employeeOnboarding.noDocuments")}</p>
        ) : (
          visible.map((document) => (
            <div key={document.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.title}</p>
                <p className="truncate text-xs text-muted-foreground">{document.fileName}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onOpen(document)}>
                {t("employeeOnboarding.openDocument")}
              </Button>
              {canManage ? (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onArchive(document.id)}>
                  {t("employeeOnboarding.archiveDocument")}
                </Button>
              ) : null}
            </div>
          ))
        )}
        {canManage ? (
          <form
            className="space-y-3 border-t pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const file = new FormData(event.currentTarget).get("file");
              if (!(file instanceof File) || !title.trim()) return;
              onUpload(title, file);
              setTitle("");
              event.currentTarget.reset();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="onboarding-document-title">{t("employeeOnboarding.documentTitleLabel")}</Label>
              <Input
                id="onboarding-document-title"
                value={title}
                placeholder={t("employeeOnboarding.documentTitlePlaceholder")}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-document-file">{t("employeeOnboarding.uploadDocument")}</Label>
              <Input id="onboarding-document-file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" />
            </div>
            <Button type="submit" disabled={busy || !title.trim()}>
              {t("employeeOnboarding.uploadDocument")}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
