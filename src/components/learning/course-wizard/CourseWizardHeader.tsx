import { BookOpen } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CourseWizardHeaderProps {
  title: string;
  description: string;
}

export function CourseWizardHeader({ title, description }: CourseWizardHeaderProps) {
  return (
    <DialogHeader className="border-b px-6 py-4">
      <DialogTitle className="flex items-center gap-2 text-2xl">
        <BookOpen className="h-5 w-5 text-primary" />
        {title}
      </DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

export default CourseWizardHeader;
