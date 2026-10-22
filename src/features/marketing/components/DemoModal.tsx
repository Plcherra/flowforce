import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center">
            <Play className="h-6 w-6 mr-2 text-primary" />
            {t("landing.flowforceProductDemo")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("landing.seeHowFlowforceCanTransformYourBusinessOperationsInJust2Minutes")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 h-full">
          <div className="w-full h-full bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Video placeholder - in a real app, this would be an embedded video */}
            <div className="absolute inset-0 bg-foreground/20"></div>
            <div className="text-center text-primary-foreground z-10">
              <div className="w-24 h-24 bg-background/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Play className="h-12 w-12 text-primary-foreground ml-2" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t("landing.comingSoon")}</h3>
              <p className="text-lg opacity-90 mb-6">
                {t("landing.ourProductDemoVideoIsCurrentlyInProduction")}
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-background rounded-full mr-3"></div>
                  <span>{t("landing.completePlatformWalkthrough")}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-background rounded-full mr-3"></div>
                  <span>{t("landing.realWorldUseCaseExamples")}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-background rounded-full mr-3"></div>
                  <span>{t("landing.setupAndConfigurationGuide")}</span>
                </div>
              </div>
            </div>

            {/* Simulated video controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-foreground/50 p-4">
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-background/20"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <div className="flex-1 h-1 bg-background/30 rounded-full">
                  <div className="w-0 h-full bg-background rounded-full"></div>
                </div>
                <span className="text-primary-foreground text-sm">0:00 / 2:15</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
