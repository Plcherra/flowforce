import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Calendar, 
  Clock, 
  ArrowRightLeft, 
  CheckCircle, 
  AlertCircle,
  Bell,
  Settings,
  Languages,
  Download
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';

interface StaffSchedule {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  role: string;
  location: string;
  status: 'confirmed' | 'pending' | 'swapped';
  color: string;
}

export function MobileStaffInterface() {
  const { profile } = useProfile();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  // No demo data. This UI will show empty states until real data is wired.
  const staffSchedules: StaffSchedule[] = [];

  const upcomingShifts = staffSchedules.filter(s => s.date >= new Date());
  const todaysShift = staffSchedules.find(s => 
    format(s.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'swapped': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 bg-background min-h-screen">
      {/* Mobile Header */}
      <div className="bg-primary/5 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{profile ? `${profile.first_name} ${profile.last_name}` : 'My Profile'}</h1>
              <p className="text-sm text-muted-foreground">{profile?.role || 'Staff'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Today's Shift Card */}
        {todaysShift && (
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: todaysShift.color }}
                  />
                  <span className="font-medium">{todaysShift.title}</span>
                </div>
                {getStatusIcon(todaysShift.status)}
              </div>
              <div className="text-sm text-muted-foreground">
                Today • {todaysShift.startTime} - {todaysShift.endTime}
              </div>
              <Badge className="mt-2 text-xs">{todaysShift.role}</Badge>
            </CardContent>
          </Card>
        )}
        {!todaysShift && (
          <div className="text-sm text-muted-foreground">No shifts scheduled for today.</div>
        )}
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="px-4">
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="schedule" className="flex flex-col gap-1 text-xs">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="swaps" className="flex flex-col gap-1 text-xs">
              <ArrowRightLeft className="h-4 w-4" />
              Swaps
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="flex flex-col gap-1 text-xs">
              <Clock className="h-4 w-4" />
              Time Off
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col gap-1 text-xs">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">My Schedule</CardTitle>
                <CardDescription>Your upcoming shifts this week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingShifts.map((shift) => (
                  <div key={shift.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: shift.color }}
                        />
                        <span className="font-medium text-sm">{shift.title}</span>
                      </div>
                      {getStatusIcon(shift.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {format(shift.date, 'EEE, MMM d')} • {shift.startTime} - {shift.endTime}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {shift.role}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Request Swap
                        </Button>
                        <Button size="sm" className="text-xs h-7">
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-xs">Clock In/Out</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Request Time Off</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  <span className="text-xs">Swap Shifts</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Bell className="h-5 w-5" />
                  <span className="text-xs">Update Availability</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Swaps Tab */}
          <TabsContent value="swaps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shift Swaps</CardTitle>
                <CardDescription>Request and manage shift swaps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No Active Swaps</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have no pending shift swap requests
                  </p>
                  <Button size="sm">
                    Browse Available Shifts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Off Tab */}
          <TabsContent value="timeoff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Off Requests</CardTitle>
                <CardDescription>Manage your time off requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <Button className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Request Vacation Time
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Report Sick Day
                  </Button>
                </div>
                
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No pending time off requests</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {/* Language Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Language / Idioma
                </CardTitle>
                <CardDescription>Choose your preferred language</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={selectedLanguage === lang.code ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedLanguage(lang.code)}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Schedule Changes</span>
                  <Button size="sm" variant="outline">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Shift Reminders</span>
                  <Button size="sm" variant="outline">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Swap Requests</span>
                  <Button size="sm" variant="outline">Enabled</Button>
                </div>
              </CardContent>
            </Card>

            {/* App Download */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile App
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download our mobile app for the best experience
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    iOS App
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Android App
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
