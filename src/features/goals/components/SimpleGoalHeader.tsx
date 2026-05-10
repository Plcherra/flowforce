import { memo } from "react";

interface GoalHeaderProps {
  title: string;
  description?: string;
}

function GoalHeaderComponent({ title, description }: GoalHeaderProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

export const GoalHeader = memo(GoalHeaderComponent);

export default GoalHeader;
