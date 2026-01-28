import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

interface DownloadCardProps {
  title: string;
  description: string;
  type: string;
  platforms?: string[];
  format?: string;
  downloadUrl: string;
}

export default function DownloadCard({
  title,
  description,
  type,
  platforms,
  format,
  downloadUrl,
}: DownloadCardProps) {
  const handleDownload = () => {
    window.open(downloadUrl, "_blank");
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
          {format && <span className="text-xs text-gray-500">{format}</span>}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {platforms && (
          <div className="flex space-x-2 mb-4">
            {platforms.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        )}
        <Button
          className="w-full bg-[#3F51B5] hover:bg-[#3F51B5]/90"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}
