import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

interface LocationFieldProps {
  label: string;
  description?: string;
  value?: LocationData;
  onChange: (value: LocationData | undefined) => void;
  required?: boolean;
  className?: string;
}

export function LocationField({
  label,
  description,
  value,
  onChange,
  required = false,
  className = "",
}: LocationFieldProps) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, altitude, accuracy } = position.coords;

        try {
          // Try to get address from coordinates using reverse geocoding
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );

          let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          if (response.ok) {
            const data = await response.json();
            if (data.locality || data.city) {
              address = `${data.locality || data.city}, ${data.countryName || ""}`;
            }
          }

          const locationData: LocationData = {
            latitude,
            longitude,
            altitude: altitude || undefined,
            accuracy: accuracy || undefined,
            address,
            timestamp: new Date().toISOString(),
          };

          onChange(locationData);
          toast({
            title: "Success",
            description: "Location captured successfully",
          });
        } catch (error) {
          logger.error("Error getting address:", { error, tags: ["error"] });
          // Still save location even if address lookup fails
          const locationData: LocationData = {
            latitude,
            longitude,
            altitude: altitude || undefined,
            accuracy: accuracy || undefined,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            timestamp: new Date().toISOString(),
          };

          onChange(locationData);
          toast({
            title: "Success",
            description: "Location captured (address lookup failed)",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        let message = "Failed to get location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  }, [onChange]);

  const clearLocation = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

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
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Location Captured</p>
                <p className="text-sm text-muted-foreground break-words">
                  {value.address}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                  </span>
                  {value.accuracy && (
                    <span>±{Math.round(value.accuracy)}m</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(value.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={loading}
              >
                {loading ? "Getting Location..." : "Update Location"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearLocation}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            No location captured yet
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={loading}
            className="min-w-[140px]"
          >
            {loading ? "Getting Location..." : "Get Current Location"}
          </Button>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function LocationFieldPreview({
  label = "Location",
  description = "Capture your current GPS coordinates and address",
  className = "",
}: Partial<LocationFieldProps>) {
  return (
    <LocationField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      className={className}
    />
  );
}
