import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Video } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";

export default function EventsMeetingsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const { events } = useEvents();
  const meetings = events.filter((e) => e.type === "meeting");
  const filtered = meetings.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card border border-border rounded-md mb-6 sticky top-4 z-20">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{t("common.meetings")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("sections.upcomingAndPastMeetings")}
                </p>
              </div>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("sections.searchMeetings")}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map((m) => {
            return (
            <Card key={m.id}>
              <CardHeader className="flex items-center justify-between px-4 py-3">
                <div>
                  <h3 className="text-sm font-medium">{m.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.start).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {m.description || t("calendar.noDescription")}
                </p>
              </CardContent>
            </Card>
          );
          })}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("sections.noMeetingsFound")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
