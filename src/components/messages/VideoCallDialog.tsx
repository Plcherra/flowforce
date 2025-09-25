import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Camera, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  participants: Array<{ id: string; name: string; avatar?: string }>;
  callType: 'video' | 'audio';
}

export function VideoCallDialog({ 
  isOpen, 
  onClose, 
  channelName, 
  participants, 
  callType 
}: VideoCallDialogProps) {
  const { toast } = useToast();
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && callStatus === 'connected') {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, callStatus]);

  useEffect(() => {
    if (isOpen) {
      initializeMedia();
      // Simulate connection after 2 seconds
      setTimeout(() => {
        setCallStatus('connected');
        toast({
          title: "Call Connected",
          description: `Connected to ${channelName}`,
        });
      }, 2000);
    }
  }, [isOpen, channelName, toast]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media:', error);
      toast({
        title: "Media Access Error",
        description: "Could not access camera or microphone",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // Here you would control the actual video stream
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    // Here you would control the actual audio stream
  };

  const endCall = () => {
    setCallStatus('ended');
    setCallDuration(0);
    
    // Stop media streams
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }

    toast({
      title: "Call Ended",
      description: `Call duration: ${formatDuration(callDuration)}`,
    });

    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {callType === 'video' ? (
                  <Video className="h-5 w-5 text-blue-400" />
                ) : (
                  <Phone className="h-5 w-5 text-green-400" />
                )}
                <h3 className="font-semibold">{channelName}</h3>
              </div>
              <Badge variant={callStatus === 'connected' ? 'default' : 'secondary'}>
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'connected' && formatDuration(callDuration)}
                {callStatus === 'ended' && 'Call Ended'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>{participants.length} participants</span>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4 grid grid-cols-2 gap-4">
            {/* Local Video */}
            <Card className="relative bg-gray-800 border-gray-700">
              <CardContent className="p-0 h-full">
                {isVideoEnabled && callType === 'video' ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-semibold text-white">You</span>
                      </div>
                      <p className="text-sm text-gray-300">Camera off</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
                  You {!isAudioEnabled && '(muted)'}
                </div>
              </CardContent>
            </Card>

            {/* Remote Participants */}
            {participants.slice(0, 3).map((participant, index) => (
              <Card key={participant.id} className="relative bg-gray-800 border-gray-700">
                <CardContent className="p-0 h-full">
                  <div className="flex items-center justify-center h-full bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-semibold text-white">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{participant.name}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
                    {participant.name}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="p-4 bg-gray-800 flex items-center justify-center gap-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              className="rounded-full p-3"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            {callType === 'video' && (
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full p-3"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              className="rounded-full p-3"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full p-3"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}