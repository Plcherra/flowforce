export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Onboarding: "learning.categoryOnboarding",
  Compliance: "learning.categoryCompliance",
  Leadership: "learning.categoryLeadership",
  Operations: "learning.categoryOperations",
  "Customer Experience": "learning.categoryCustomerExperience",
  Safety: "learning.categorySafety",
  Technology: "learning.categoryTechnology",
  "Product Knowledge": "learning.categoryProductKnowledge",
};

export const ROLE_LABEL_KEYS: Record<string, string> = {
  staff: "learning.roleStaff",
  barista: "learning.roleBarista",
  supervisor: "learning.roleSupervisor",
  manager: "learning.roleManager",
  company_admin: "learning.roleCompanyAdmin",
  owner: "learning.roleOwner",
};

export const MODULE_TYPE_LABEL_KEYS: Record<string, string> = {
  "Text Instruction": "learning.moduleTextInstruction",
  "Image Upload": "learning.moduleImageUpload",
  "Video Upload": "learning.moduleVideoUpload",
  "Task Checklist": "learning.moduleTaskChecklist",
  "Yes/No Question": "learning.moduleYesNoQuestion",
  "Short Answer": "learning.moduleShortAnswer",
  "Signature Field": "learning.moduleSignatureField",
  Rating: "learning.moduleRating",
  "File Upload": "learning.moduleFileUpload",
};

export const DELIVERY_LABEL_KEYS: Record<string, string> = {
  self_paced: "learning.selfPaced",
  live: "learning.liveCohort",
  blended: "learning.blended",
};

export function learningLabel(
  translate: (key: string) => string,
  map: Record<string, string>,
  value: string,
) {
  const key = map[value];
  return key ? translate(key) : value;
}
