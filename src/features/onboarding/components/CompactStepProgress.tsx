import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompactStepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export default function CompactStepProgress({
  currentStep,
  steps,
}: CompactStepProgressProps) {
  return (
    <div className="w-full">
      <TooltipProvider>
        <div className="flex items-center space-x-2">
          {/* Progress segments */}
          {steps.map((step, index) => (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex-1 h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className={`h-full rounded-full ${
                      step.id <= currentStep
                        ? "bg-gradient-to-r from-primary to-secondary"
                        : "bg-transparent"
                    }`}
                    initial={{ width: "0%" }}
                    animate={{
                      width: step.id <= currentStep ? "100%" : "0%",
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "easeInOut",
                      delay: index * 0.1,
                    }}
                  />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-foreground text-primary-foreground"
              >
                <p className="font-medium">{step.title}</p>
                <p className="text-sm opacity-75">{step.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Step labels - only show on larger screens */}
        <div className="hidden md:flex justify-between mt-2">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`text-xs font-medium ${
                step.id <= currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
