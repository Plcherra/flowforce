import React, { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PenTool, RotateCcw, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";
import {
  buildCompanyStoragePath,
  resolveProfileCompanyId,
} from "@/lib/storagePaths";

interface SignatureData {
  signature_data: string; // Base64 encoded
  signature_url?: string;
  signature_bucket?: string;
  signature_path?: string;
  signer_name?: string;
  signed_at: string;
}

interface SignatureFieldProps {
  label: string;
  description?: string;
  value?: SignatureData;
  onChange: (value: SignatureData | undefined) => void;
  required?: boolean;
  signerName?: string;
  className?: string;
}

export function SignatureField({
  label,
  description,
  value,
  onChange,
  required = false,
  signerName,
  className = "",
}: SignatureFieldProps) {
  const { profile } = useProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploading, setUploading] = useState(false);

  const startDrawing = useCallback(
    (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      let clientX: number, clientY: number;
      if ("touches" in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawn(true);
    },
    [],
  );

  const draw = useCallback(
    (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (!isDrawing || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      let clientX: number, clientY: number;
      if ("touches" in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(undefined);
  }, [onChange]);

  const saveSignature = useCallback(async () => {
    if (!canvasRef.current || !hasDrawn) return;

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL("image/png");

    setUploading(true);

    try {
      // Convert base64 to blob
      const response = await fetch(signatureData);
      const blob = await response.blob();

      // Upload to Supabase storage
      const fileName = `signature_${Date.now()}.png`;
      const companyId = resolveProfileCompanyId(profile);
      if (!companyId) {
        throw new Error("Your account is not attached to a company yet.");
      }
      const filePath = buildCompanyStoragePath(
        companyId,
        "forms/signatures",
        fileName,
      );

      const { error: uploadError } = await supabase.storage
        .from("form-signatures")
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error("Upload error:", { error: uploadError, tags: ["error"] });
        toast({
          title: "Error",
          description: "Failed to save signature",
          variant: "destructive",
        });
        return;
      }

      const signature: SignatureData = {
        signature_data: signatureData,
        signature_bucket: "form-signatures",
        signature_path: filePath,
        signer_name: signerName,
        signed_at: new Date().toISOString(),
      };

      onChange(signature);
      toast({
        title: "Success",
        description: "Signature saved successfully",
      });
    } catch (error) {
      logger.error("Error saving signature:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to save signature",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [hasDrawn, onChange, profile, signerName]);

  // Initialize canvas
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas styling
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

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
                  Signature Captured
                </p>
                {value.signer_name && (
                  <p className="text-sm text-muted-foreground">
                    Signed by: {value.signer_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(value.signed_at).toLocaleString()}
                </p>
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <img
                    src={value.signature_data}
                    alt="Signature"
                    className="w-full h-24 object-contain bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <PenTool className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Please sign in the box below
              </p>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startDrawing(e);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  draw(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopDrawing();
                }}
                style={{ touchAction: "none" }}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={!hasDrawn}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveSignature}
                disabled={!hasDrawn || uploading}
                className="flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                {uploading ? "Saving..." : "Save Signature"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// For form builder preview
export function SignatureFieldPreview({
  label = "Signature",
  description = "Please provide your digital signature",
  className = "",
}: Partial<SignatureFieldProps>) {
  return (
    <SignatureField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      className={className}
    />
  );
}
