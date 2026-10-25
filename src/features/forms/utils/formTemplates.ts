import type { FormFieldRow } from "@/features/forms/hooks/useForms";

export type TemplateField = Omit<
  FormFieldRow,
  "id" | "form_id" | "created_at" | "updated_at"
>;

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  popular?: boolean;
  fields: TemplateField[];
}

function field(
  input: Pick<TemplateField, "field_type" | "label"> & Partial<TemplateField>,
): TemplateField {
  return {
    field_order: null,
    placeholder: null,
    description: null,
    is_required: false,
    options: null,
    validation_rules: null,
    min_value: null,
    max_value: null,
    step_value: null,
    formula_expression: null,
    dependent_fields: null,
    rating_config: null,
    scan_config: null,
    media_config: null,
    ...input,
  };
}

export const formTemplates: FormTemplate[] = [
  {
    id: "employee-feedback",
    name: "Employee Feedback",
    description: "Collect feedback from employees about workplace satisfaction",
    category: "HR",
    popular: true,
    fields: [
      field({ field_type: "text", label: "Your name", placeholder: "Name" }),
      field({ field_type: "text", label: "Team", placeholder: "Kitchen, floor, bar" }),
      field({
        field_type: "select",
        label: "How satisfied are you",
        is_required: true,
        options: ["Very satisfied", "Somewhat satisfied", "Not satisfied"],
      }),
      field({ field_type: "textarea", label: "What is working", is_required: true }),
      field({ field_type: "textarea", label: "What should change" }),
      field({ field_type: "yes_no", label: "Would you recommend working here" }),
    ],
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Register attendees for company events",
    category: "Events",
    fields: [
      field({ field_type: "text", label: "Full name", is_required: true, placeholder: "Name" }),
      field({ field_type: "email", label: "Email", is_required: true, placeholder: "name@company.com" }),
      field({ field_type: "text", label: "Event", is_required: true, placeholder: "Event name" }),
      field({ field_type: "number", label: "Number of guests", min_value: 0, step_value: 1 }),
      field({ field_type: "textarea", label: "Dietary notes" }),
      field({ field_type: "yes_no", label: "Attending", is_required: true }),
    ],
  },
  {
    id: "incident-report",
    name: "Incident Report",
    description: "Report workplace incidents and safety concerns",
    category: "Safety",
    popular: true,
    fields: [
      field({ field_type: "textarea", label: "What happened", is_required: true }),
      field({ field_type: "datetime", label: "When", is_required: true }),
      field({ field_type: "text", label: "Where", placeholder: "Station or area" }),
      field({ field_type: "text", label: "Who was involved" }),
      field({ field_type: "yes_no", label: "Was anyone injured", is_required: true }),
      field({ field_type: "textarea", label: "Immediate action" }),
    ],
  },
  {
    id: "leave-request",
    name: "Leave Request",
    description: "Submit time off and leave requests",
    category: "HR",
    fields: [
      field({
        field_type: "select",
        label: "Leave type",
        is_required: true,
        options: ["Vacation", "Sick", "Personal"],
      }),
      field({ field_type: "date", label: "Start date", is_required: true }),
      field({ field_type: "date", label: "End date", is_required: true }),
      field({ field_type: "textarea", label: "Reason" }),
      field({ field_type: "text", label: "Contact while away" }),
    ],
  },
  {
    id: "customer-survey",
    name: "Customer Survey",
    description: "Gather customer feedback and satisfaction ratings",
    category: "Customer",
    fields: [
      field({ field_type: "date", label: "Visit date" }),
      field({
        field_type: "rating",
        label: "Overall rating",
        is_required: true,
        rating_config: { max_rating: 5, rating_type: "stars" },
      }),
      field({
        field_type: "select",
        label: "Food",
        options: ["Excellent", "Good", "Fair", "Poor"],
      }),
      field({
        field_type: "select",
        label: "Service",
        options: ["Excellent", "Good", "Fair", "Poor"],
      }),
      field({ field_type: "textarea", label: "Comments" }),
    ],
  },
  {
    id: "training-evaluation",
    name: "Training Evaluation",
    description: "Evaluate training effectiveness and gather feedback",
    category: "Training",
    fields: [
      field({ field_type: "text", label: "Session name", is_required: true }),
      field({ field_type: "text", label: "Trainer" }),
      field({
        field_type: "rating",
        label: "Usefulness",
        rating_config: { max_rating: 5, rating_type: "stars" },
      }),
      field({ field_type: "textarea", label: "What you learned" }),
      field({ field_type: "textarea", label: "Suggestions" }),
    ],
  },
  {
    id: "restaurant-opening-checklist",
    name: "Restaurant Opening Checklist",
    description: "Prep the store, stations, safety checks, and manager signoff before service.",
    category: "Restaurant",
    popular: true,
    fields: [
      field({ field_type: "text", label: "Opening manager", is_required: true, placeholder: "Name" }),
      field({
        field_type: "checkbox",
        label: "Stations ready",
        is_required: true,
        options: ["Line", "Expo", "Dish", "Prep", "Register"],
      }),
      field({ field_type: "location", label: "Store location confirmation" }),
      field({ field_type: "signature", label: "Manager signoff", is_required: true }),
    ],
  },
  {
    id: "food-safety-temperature-log",
    name: "Food Safety Temperature Log",
    description: "Capture cold holding, hot holding, corrective action, and evidence photos.",
    category: "Restaurant",
    fields: [
      field({
        field_type: "text",
        label: "Station or unit",
        is_required: true,
        placeholder: "Walk-in, hot well, prep table",
      }),
      field({
        field_type: "number",
        label: "Temperature",
        is_required: true,
        placeholder: "Degrees",
        min_value: -20,
        max_value: 250,
        step_value: 0.1,
      }),
      field({
        field_type: "image_upload",
        label: "Evidence photo",
        media_config: { accepted_types: ["image/*"], max_files: 3, max_size: 10 },
      }),
      field({
        field_type: "textarea",
        label: "Corrective action",
        placeholder: "What changed if temperature was out of range?",
      }),
    ],
  },
  {
    id: "retail-inventory-count",
    name: "Retail Inventory Count",
    description: "Scan items, count shelf/backroom stock, rate shelf condition, and attach photos.",
    category: "Retail",
    fields: [
      field({
        field_type: "scanner",
        label: "SKU or barcode",
        is_required: true,
        scan_config: { scan_types: ["barcode", "qr_code"], auto_submit: false },
      }),
      field({
        field_type: "number",
        label: "On-hand count",
        is_required: true,
        placeholder: "Units",
        min_value: 0,
        step_value: 1,
      }),
      field({
        field_type: "rating",
        label: "Shelf condition",
        rating_config: { max_rating: 5, rating_type: "stars" },
      }),
      field({
        field_type: "image_upload",
        label: "Shelf photo",
        media_config: { accepted_types: ["image/*"], max_files: 4, max_size: 10 },
      }),
    ],
  },
];
