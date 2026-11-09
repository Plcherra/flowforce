import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { CompanyUpdateBody } from "@/features/company-updates/components/CompanyUpdateBody";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Pin,
  Eye,
  MessageCircle,
  Heart,
  Calendar,
  MoreHorizontal,
  Users,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyUpdate } from "@/types/companyUpdates";

interface UpdatesTableViewProps {
  updates: CompanyUpdate[];
  canManage?: boolean;
  onEdit?: (update: CompanyUpdate) => void;
  onDelete?: (updateId: string) => void;
  onTogglePin?: (updateId: string) => void;
  onAddNew?: () => void;
}

export function UpdatesTableView({
  updates,
  canManage = false,
  onEdit,
  onDelete,
  onTogglePin,
  onAddNew,
}: UpdatesTableViewProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("published");

  const getStatusBadge = (status: CompanyUpdate["status"]) => {
    const variants = {
      published: "default",
      draft: "secondary",
      scheduled: "outline",
      archived: "destructive",
    } as const;
    const labels: Record<CompanyUpdate["status"], string> = {
      published: t("forms.statusPublished"),
      draft: t("forms.statusDraft"),
      scheduled: t("updates.scheduledBadge"),
      archived: t("forms.statusArchived"),
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getTypeBadge = (type: CompanyUpdate["type"]) => {
    const colors = {
      announcement:
        "bg-primary/10 text-primary",
      news: "bg-success-muted text-success",
      event:
        "bg-secondary/10 text-secondary",
      policy:
        "bg-warning-muted text-warning-foreground",
    };
    const labels: Record<CompanyUpdate["type"], string> = {
      announcement: t("dashboard.announcement"),
      news: t("dashboard.news"),
      event: t("dashboard.event"),
      policy: t("dashboard.policy"),
    };

    return (
      <Badge className={`${colors[type]} text-xs`}>{labels[type]}</Badge>
    );
  };

  const getPriorityBadge = (priority: CompanyUpdate["priority"]) => {
    const colors = {
      high: "bg-destructive/10 text-destructive",
      medium:
        "bg-warning-muted text-warning-foreground",
      low: "bg-muted text-foreground",
    };
    const labels: Record<CompanyUpdate["priority"], string> = {
      high: t("dashboard.high"),
      medium: t("dashboard.medium"),
      low: t("dashboard.low"),
    };

    return (
      <Badge className={`${colors[priority]} text-xs`}>{labels[priority]}</Badge>
    );
  };

  const filteredUpdates = updates.filter((update) => {
    const matchesSearch =
      update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.author.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === "all" || update.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const getTabCounts = () => {
    return {
      published: updates.filter((u) => u.status === "published").length,
      scheduled: updates.filter((u) => u.status === "scheduled").length,
      archived: updates.filter((u) => u.status === "archived").length,
      draft: updates.filter((u) => u.status === "draft").length,
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.searchUpdates")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
        </div>

        {canManage && (
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("sections.addNew")}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="published">
            {t("literals.active4")}{tabCounts.published})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            {t("literals.scheduled")}{tabCounts.scheduled})
          </TabsTrigger>
          <TabsTrigger value="draft">{t("literals.draft2")}{tabCounts.draft})</TabsTrigger>
          <TabsTrigger value="archived">
            {t("literals.archived2")}{tabCounts.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedule.title")}</TableHead>
                  <TableHead>{t("schedule.type")}</TableHead>
                  <TableHead>{t("tasks.priority")}</TableHead>
                  <TableHead>{t("schedule.status")}</TableHead>
                  <TableHead>{t("resources.details.author")}</TableHead>
                  <TableHead>{t("sections.publishDate")}</TableHead>
                  <TableHead className="text-center">
                    <Heart className="h-4 w-4 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center">
                    <MessageCircle className="h-4 w-4 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center">
                    <Eye className="h-4 w-4 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center">
                    <Users className="h-4 w-4 mx-auto" />
                  </TableHead>
                  <TableHead className="text-right">{t("inventory.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUpdates.map((update) => {
                  return (
                  <TableRow key={update.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {update.isPinned && (
                          <Pin className="h-4 w-4 text-primary" />
                        )}
                        <div className="max-w-[300px]">
                          <CompanyUpdateBody update={update} variant="compact" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(update.type)}</TableCell>
                    <TableCell>{getPriorityBadge(update.priority)}</TableCell>
                    <TableCell>{getStatusBadge(update.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{update.author.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {update.author.role}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(update.publishDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {update.likes}
                    </TableCell>
                    <TableCell className="text-center">
                      {update.comments}
                    </TableCell>
                    <TableCell className="text-center">
                      {update.views}
                    </TableCell>
                    <TableCell className="text-center">
                      {update.assignedEmployees.includes("all")
                        ? t("literals.all")
                        : update.assignedEmployees.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManage && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onEdit?.(update)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onTogglePin?.(update.id)}
                              >
                                <Pin className="h-4 w-4 mr-2" />
                                {update.isPinned ? t("literals.unpin") : t("literals.pin")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDelete?.(update.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>

            {filteredUpdates.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {t("sections.noUpdatesFoundForTheSelectedCriteria")}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
