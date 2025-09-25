
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Play, Clock, Users, Award } from 'lucide-react';

const mockCourses = [
  {
    id: '1',
    title: 'Customer Service Excellence',
    description: 'Learn advanced customer service techniques and best practices',
    duration: '2 hours',
    level: 'Intermediate',
    enrolled: 15,
    completed: 12,
    category: 'Customer Service'
  },
  {
    id: '2',
    title: 'Leadership Fundamentals',
    description: 'Essential leadership skills for team leads and supervisors',
    duration: '4 hours',
    level: 'Advanced',
    enrolled: 8,
    completed: 5,
    category: 'Leadership'
  },
  {
    id: '3',
    title: 'Safety Protocols',
    description: 'Workplace safety guidelines and emergency procedures',
    duration: '1 hour',
    level: 'Beginner',
    enrolled: 25,
    completed: 23,
    category: 'Safety'
  }
];

export default function LearningCenter() {
  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Learning Center</h1>
            <p className="text-gray-600 mt-1">
              Enhance your skills with our comprehensive training programs
            </p>
          </div>
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Browse Catalog
          </Button>
        </div>

        <div className="grid gap-6">
          {mockCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <BookOpen className="mr-2 h-5 w-5" />
                      {course.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {course.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{course.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {course.completed}/{course.enrolled} completed
                      </span>
                    </div>
                    <Badge variant="secondary">{course.level}</Badge>
                  </div>
                  <Button>
                    <Play className="mr-2 h-4 w-4" />
                    Start Course
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
