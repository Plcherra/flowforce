import { useState } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export default function StepProgress({
  currentStep,
  totalSteps,
  steps,
}: StepProgressProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <TooltipProvider>
        <div className="flex items-center justify-between relative">
          {/* Progress line background */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0" />

          {/* Animated progress line */}
          <motion.div
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 -translate-y-1/2 z-10"
            initial={{ width: "0%" }}
            animate={{
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
              type: "spring",
              stiffness: 100,
            }}
          />

          {/* Step indicators */}
          {steps.map((step) => (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>
                <motion.div
                  className="relative z-20 flex flex-col items-center cursor-pointer group"
                  onHoverStart={() => setHoveredStep(step.id)}
                  onHoverEnd={() => setHoveredStep(null)}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Step circle */}
                  <motion.div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                      transition-all duration-300 relative overflow-hidden
                      ${
                        step.id <= currentStep
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                          : "bg-white dark:bg-gray-800 text-gray-400 border-2 border-gray-200 dark:border-gray-600"
                      }
                    `}
                    whileTap={{ scale: 0.95 }}
                    animate={
                      step.id === currentStep
                        ? {
                            boxShadow: [
                              "0 0 0 0 rgba(59, 130, 246, 0.7)",
                              "0 0 0 10px rgba(59, 130, 246, 0)",
                            ],
                          }
                        : {}
                    }
                    transition={{
                      boxShadow: {
                        duration: 1.5,
                        repeat: step.id === currentStep ? Infinity : 0,
                        repeatType: "loop",
                      },
                    }}
                  >
                    {step.id <= currentStep ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                      >
                        ✓
                      </motion.div>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </motion.div>

                  {/* Step label */}
                  <motion.span
                    className={`
                      mt-2 text-xs font-medium text-center max-w-20 leading-tight
                      ${
                        step.id <= currentStep
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                      ${hoveredStep === step.id ? "text-blue-700 dark:text-blue-300" : ""}
                    `}
                    animate={{
                      y: hoveredStep === step.id ? -2 : 0,
                      scale: hoveredStep === step.id ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {step.title}
                  </motion.span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              >
                <p className="font-medium">{step.title}</p>
                <p className="text-sm opacity-75">{step.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
