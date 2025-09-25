
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

interface ProfileFormProps {
  profile: Profile | null;
  userEmail: string | undefined;
  userId: string;
  onProfileUpdate: () => void;
}

export default function ProfileForm({ profile, userEmail, userId, onProfileUpdate }: ProfileFormProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    birth_date: profile?.birth_date || '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditing(false);
      onProfileUpdate();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      birth_date: profile?.birth_date || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      birth_date: profile?.birth_date || '',
    });
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information
          </CardDescription>
        </div>
        {!isEditing ? (
          <Button onClick={startEditing} variant="outline">
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              onClick={cancelEditing} 
              variant="outline" 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            {isEditing ? (
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.first_name || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            {isEditing ? (
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.last_name || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center space-x-2 p-2 border rounded bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{userEmail}</span>
              <Badge variant="secondary" className="ml-auto text-xs">Read-only</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            {isEditing ? (
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="birth_date">Birth Date</Label>
            {isEditing ? (
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {profile?.birth_date 
                    ? new Date(profile.birth_date).toLocaleDateString() 
                    : 'Not set'
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
