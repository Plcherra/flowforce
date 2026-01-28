import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CompanyUpdate } from "@/types/companyUpdates";
import { getTypeColor } from "@/features/company-updates/utils";

interface UpdateListViewProps {
  updates: CompanyUpdate[];
}

export function UpdateListView({ updates }: UpdateListViewProps) {
  return (
    <div className="px-4 py-6">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {updates.map((update) => (
              <TableRow key={update.id}>
                <TableCell className="font-medium">{update.title}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getTypeColor(update.type)}`}>
                    {update.type}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{update.priority}</TableCell>
                <TableCell>
                  {new Date(update.publishDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  👁 {update.views} • 👍 {update.likes} • 💬 {update.comments}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
