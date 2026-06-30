import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomReport, useReportData } from "@/hooks/useReports";
import {
  _Download,
  FileSpreadsheet,
  FileText,
  Filter,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  _LineChart,
  _Line,
} from "recharts";

interface ReportViewerProps {
  report: CustomReport;
  onBack: () => void;
}

export default function ReportViewer({ report, onBack }: ReportViewerProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [filters, _setFilters] = useState({});

  const { data: reportData, isLoading } = useReportData(
    report.report_type,
    filters,
  );

  const exportToCSV = () => {
    if (!reportData?.length) return;

    const headers = report.columns.join(",");
    const rows = reportData
      .map((row) =>
        report.columns.map((col) => `"${row[col] || ""}"`).join(","),
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Simple PDF export - in a real app you'd use a library like jsPDF
    window.print();
  };

  const renderChart = () => {
    if (!reportData?.length) return null;

    // Simple chart based on data - in a real app this would be more sophisticated
    const chartData = reportData.slice(0, 10).map((item, index) => ({
      name: item[report.columns[0]] || `Item ${index + 1}`,
      value: index + 1,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <CardTitle>{report.name}</CardTitle>
              {report.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {report.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={report.is_public ? "default" : "secondary"}>
              {report.is_public ? "Public" : "Private"}
            </Badge>
            <Badge variant="outline">{report.report_type}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2">
            <Select
              value={viewMode}
              onValueChange={(value: "table" | "chart") => setViewMode(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="chart">Chart</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === "table" ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.columns.map((column) => (
                    <TableHead key={column} className="capitalize">
                      {column.replace("_", " ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.map((row, index) => (
                  <TableRow key={index}>
                    {report.columns.map((column) => (
                      <TableCell key={column}>{row[column] || "-"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-80">{renderChart()}</div>
        )}

        {reportData?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No data available for this report.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
