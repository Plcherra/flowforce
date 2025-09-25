
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & {
  position?: {
    id: string;
    name: string;
    role: string;
    description?: string;
  };
  company?: {
    id: string;
    name: string;
    primary_color?: string;
    secondary_color?: string;
  };
};

interface ProfileOverviewProps {
  profile: Profile | null;
  userEmail: string | undefined;
}

export default function ProfileOverview({ profile, userEmail }: ProfileOverviewProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">
          {profile?.first_name} {profile?.last_name}
        </CardTitle>
        <CardDescription>{userEmail}</CardDescription>
        <div className="flex justify-center space-x-2 mt-2">
          <Badge variant="outline">{profile?.role}</Badge>
          <Badge variant="secondary">{profile?.employment_status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>Employee ID: {profile?.employee_id || 'N/A'}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            Hired: {profile?.hire_date 
              ? new Date(profile.hire_date).toLocaleDateString() 
              : 'Not set'
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
