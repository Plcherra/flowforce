import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { Link } from "@/lib/router-adapter";

interface VideoCardProps {
  title: string;
  description: string;
  duration: string;
  url: string;
  thumbnail: string;
  embedUrl: string;
}

export default function VideoCard({
  title,
  description,
  duration,
  url,
  thumbnail,
  embedUrl,
}: VideoCardProps) {
  const isPlaceholder = embedUrl === "placeholder";

  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-shadow duration-300">
      <Link to={url}>
        <div
          className={`h-48 ${thumbnail} rounded-t-lg relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {duration}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Video className="h-8 w-8 text-white ml-1" />
            </div>
          </div>
          {isPlaceholder && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
              Coming Soon
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
