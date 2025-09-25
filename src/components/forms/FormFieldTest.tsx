import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// Import all field components for testing
import { DescriptionField } from './fields/DescriptionField';
import { FormulaField } from './fields/FormulaField';
import { NumberSliderField } from './fields/NumberSliderField';
import { YesNoField } from './fields/YesNoField';
import { LocationField } from './fields/LocationField';
import { ImageUploadField } from './fields/ImageUploadField';
import { VideoUploadField } from './fields/VideoUploadField';
import { AudioRecordingField } from './fields/AudioRecordingField';
import { FileUploadField } from './fields/FileUploadField';
import { SignatureField } from './fields/SignatureField';
import { RatingField } from './fields/RatingField';
import { ScannerField } from './fields/ScannerField';
import { TaskField } from './fields/TaskField';
import { ImageSelectionField } from './fields/ImageSelectionField';

interface FormFieldTestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FormFieldTest({ open, onOpenChange }: FormFieldTestProps) {
  const [testData, setTestData] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    setTestData(prev => ({ ...prev, [fieldId]: value }));
    logger.debug(`Field ${fieldId} changed:`, value);
  };

  const fieldCategories = [
    {
      title: 'Basic Fields',
      fields: [
        {
          id: 'description',
          component: (
            <DescriptionField
              label="Description Field"
              description="This is a description field that displays static content"
              content="This field is used to display information to users without requiring input."
            />
          )
        },
        {
          id: 'formula',
          component: (
            <FormulaField
              label="Formula Field"
              description="Calculates values based on other fields"
              formula="quantity * price"
              formData={{ quantity: 5, price: 10 }}
              onChange={(value) => handleFieldChange('formula', value)}
            />
          )
        },
        {
          id: 'number_slider',
          component: (
            <NumberSliderField
              label="Number Slider"
              description="Select a number using a slider"
              value={testData.number_slider || 50}
              min={0}
              max={100}
              step={1}
              onChange={(value) => handleFieldChange('number_slider', value)}
              showInput={true}
              showLabels={true}
            />
          )
        },
        {
          id: 'yes_no',
          component: (
            <YesNoField
              label="Yes/No Field"
              description="Choose between Yes or No"
              value={testData.yes_no}
              onChange={(value) => handleFieldChange('yes_no', value)}
              variant="buttons"
            />
          )
        }
      ]
    },
    {
      title: 'Location Fields',
      fields: [
        {
          id: 'location',
          component: (
            <LocationField
              label="Location Field"
              description="Capture GPS location"
              value={testData.location}
              onChange={(value) => handleFieldChange('location', value)}
            />
          )
        }
      ]
    },
    {
      title: 'Media Fields',
      fields: [
        {
          id: 'image_upload',
          component: (
            <ImageUploadField
              label="Image Upload"
              description="Upload images"
              value={testData.image_upload || []}
              onChange={(value) => handleFieldChange('image_upload', value)}
              maxFiles={3}
              maxSize={5}
            />
          )
        },
        {
          id: 'video_upload',
          component: (
            <VideoUploadField
              label="Video Upload"
              description="Upload videos"
              value={testData.video_upload || []}
              onChange={(value) => handleFieldChange('video_upload', value)}
              maxFiles={2}
              maxSize={50}
            />
          )
        },
        {
          id: 'audio_recording',
          component: (
            <AudioRecordingField
              label="Audio Recording"
              description="Record or upload audio"
              value={testData.audio_recording || []}
              onChange={(value) => handleFieldChange('audio_recording', value)}
              maxRecordings={3}
              maxDuration={300}
            />
          )
        },
        {
          id: 'file_upload',
          component: (
            <FileUploadField
              label="File Upload"
              description="Upload any type of file"
              value={testData.file_upload || []}
              onChange={(value) => handleFieldChange('file_upload', value)}
              maxFiles={3}
              maxSize={10}
            />
          )
        }
      ]
    },
    {
      title: 'Interactive Fields',
      fields: [
        {
          id: 'signature',
          component: (
            <SignatureField
              label="Signature Field"
              description="Capture digital signature"
              value={testData.signature}
              onChange={(value) => handleFieldChange('signature', value)}
              required={false}
            />
          )
        },
        {
          id: 'rating',
          component: (
            <RatingField
              label="Rating Field"
              description="Rate from 1 to 5 stars"
              value={testData.rating}
              config={{ max_rating: 5, rating_type: 'stars' }}
              onChange={(value) => handleFieldChange('rating', value)}
            />
          )
        },
        {
          id: 'scanner',
          component: (
            <ScannerField
              label="Scanner Field"
              description="Scan barcodes or QR codes"
              value={testData.scanner}
              config={{ scan_types: ['barcode', 'qr_code'] }}
              onChange={(value) => handleFieldChange('scanner', value)}
            />
          )
        },
        {
          id: 'task',
          component: (
            <TaskField
              label="Task Field"
              description="Create and manage tasks"
              value={testData.task}
              onChange={(value) => handleFieldChange('task', value)}
            />
          )
        },
        {
          id: 'image_selection',
          component: (
            <ImageSelectionField
              label="Image Selection"
              description="Select from predefined images"
              value={testData.image_selection}
              predefinedImages={[
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1494790108755-2616b2dc1b8e?w=150&h=150&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
              ]}
              onChange={(value) => handleFieldChange('image_selection', value)}
            />
          )
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Fields Test</DialogTitle>
          <DialogDescription>
            Test all available form field types to ensure proper functionality.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="text-sm text-muted-foreground">
            This dialog demonstrates all available form field types. Test each field to ensure proper functionality.
          </div>

          {fieldCategories.map((category) => (
            <div key={category.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{category.title}</h3>
                <Badge variant="secondary">{category.fields.length} fields</Badge>
              </div>
              
              <div className="grid gap-4">
                {category.fields.map((field) => (
                  <Card key={field.id} className="p-4">
                    {field.component}
                  </Card>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Current Test Data:</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                toast({
                  title: "Test Data",
                  description: "Check console for current test data"
                });
                logger.debug('Current test data:', testData);
              }}
            >
              Log Test Data
            </Button>
            <Button
              variant="outline"
              onClick={() => setTestData({})}
            >
              Clear Data
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}