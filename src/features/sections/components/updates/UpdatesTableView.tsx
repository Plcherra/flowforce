import React, { useState } from "react";
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
  Filter,
  Download,
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
import { useCan } from "@/hooks/useCan";

interface UpdatesTableViewProps {
  updates: CompanyUpdate[];
  onEdit?: (update: CompanyUpdate) => void;
  onDelete?: (updateId: string) => void;
  onTogglePin?: (updateId: string) => void;
  onAddNew?: () => void;
}

export function UpdatesTableView({
  updates,
  onEdit,
  onDelete,
  onTogglePin,
  onAddNew,
}: UpdatesTableViewProps) {
  const { can } = useCan();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("published");

  const getStatusBadge = (status: CompanyUpdate["status"]) => {
    const variants = {
      published: "default",
      draft: "secondary",
      scheduled: "outline",
      archived: "destructive",
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: CompanyUpdate["type"]) => {
    const colors = {
      announcement:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      news: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      event:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      policy:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };

    return <Badge className={`${colors[type]} text-xs`}>{type}</Badge>;
  };

  const getPriorityBadge = (priority: CompanyUpdate["priority"]) => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      medium:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };

    return <Badge className={`${colors[priority]} text-xs`}>{priority}</Badge>;
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
              placeholder="Search updates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {can("systemSettings") && (
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="published">
            Active ({tabCounts.published})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({tabCounts.scheduled})
          </TabsTrigger>
          <TabsTrigger value="draft">Draft ({tabCounts.draft})</TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({tabCounts.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Publish Date</TableHead>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUpdates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {update.isPinned && (
                          <Pin className="h-4 w-4 text-primary" />
                        )}
                        <div>
                          <div className="font-medium">{update.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {update.body}
                          </div>
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
                        ? "All"
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
                          {can("systemSettings") && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onEdit?.(update)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onTogglePin?.(update.id)}
                              >
                                <Pin className="h-4 w-4 mr-2" />
                                {update.isPinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDelete?.(update.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUpdates.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  No updates found for the selected criteria.
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
