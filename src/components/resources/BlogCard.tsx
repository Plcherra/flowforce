import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogCardProps {
  title: string;
  description: string;
  type: string;
  author: string;
  readTime: string;
  url: string;
  publishDate: string;
}

export default function BlogCard({
  title,
  description,
  type,
  author,
  readTime,
  url,
  publishDate,
}: BlogCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            {type}
          </Badge>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            {readTime}
          </div>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <User className="h-4 w-4 mr-1" />
          {author} • {new Date(publishDate).toLocaleDateString()}
        </div>
        <Button variant="outline" className="w-full group" asChild>
          <Link to={url}>
            Read More
            <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
