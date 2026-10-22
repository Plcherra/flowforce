"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  exportCompanyLogo,
  findLogoContentCenter,
  offsetToCenterContent,
} from "../utils/exportCompanyLogo";

const VIEWPORT = 280;

type LogoEditorDialogProps = {
  open: boolean;
  sourceUrl: string | null;
  backgroundColor?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File, previewUrl: string) => void;
};

export function LogoEditorDialog({
  open,
  sourceUrl,
  backgroundColor = "#ffffff",
  onOpenChange,
  onConfirm,
}: LogoEditorDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [removeWhite, setRemoveWhite] = useState(true);
  const [keepCentered, setKeepCentered] = useState(true);
  const [contentCenter, setContentCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !sourceUrl) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRemoveWhite(true);
    setKeepCentered(true);
    setContentCenter(null);
    setError(null);

    const image = new Image();
    image.onload = () => {
      setImageSize({
        width: image.naturalWidth || 512,
        height: image.naturalHeight || 512,
      });
    };
    image.src = sourceUrl;

    void findLogoContentCenter(sourceUrl)
      .then((center) => {
        setContentCenter({ x: center.x, y: center.y });
        setImageSize({ width: center.width, height: center.height });
        setOffset(
          offsetToCenterContent(
            center.width,
            center.height,
            center.x,
            center.y,
            VIEWPORT,
            1,
          ),
        );
      })
      .catch(() => {
        setContentCenter(null);
      });
  }, [open, sourceUrl]);

  const fit = imageSize
    ? Math.max(VIEWPORT / imageSize.width, VIEWPORT / imageSize.height)
    : 1;
  const drawWidth = (imageSize?.width ?? VIEWPORT) * fit * zoom;
  const drawHeight = (imageSize?.height ?? VIEWPORT) * fit * zoom;

  const snapToCenter = (nextZoom = zoom) => {
    if (!imageSize) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    const center = contentCenter ?? {
      x: imageSize.width / 2,
      y: imageSize.height / 2,
    };
    setOffset(
      offsetToCenterContent(
        imageSize.width,
        imageSize.height,
        center.x,
        center.y,
        VIEWPORT,
        nextZoom,
      ),
    );
  };

  const handleConfirm = async () => {
    if (!sourceUrl) return;
    setExporting(true);
    setError(null);
    try {
      const file = await exportCompanyLogo(sourceUrl, VIEWPORT, {
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        removeWhite,
      });
      onConfirm(file, URL.createObjectURL(file));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to crop this logo.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust company logo</DialogTitle>
          <DialogDescription>
            Drag to position, zoom to crop, then confirm. White backgrounds can
            be removed so the sidebar mark stays clean.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl border"
            style={{
              width: VIEWPORT,
              height: VIEWPORT,
              backgroundColor,
              touchAction: "none",
              cursor: keepCentered ? "default" : "grab",
            }}
            onPointerDown={(event) => {
              if (keepCentered) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originX: offset.x,
                originY: offset.y,
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              setOffset({
                x: drag.originX + event.clientX - drag.startX,
                y: drag.originY + event.clientY - drag.startY,
              });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
          >
            {sourceUrl ? (
              <img
                src={sourceUrl}
                alt="Logo being cropped"
                className="pointer-events-none absolute max-h-none max-w-none"
                style={{
                  width: drawWidth,
                  height: drawHeight,
                  left: VIEWPORT / 2 + offset.x - drawWidth / 2,
                  top: VIEWPORT / 2 + offset.y - drawHeight / 2,
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-primary-foreground/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
            <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-primary/70" />
            <div className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-primary/70" />
          </div>

          <div className="space-y-2">
            <Label>Zoom</Label>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(value) => {
                const nextZoom = value[0] ?? 1;
                setZoom(nextZoom);
                if (keepCentered) {
                  snapToCenter(nextZoom);
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="keepCentered">Snap to horizontal and vertical center</Label>
              <p className="text-xs text-muted-foreground">
                Finds the mark in the image and keeps it on the crosshair.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => snapToCenter()}
              >
                Center now
              </Button>
              <Switch
                id="keepCentered"
                checked={keepCentered}
                onCheckedChange={(checked) => {
                  setKeepCentered(checked);
                  if (checked) snapToCenter();
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="removeWhite">Remove white background</Label>
              <p className="text-xs text-muted-foreground">
                Best for PNG marks exported on a white canvas.
              </p>
            </div>
            <Switch
              id="removeWhite"
              checked={removeWhite}
              onCheckedChange={setRemoveWhite}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!sourceUrl || exporting}
          >
            {exporting ? "Preparing…" : "Use this logo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
