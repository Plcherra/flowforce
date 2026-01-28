import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Heart, ThumbsUp, Smile, Meh, Frown } from "lucide-react";

interface RatingConfig {
  max_rating?: number;
  rating_type?: "stars" | "numeric" | "emoji";
  labels?: string[];
}

interface RatingData {
  rating_value: number;
  max_rating: number;
  rating_type: "stars" | "numeric" | "emoji";
}

interface RatingFieldProps {
  label: string;
  description?: string;
  value?: RatingData;
  onChange: (value: RatingData | undefined) => void;
  required?: boolean;
  config?: RatingConfig;
  className?: string;
}

export function RatingField({
  label,
  description,
  value,
  onChange,
  required = false,
  config = {
    max_rating: 5,
    rating_type: "stars",
    labels: [],
  },
  className = "",
}: RatingFieldProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const maxRating = config.max_rating || 5;
  const ratingType = config.rating_type || "stars";
  const labels = config.labels || [];

  const handleRatingClick = (rating: number) => {
    const ratingData: RatingData = {
      rating_value: rating,
      max_rating: maxRating,
      rating_type: ratingType,
    };
    onChange(ratingData);
  };

  const clearRating = () => {
    onChange(undefined);
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, index) => {
          const rating = index + 1;
          const isActive =
            (hoverValue !== null ? hoverValue : value?.rating_value || 0) >=
            rating;

          return (
            <button
              key={rating}
              type="button"
              className={`transition-colors duration-150 hover:scale-110 ${
                isActive
                  ? "text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-300"
              }`}
              onClick={() => handleRatingClick(rating)}
              onMouseEnter={() => setHoverValue(rating)}
              onMouseLeave={() => setHoverValue(null)}
            >
              <Star className="h-6 w-6 fill-current" />
            </button>
          );
        })}
        {value && (
          <button
            type="button"
            onClick={clearRating}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  const renderNumericRating = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">1</span>
        <div className="flex gap-1">
          {Array.from({ length: maxRating }, (_, index) => {
            const rating = index + 1;
            const isActive =
              (hoverValue !== null ? hoverValue : value?.rating_value || 0) >=
              rating;

            return (
              <button
                key={rating}
                type="button"
                className={`w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-105 ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                }`}
                onClick={() => handleRatingClick(rating)}
                onMouseEnter={() => setHoverValue(rating)}
                onMouseLeave={() => setHoverValue(null)}
              >
                {rating}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground">{maxRating}</span>
        {value && (
          <button
            type="button"
            onClick={clearRating}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  const renderEmojiRating = () => {
    const emojis = [
      { icon: Frown, label: "Very Poor", color: "text-red-500" },
      { icon: Meh, label: "Poor", color: "text-orange-500" },
      { icon: Smile, label: "Average", color: "text-yellow-500" },
      { icon: Smile, label: "Good", color: "text-lime-500" },
      { icon: Smile, label: "Excellent", color: "text-green-500" },
    ];

    const visibleEmojis = emojis.slice(0, maxRating);

    return (
      <div className="flex items-center gap-2">
        {visibleEmojis.map((emoji, index) => {
          const rating = index + 1;
          const isActive =
            (hoverValue !== null ? hoverValue : value?.rating_value || 0) ===
            rating;
          const IconComponent = emoji.icon;

          return (
            <button
              key={rating}
              type="button"
              className={`p-2 rounded-full transition-all duration-150 hover:scale-110 ${
                isActive
                  ? `${emoji.color} bg-current/10`
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleRatingClick(rating)}
              onMouseEnter={() => setHoverValue(rating)}
              onMouseLeave={() => setHoverValue(null)}
              title={emoji.label}
            >
              <IconComponent className="h-6 w-6" />
            </button>
          );
        })}
        {value && (
          <button
            type="button"
            onClick={clearRating}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  const renderRating = () => {
    switch (ratingType) {
      case "numeric":
        return renderNumericRating();
      case "emoji":
        return renderEmojiRating();
      default:
        return renderStarRating();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            {renderRating()}

            {value && (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {value.rating_value} out of {value.max_rating}
                </p>
                {labels[value.rating_value - 1] && (
                  <p className="text-xs text-muted-foreground">
                    {labels[value.rating_value - 1]}
                  </p>
                )}
              </div>
            )}

            {hoverValue !== null && !value && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {hoverValue} out of {maxRating}
                </p>
                {labels[hoverValue - 1] && (
                  <p className="text-xs text-muted-foreground">
                    {labels[hoverValue - 1]}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// For form builder preview
export function RatingFieldPreview({
  label = "Rating",
  description = "Please rate your experience",
  className = "",
}: Partial<RatingFieldProps>) {
  return (
    <RatingField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      config={{
        max_rating: 5,
        rating_type: "stars",
        labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      }}
      className={className}
    />
  );
}
