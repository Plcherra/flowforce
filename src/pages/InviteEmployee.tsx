
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, Mail, Clock, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CompanyInvite {
  id: string;
  email: string;
  role: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  phone: string | null;
}

export default function InviteEmployee() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    role: 'employee',
    firstName: '',
    lastName: '',
    birthDate: '',
    phone: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');

  // Fetch existing invites - using raw SQL query since types aren't updated yet
  const { data: invites, isLoading } = useQuery({
    queryKey: ['company-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invites' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as unknown) as CompanyInvite[];
    }
  });

  // Create invite mutation - using rpc call with employee details
  const createInviteMutation = useMutation({
    mutationFn: async (employeeData: typeof formData) => {
      const { data, error } = await supabase.rpc('create_company_invite' as any, {
        company_uuid: null, // Will use current user's company
        invite_email: employeeData.email,
        invite_role: employeeData.role,
        employee_first_name: employeeData.firstName,
        employee_last_name: employeeData.lastName,
        employee_birth_date: employeeData.birthDate || null,
        employee_phone: employeeData.phone || null
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (inviteCode) => {
      const inviteLink = `${window.location.origin}/auth?invite=${inviteCode}`;
      setGeneratedLink(inviteLink);
      setFormData({
        email: '',
        role: 'employee',
        firstName: '',
        lastName: '',
        birthDate: '',
        phone: ''
      });
      queryClient.invalidateQueries({ queryKey: ['company-invites'] });
      toast({
        title: "Employee Invite Created",
        description: `Pre-account created for ${formData.firstName} ${formData.lastName}. Invite link generated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite.",
        variant: "destructive",
      });
    }
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (email, first name, last name).",
        variant: "destructive",
      });
      return;
    }
    
    createInviteMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Invite link copied to clipboard.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Employees</h1>
          <p className="text-muted-foreground">
            Invite new team members to join your company
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Invite Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Employee Pre-Account
              </CardTitle>
              <CardDescription>
                Create a complete employee profile and generate an activation link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@company.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Birth Date</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createInviteMutation.isPending}
                >
                  {createInviteMutation.isPending ? 'Creating pre-account...' : 'Create Employee Pre-Account'}
                </Button>
              </form>

              {generatedLink && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Employee Pre-Account Created</h4>
                  <p className="text-sm text-green-600 mb-3">
                    Employee profile created for <strong>{formData.firstName} {formData.lastName}</strong>
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    Send this activation link to the employee. They will only need to set a password to access their account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Employee Pre-Accounts
              </CardTitle>
              <CardDescription>
                Track created employee profiles and activation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : invites && invites.length > 0 ? (
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div>
                            <span className="font-medium">{invite.first_name} {invite.last_name}</span>
                            <div className="text-sm text-muted-foreground">{invite.email}</div>
                          </div>
                          {invite.used_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : isExpired(invite.expires_at) ? (
                            <Clock className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Role: {invite.role} • {
                            invite.used_at 
                              ? `Joined ${formatDate(invite.used_at)}`
                              : isExpired(invite.expires_at)
                              ? `Expired ${formatDate(invite.expires_at)}`
                              : `Expires ${formatDate(invite.expires_at)}`
                          }
                        </div>
                      </div>
                      {!invite.used_at && !isExpired(invite.expires_at) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`${window.location.origin}/auth?invite=${invite.invite_code}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No employee pre-accounts created yet</p>
                  <p className="text-sm">Create your first employee profile to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
