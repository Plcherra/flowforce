import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface DemoModalProps {
  children: React.ReactNode;
}

export function DemoModal({ children }: DemoModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
            <Play className="h-6 w-6 mr-2 text-[#3F51B5]" />
            FlowForce Product Demo
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            See how FlowForce can transform your business operations in just 2
            minutes
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 h-full">
          <div className="w-full h-full bg-gradient-to-br from-[#3F51B5] to-[#FF4081] rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Video placeholder - in a real app, this would be an embedded video */}
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="text-center text-white z-10">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Play className="h-12 w-12 text-white ml-2" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Coming Soon!</h3>
              <p className="text-lg opacity-90 mb-6">
                Our product demo video is currently in production
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Complete platform walkthrough</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Real-world use case examples</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Setup and configuration guide</span>
                </div>
              </div>
            </div>

            {/* Simulated video controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <div className="flex-1 h-1 bg-white/30 rounded-full">
                  <div className="w-0 h-full bg-white rounded-full"></div>
                </div>
                <span className="text-white text-sm">0:00 / 2:15</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
