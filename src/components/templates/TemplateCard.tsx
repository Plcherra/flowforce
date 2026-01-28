import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Template, TemplateKey } from "@/data/templateData";

interface TemplateCardProps {
  templateKey: TemplateKey;
  template: Template;
}

export function TemplateCard({ templateKey, template }: TemplateCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
      ></div>

      <CardContent className="p-8 relative">
        <div
          className={`w-20 h-20 bg-gradient-to-br ${template.gradient} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
        >
          <template.icon className="h-10 w-10 text-white" />
        </div>

        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-[#3F51B5] transition-colors">
            {template.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {template.description}
          </CardDescription>
        </CardHeader>

        <ul className="space-y-2 mb-6">
          {template.features.slice(0, 3).map((feature, idx) => (
            <li key={idx} className="flex items-center text-sm text-gray-600">
              <div
                className={`w-2 h-2 ${template.bgColor} rounded-full mr-3`}
              ></div>
              {feature}
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          className="w-full border-2 border-[#3F51B5] text-[#3F51B5] hover:bg-[#3F51B5] hover:text-white group/btn transition-all duration-300"
          onClick={() => navigate(`/templates/${templateKey}`)}
        >
          Explore {template.title}
          <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
