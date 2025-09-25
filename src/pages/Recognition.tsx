
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Trophy, Heart, Zap, Calendar } from 'lucide-react';

const mockRecognitions = [
  {
    id: '1',
    type: 'Employee of the Month',
    recipient: { name: 'Sarah Johnson', avatar: null },
    giver: { name: 'Manager Mike', avatar: null },
    date: '2025-06-01',
    message: 'Outstanding customer service and team collaboration',
    icon: Trophy,
    color: 'text-yellow-600'
  },
  {
    id: '2',
    type: 'Team Player',
    recipient: { name: 'John Doe', avatar: null },
    giver: { name: 'Sarah Johnson', avatar: null },
    date: '2025-05-28',
    message: 'Always willing to help teammates and go the extra mile',
    icon: Heart,
    color: 'text-red-600'
  },
  {
    id: '3',
    type: 'Innovation Award',
    recipient: { name: 'Emily Chen', avatar: null },
    giver: { name: 'Director Lisa', avatar: null },
    date: '2025-05-25',
    message: 'Implemented new process that improved efficiency by 30%',
    icon: Zap,
    color: 'text-blue-600'
  }
];

export default function Recognition() {
  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recognition & Achievements</h1>
            <p className="text-gray-600 mt-1">
              Celebrate achievements and recognize outstanding performance
            </p>
          </div>
          <Button>
            <Star className="mr-2 h-4 w-4" />
            Give Recognition
          </Button>
        </div>

        <div className="grid gap-6">
          {mockRecognitions.map((recognition) => {
            const IconComponent = recognition.icon;
            return (
              <Card key={recognition.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-full bg-gray-100 ${recognition.color}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{recognition.type}</CardTitle>
                        <CardDescription className="mt-2">
                          {recognition.message}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={recognition.recipient.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {recognition.recipient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{recognition.recipient.name}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        recognized by {recognition.giver.name}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{recognition.date}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
