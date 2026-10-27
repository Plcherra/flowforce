import { useTranslation } from "react-i18next";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, Type, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface ScanConfig {
  scan_types?: ("barcode" | "qr_code")[];
  auto_submit?: boolean;
}

interface ScanData {
  scandata: string;
  scan_type: "barcode" | "qr_code";
  scanformat?: string;
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
    scan_types: ["barcode", "qr_code"],
    auto_submit: false,
  },
  className = "",
}: ScannerFieldProps) {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const supportedTypes = config.scan_types || ["barcode", "qr_code"];

  const startCamera = useCallback(() => {
    setManualEntry(false);
    setIsScanning(true);
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    releaseStream();
    setIsScanning(false);
  }, [releaseStream]);

  const handleManualSubmit = useCallback(() => {
    if (!manualValue.trim()) return;

    // Simple heuristic to determine scan type
    const scanType =
      manualValue.length > 20 || manualValue.includes("http")
        ? "qr_code"
        : "barcode";

    const scanData: ScanData = {
      scandata: manualValue.trim(),
      scan_type: scanType,
      scanformat: "manual_entry",
    };

    onChange(scanData);
    setManualEntry(false);
    setManualValue("");

    toast({
      title: t("forms.saved"),
      description: t("forms.codeEntered"),
    });
  }, [manualValue, onChange, t]);

  useEffect(() => {
    if (!isScanning) return;
    let cancelled = false;
    const Detector = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string; format?: string }>>;
        };
      }
    ).BarcodeDetector;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (!Detector) return;
        const detector = new Detector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
        });
        const readFrame = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              const scanType =
                raw.length > 20 || raw.includes("http") ? "qr_code" : "barcode";
              onChangeRef.current({
                scandata: raw,
                scan_type: scanType,
                scanformat: codes[0]?.format || "camera",
              });
              stopCamera();
              toast({
                title: t("forms.saved"),
                description: t("forms.codeScanned"),
              });
              return;
            }
          } catch (error) {
            logger.warn("Barcode frame was not readable", { error, tags: ["warning"] });
          }
          if (!cancelled) window.setTimeout(() => void readFrame(), 350);
        };
        void readFrame();
      } catch (error) {
        logger.error("Error accessing camera:", { error, tags: ["error"] });
        if (!cancelled) {
          setIsScanning(false);
          setManualEntry(true);
          toast({
            title: t("forms.errorTitle"),
            description: t("forms.cameraPermission"),
            variant: "destructive",
          });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      releaseStream();
    };
  }, [isScanning, releaseStream, stopCamera, t]);

  const clearScan = useCallback(() => {
    onChange(undefined);
    stopCamera();
  }, [onChange, stopCamera]);

  const formatScanType = (type: string) => {
    switch (type) {
      case "qr_code":
        return t("forms.qrCode");
      case "barcode":
        return t("forms.barcode");
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
                  {t("forms.scannedType", {
                    type: formatScanType(value.scan_type),
                  })}</p>
                <p className="text-sm text-muted-foreground break-all">
                  {value.scandata}
                </p>
                {value.scanformat && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("forms.formatValue", { format: value.scanformat })}
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
                {t("forms.scanAgain")}</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearScan}
              >
                <X className="h-3 w-3 mr-1" />
                {t("shell.clear")}</Button>
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
                  {t("forms.scanningFor", {
                    types: supportedTypes
                      .map(formatScanType)
                      .join(` ${t("forms.and")} `),
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("forms.positionTheCodeWithinTheCameraView")}</p>
                {typeof window !== "undefined" && !("BarcodeDetector" in window) ? (
                  <p className="text-xs text-muted-foreground">
                    {t("forms.scanNotSupported")}
                  </p>
                ) : null}
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 bg-foreground dark:bg-background rounded-lg object-cover"
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
                  {t("common.cancel")}</Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    stopCamera();
                    setManualEntry(true);
                  }}
                  className="flex-1"
                >
                  {t("forms.enterManually")}</Button>
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
                  {t("forms.enterCodeManually")}</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder={t("forms.enterBarcodeOrQrCodeData")}
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
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
                      setManualValue("");
                    }}
                    className="flex-1"
                  >
                    {t("common.cancel")}</Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleManualSubmit}
                    disabled={!manualValue.trim()}
                    className="flex-1"
                  >
                    {t("forms.submit")}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <ScanLine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            {t("forms.scanTypes", {
              types: supportedTypes.map(formatScanType).join(` ${t("forms.or")} `),
            })}
          </p>
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" onClick={startCamera}>
              <Camera className="h-4 w-4 mr-2" />
              {t("forms.startScanning")}</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualEntry(true)}
            >
              <Type className="h-4 w-4 mr-2" />
              {t("forms.enterManually")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function ScannerFieldPreview({
  label: labelProp,
  description,
  className = "",
}: Partial<ScannerFieldProps>) {
  const { t } = useTranslation();
  const label = labelProp ?? t("forms.scanner");
  return (
    <ScannerField
      label={label}
      description={description ?? t("forms.fieldScannerHelp")}
      value={undefined}
      onChange={() => {}}
      config={{
        scan_types: ["barcode", "qr_code"],
        auto_submit: false,
      }}
      className={className}
    />
  );
}
