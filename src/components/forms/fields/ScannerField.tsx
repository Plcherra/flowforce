import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScanLine, Camera, Type, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ScanConfig {
  scan_types?: ('barcode' | 'qr_code')[];
  auto_submit?: boolean;
}

interface ScanData {
  scan_data: string;
  scan_type: 'barcode' | 'qr_code';
  scan_format?: string;
}

interface ScannerFieldProps {
  label: string;
  description?: string;
  value?: ScanData;
  onChange: (value: ScanData | undefined) => void;
  required?: boolean;
  config?: ScanConfig;
  className?: string;
}

export function ScannerField({
  label,
  description,
  value,
  onChange,
  required = false,
  config = {
    scan_types: ['barcode', 'qr_code'],
    auto_submit: false
  },
  className = ""
}: ScannerFieldProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supportedTypes = config.scan_types || ['barcode', 'qr_code'];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleManualSubmit = useCallback(() => {
    if (!manualValue.trim()) return;

    // Simple heuristic to determine scan type
    const scanType = manualValue.length > 20 || manualValue.includes('http') ? 'qr_code' : 'barcode';

    const scanData: ScanData = {
      scan_data: manualValue.trim(),
      scan_type: scanType,
      scan_format: 'manual_entry'
    };

    onChange(scanData);
    setManualEntry(false);
    setManualValue('');

    toast({
      title: "Success",
      description: "Code entered successfully",
    });
  }, [manualValue, onChange]);

  const simulateScan = useCallback(() => {
    // For demo purposes - simulate a successful scan
    const mockData: ScanData = {
      scan_data: Math.random().toString(36).substring(2, 15),
      scan_type: supportedTypes[0],
      scan_format: 'simulated'
    };

    onChange(mockData);
    stopCamera();

    toast({
      title: "Success",
      description: "Code scanned successfully",
    });
  }, [onChange, stopCamera, supportedTypes]);

  const clearScan = useCallback(() => {
    onChange(undefined);
    stopCamera();
  }, [onChange, stopCamera]);

  const formatScanType = (type: string) => {
    switch (type) {
      case 'qr_code':
        return 'QR Code';
      case 'barcode':
        return 'Barcode';
      default:
        return type;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {value ? (
        <Card className="border-l-4 border-l-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {formatScanType(value.scan_type)} Scanned
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {value.scan_data}
                </p>
                {value.scan_format && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: {value.scan_format}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScanning(true)}
              >
                <ScanLine className="h-3 w-3 mr-1" />
                Scan Again
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearScan}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isScanning ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="text-center">
                <ScanLine className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-medium text-foreground">
                  Scanning for {supportedTypes.map(formatScanType).join(' and ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Position the code within the camera view
                </p>
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 bg-black rounded-lg object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-primary rounded-lg"></div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={simulateScan}
                  className="flex-1"
                >
                  Simulate Scan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : manualEntry ? (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="text-center">
                <Type className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Enter Code Manually
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Enter barcode or QR code data"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setManualEntry(false);
                      setManualValue('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleManualSubmit}
                    disabled={!manualValue.trim()}
                    className="flex-1"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <ScanLine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            Scan {supportedTypes.map(formatScanType).join(' or ')}
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualEntry(true)}
            >
              <Type className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function ScannerFieldPreview({
  label = "Scanner",
  description = "Scan a barcode or QR code",
  className = ""
}: Partial<ScannerFieldProps>) {
  return (
    <ScannerField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      config={{
        scan_types: ['barcode', 'qr_code'],
        auto_submit: false
      }}
      className={className}
    />
  );
}