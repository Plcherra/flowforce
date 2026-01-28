import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Plus, Check } from "lucide-react";
import { useChannelWizard } from "./useChannelWizard";
import { ChannelWizardMembers } from "./ChannelWizardMembers";
import { ChannelWizardForm } from "./ChannelWizardForm";
import { WIZARD_STEPS } from "./ChannelWizardSteps";

interface ChannelWizardProps {
  open: boolean;
  onClose: () => void;
  onChannelCreated?: (channelId: string) => void;
}

export function ChannelWizard({
  open,
  onClose,
  onChannelCreated,
}: ChannelWizardProps) {
  const {
    currentStep,
    loading,
    loadingMembers,
    memberOptions,
    channelData,
    setChannelData,
    handleNext,
    handleBack,
    toggleMember,
    handleSubmit,
    canProceed,
    reset,
  } = useChannelWizard(open);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const handleChannelDataChange = (data: Partial<typeof channelData>) => {
    setChannelData((prev) => ({ ...prev, ...data }));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmitAndClose = async () => {
    const success = await handleSubmit(onChannelCreated);
    if (success) {
      handleClose();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ChannelWizardMembers
            memberOptions={memberOptions}
            channelData={channelData}
            loadingMembers={loadingMembers}
            onToggleMember={toggleMember}
          />
        );
      case 2:
        return (
          <ChannelWizardForm
            channelData={channelData}
            onChannelDataChange={handleChannelDataChange}
          />
        );
      case 3:
        return (
          <ChannelWizardForm
            channelData={channelData}
            onChannelDataChange={handleChannelDataChange}
            showSettings={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="sr-only">Create Channel</DialogTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Create Channel
            </h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            {WIZARD_STEPS.map((step, index) => (
              <motion.div
                key={step.id}
                className="flex items-center flex-1"
                initial={false}
                animate={{
                  opacity: step.id <= currentStep ? 1 : 0.5,
                }}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step.id <= currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <div className="ml-2 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <motion.div
                    className="w-full h-0.5 mx-2 bg-border"
                    initial={false}
                    animate={{
                      backgroundColor:
                        step.id < currentStep
                          ? "hsl(var(--primary))"
                          : "hsl(var(--border))",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

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
                ease: [0.4, 0, 0.2, 1],
              }}
              className="absolute inset-0"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

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

          <div className="flex items-center space-x-2">
            {currentStep < WIZARD_STEPS.length ? (
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
                onClick={handleSubmitAndClose}
                disabled={!canProceed() || loading}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? "Creating…" : "Create Channel"}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
