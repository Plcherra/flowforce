
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';

interface ImportShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportShiftsDialog({ open, onOpenChange }: ImportShiftsDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // In a real implementation, this would parse the file and create shifts
      
      // Simulated import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error importing shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // In a real implementation, this would generate and download a CSV/Excel template
    const csvContent = `Title,Start Date,Start Time,End Date,End Time,Location,Required Staff,Notes
Morning Shift,2025-06-20,09:00,2025-06-20,17:00,Store A,2,Regular morning shift
Evening Shift,2025-06-20,17:00,2025-06-21,01:00,Store A,1,Evening coverage`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Shifts</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import multiple shifts at once
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Download Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Download Template
              </CardTitle>
              <CardDescription>
                Start with our template to ensure proper formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Upload File
              </CardTitle>
              <CardDescription>
                Select your CSV or Excel file to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Choose File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">
                      {selectedFile.name}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Ready to import • {Math.round(selectedFile.size / 1024)} KB
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important Notes:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                      <li>Dates should be in YYYY-MM-DD format</li>
                      <li>Times should be in HH:MM format (24-hour)</li>
                      <li>Required Staff should be a number</li>
                      <li>Invalid rows will be skipped with errors shown</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedFile || loading}
            >
              {loading ? 'Importing...' : 'Import Shifts'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
