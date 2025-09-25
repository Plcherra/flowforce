
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ActivityCardProps {
  className?: string;
}

export default function ActivityCard({ className }: ActivityCardProps = {}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <AlertCircle className="mr-2 h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Your recent actions and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">Profile created</p>
            <p className="text-xs text-muted-foreground">Welcome to FlowForce!</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg bg-muted/20">
          AI-powered activity tracking coming soon
        </div>
      </CardContent>
    </Card>
  );
}
