// Field type constants to ensure consistency across the app
export const FORM_FIELD_TYPES = {
  // Basic inputs
  DESCRIPTION: 'text' as const,
  FORMULA: 'formula' as const,
  DROPDOWN: 'select' as const,
  NUMBER: 'number' as const,
  OPEN_ENDED: 'textarea' as const,
  YES_NO: 'boolean' as const,
  DATE: 'date' as const,
  SLIDER: 'slider' as const,
  
  // Media & Location  
  LOCATION: 'location' as const,
  IMAGE_UPLOAD: 'image' as const,
  VIDEO_UPLOAD: 'video' as const,
  FILE_UPLOAD: 'file' as const,
  
  // Interactive
  AUDIO_RECORDING: 'audio' as const,
  TASK: 'task' as const,
  SCANNER: 'scanner' as const,
  IMAGE_SELECTION: 'image_selection' as const,
  SIGNATURE: 'signature' as const,
  RATING: 'rating' as const,
} as const;

export type FormFieldType = typeof FORM_FIELD_TYPES[keyof typeof FORM_FIELD_TYPES];

export const FIELD_TYPE_CONFIGS = [
  { value: FORM_FIELD_TYPES.DESCRIPTION, label: 'Description', icon: 'FileText', category: 'basic' },
  { value: FORM_FIELD_TYPES.FORMULA, label: 'Formula', icon: 'Calculator', category: 'basic' },
  { value: FORM_FIELD_TYPES.DROPDOWN, label: 'Dropdown', icon: 'ChevronDown', category: 'basic' },
  { value: FORM_FIELD_TYPES.NUMBER, label: 'Number', icon: 'Hash', category: 'basic' },
  { value: FORM_FIELD_TYPES.OPEN_ENDED, label: 'Open ended', icon: 'AlignLeft', category: 'basic' },
  { value: FORM_FIELD_TYPES.YES_NO, label: 'Yes/No', icon: 'CheckCircle', category: 'basic' },
  { value: FORM_FIELD_TYPES.DATE, label: 'Date', icon: 'Calendar', category: 'basic' },
  { value: FORM_FIELD_TYPES.SLIDER, label: 'Numbers slider', icon: 'Sliders', category: 'basic' },
  { value: FORM_FIELD_TYPES.LOCATION, label: 'Location', icon: 'MapPin', category: 'location' },
  { value: FORM_FIELD_TYPES.IMAGE_UPLOAD, label: 'Image upload', icon: 'ImageUp', category: 'media' },
  { value: FORM_FIELD_TYPES.AUDIO_RECORDING, label: 'Audio recording', icon: 'Mic', category: 'media' },
  { value: FORM_FIELD_TYPES.VIDEO_UPLOAD, label: 'Video upload', icon: 'Video', category: 'media' },
  { value: FORM_FIELD_TYPES.FILE_UPLOAD, label: 'File upload', icon: 'Upload', category: 'media' },
  { value: FORM_FIELD_TYPES.SCANNER, label: 'Scanner', icon: 'ScanLine', category: 'interactive' },
  { value: FORM_FIELD_TYPES.IMAGE_SELECTION, label: 'Image selection', icon: 'Image', category: 'interactive' },
  { value: FORM_FIELD_TYPES.SIGNATURE, label: 'Signature', icon: 'PenTool', category: 'interactive' },
  { value: FORM_FIELD_TYPES.RATING, label: 'Rating', icon: 'Star', category: 'interactive' },
  { value: FORM_FIELD_TYPES.TASK, label: 'Task', icon: 'CheckSquare', category: 'interactive' },
] as const;