import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Settings, ArrowRight, ArrowLeft, X, Plus, Check } from 'lucide-react';
import { useMessageChannels } from '@/hooks/messages/useMessageChannels';
import { useToast } from '@/hooks/use-toast';

interface AnimatedChannelWizardProps {
  open: boolean;
  onClose: () => void;
}

interface ChannelData {
  name: string;
  description: string;
  type: string;
  is_private: boolean;
  members: string[];
}

const steps = [
  { id: 1, title: 'Add People', icon: Users, description: 'Choose who can join this channel' },
  { id: 2, title: 'Channel Details', icon: MessageSquare, description: 'Set name and description' },
  { id: 3, title: 'Channel Settings', icon: Settings, description: 'Configure privacy and options' },
];

// Mock users - replace with actual user data
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', avatar: '' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: '' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', avatar: '' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: '' },
];

export function AnimatedChannelWizard({ open, onClose }: AnimatedChannelWizardProps) {
  const { createChannel } = useMessageChannels();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [channelData, setChannelData] = useState<ChannelData>({
    name: '',
    description: '',
    type: 'group',
    is_private: false,
    members: []
  });

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleMember = (userId: string) => {
    setChannelData(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const handleSubmit = async () => {
    if (!channelData.name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await createChannel({
        name: channelData.name.trim(),
        description: channelData.description.trim() || undefined,
        type: channelData.type,
        is_private: channelData.is_private
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Channel created successfully',
      });

      // Reset form
      setChannelData({
        name: '',
        description: '',
        type: 'group',
        is_private: false,
        members: []
      });
      setCurrentStep(1);
      onClose();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to create channel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Members are optional
      case 2:
        return channelData.name.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Who should join this channel?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select team members to add to your new channel
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {mockUsers.map((user) => (
                <motion.div
                  key={user.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    channelData.members.includes(user.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleMember(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <motion.div
                    initial={false}
                    animate={{
                      scale: channelData.members.includes(user.id) ? 1 : 0.8,
                      opacity: channelData.members.includes(user.id) ? 1 : 0.5
                    }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      channelData.members.includes(user.id)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {channelData.members.includes(user.id) && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {channelData.members.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2"
              >
                {channelData.members.map((memberId) => {
                  const user = mockUsers.find(u => u.id === memberId);
                  return user ? (
                    <Badge key={memberId} variant="secondary" className="text-xs">
                      {user.name}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMember(memberId);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Channel Details</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Give your channel a name and description
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  value={channelData.name}
                  onChange={(e) => setChannelData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. general, project-updates"
                  className="text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={channelData.description}
                  onChange={(e) => setChannelData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this channel about?"
                  rows={3}
                  className="text-base resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Channel Type</Label>
                <Select
                  value={channelData.type}
                  onValueChange={(value) => setChannelData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group Channel</SelectItem>
                    <SelectItem value="department">Department Channel</SelectItem>
                    <SelectItem value="direct">Direct Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Channel Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure privacy and additional options
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Private Channel</p>
                  <p className="text-sm text-muted-foreground">
                    Only invited members can join this channel
                  </p>
                </div>
                <Switch
                  checked={channelData.is_private}
                  onCheckedChange={(checked) => setChannelData(prev => ({ ...prev, is_private: checked }))}
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-medium text-foreground">Channel Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">{channelData.name || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="text-foreground capitalize">{channelData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Privacy:</span>
                    <span className="text-foreground">{channelData.is_private ? 'Private' : 'Public'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members:</span>
                    <span className="text-foreground">{channelData.members.length} selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {/* Header with progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Create Channel</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className="flex items-center flex-1"
                initial={false}
                animate={{
                  opacity: step.id <= currentStep ? 1 : 0.5
                }}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.id <= currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <div className="ml-2 flex-1">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <motion.div
                    className="w-full h-0.5 mx-2 bg-border"
                    initial={false}
                    animate={{
                      backgroundColor: step.id < currentStep ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[400px] relative overflow-hidden">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="absolute inset-0"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="flex items-center space-x-2"
            >
              <span>{loading ? 'Creating...' : 'Create Channel'}</span>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}