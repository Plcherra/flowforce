import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
}

export function BackButton({
  className = "",
  fallbackHref = "/",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`text-gray-600 hover:text-gray-900 hover:bg-gray-100 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );
}
