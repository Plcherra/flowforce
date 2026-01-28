import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface AudioRecordingFieldProps {
  label: string;
  description?: string;
  value?: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  maxRecordings?: number;
  maxDuration?: number; // in seconds
  className?: string;
}

export function AudioRecordingField({
  label,
  description,
  value = [],
  onChange,
  required = false,
  maxRecordings = 3,
  maxDuration = 300, // 5 minutes
  className = "",
}: AudioRecordingFieldProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAudio = useCallback(
    async (blob: Blob, filename: string): Promise<string | null> => {
      try {
        const filePath = `form-audio/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from("form-audio")
          .upload(filePath, blob, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          logger.error("Upload error:", {
            error: uploadError,
            tags: ["error"],
          });
          return null;
        }

        const { data } = supabase.storage
          .from("form-audio")
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (error) {
        logger.error("Error uploading audio:", { error, tags: ["error"] });
        return null;
      }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    if (value.length >= maxRecordings) {
      toast({
        title: "Error",
        description: `Maximum ${maxRecordings} recordings allowed`,
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const fileName = `recording_${Date.now()}.webm`;

        setUploading(true);
        const url = await uploadAudio(audioBlob, fileName);
        setUploading(false);

        if (url) {
          onChange([...value, url]);
          toast({
            title: "Success",
            description: "Recording saved successfully",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to save recording",
            variant: "destructive",
          });
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      logger.error("Error starting recording:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  }, [value, onChange, maxRecordings, maxDuration, uploadAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRecording]);

  const playAudio = useCallback(
    (index: number) => {
      const audio = audioRefs.current[index];
      if (!audio) return;

      if (isPlaying === index) {
        audio.pause();
        setIsPlaying(null);
      } else {
        // Stop any currently playing audio
        audioRefs.current.forEach((a, i) => {
          if (a && i !== index) {
            a.pause();
            a.currentTime = 0;
          }
        });

        audio.play();
        setIsPlaying(index);
      }
    },
    [isPlaying],
  );

  const removeRecording = useCallback(
    (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);

      // Stop playing if this audio was playing
      if (isPlaying === index) {
        setIsPlaying(null);
      }
    },
    [value, onChange, isPlaying],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      if (value.length + files.length > maxRecordings) {
        toast({
          title: "Error",
          description: `Maximum ${maxRecordings} recordings allowed`,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      try {
        const uploadPromises = files.map((file) => {
          const fileName = `${Math.random().toString(36).substring(2)}_${file.name}`;
          return uploadAudio(file, fileName);
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(
          (url): url is string => url !== null,
        );

        if (successfulUploads.length > 0) {
          onChange([...value, ...successfulUploads]);
          toast({
            title: "Success",
            description: `${successfulUploads.length} audio file(s) uploaded successfully`,
          });
        }
      } catch (error) {
        logger.error("Error uploading files:", { error, tags: ["error"] });
        toast({
          title: "Error",
          description: "Failed to upload audio files",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [value, onChange, maxRecordings, uploadAudio],
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((url, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => playAudio(index)}
                  >
                    {isPlaying === index ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      Recording {index + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Audio recording • Click to play
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeRecording(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <audio
                  ref={(el) => {
                    if (el) audioRefs.current[index] = el;
                  }}
                  src={url}
                  onEnded={() => setIsPlaying(null)}
                  preload="metadata"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {value.length < maxRecordings && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-3" />

          {isRecording ? (
            <div className="space-y-3">
              <p className="text-foreground font-medium">Recording...</p>
              <p className="text-lg font-mono text-primary">
                {formatTime(recordingTime)} / {formatTime(maxDuration)}
              </p>
              <Button
                type="button"
                variant="destructive"
                onClick={stopRecording}
                className="min-w-[120px]"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm mb-4">
                {value.length === 0
                  ? "No recordings yet"
                  : `${value.length} of ${maxRecordings} recordings`}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startRecording}
                  disabled={uploading}
                  className="min-w-[120px]"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Audio
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Max {maxRecordings} recordings, {Math.floor(maxDuration / 60)}{" "}
                min each
              </p>
            </>
          )}
        </div>
      )}

      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading audio...
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function AudioRecordingFieldPreview({
  label = "Audio Recording",
  description = "Record audio or upload audio files",
  className = "",
}: Partial<AudioRecordingFieldProps>) {
  return (
    <AudioRecordingField
      label={label}
      description={description}
      value={[]}
      onChange={() => {}}
      className={className}
    />
  );
}
