import { formTemplates } from "@/features/forms/utils/formTemplates";

/** English template copy -> locale key. Stored forms use the viewer's language at create time. */
const TEMPLATE_COPY_KEYS: Record<string, string> = {
  "Employee Feedback": "forms.tplEmployeeFeedback",
  "Collect feedback from employees about workplace satisfaction": "forms.tplEmployeeFeedbackHelp",
  "Your name": "forms.tplYourName",
  Name: "forms.tplName",
  Team: "forms.tplTeam",
  "Kitchen, floor, bar": "forms.tplTeamHint",
  "How satisfied are you": "forms.tplSatisfaction",
  "Very satisfied": "forms.tplVerySatisfied",
  "Somewhat satisfied": "forms.tplSomewhatSatisfied",
  "Not satisfied": "forms.tplNotSatisfied",
  "What is working": "forms.tplWhatIsWorking",
  "What should change": "forms.tplWhatShouldChange",
  "Would you recommend working here": "forms.tplRecommend",
  "Event Registration": "forms.tplEventRegistration",
  "Register attendees for company events": "forms.tplEventRegistrationHelp",
  "Full name": "forms.tplFullName",
  Email: "forms.tplEmail",
  "name@company.com": "forms.tplEmailHint",
  Event: "forms.tplEvent",
  "Event name": "forms.tplEventName",
  "Number of guests": "forms.tplGuests",
  "Dietary notes": "forms.tplDietary",
  Attending: "forms.tplAttending",
  "Incident Report": "forms.tplIncidentReport",
  "Report workplace incidents and safety concerns": "forms.tplIncidentReportHelp",
  "What happened": "forms.tplWhatHappened",
  When: "forms.tplWhen",
  Where: "forms.tplWhere",
  "Station or area": "forms.tplStationOrArea",
  "Who was involved": "forms.tplWhoWasInvolved",
  "Was anyone injured": "forms.tplInjured",
  "Immediate action": "forms.tplImmediateAction",
  "Leave Request": "forms.tplLeaveRequest",
  "Submit time off and leave requests": "forms.tplLeaveRequestHelp",
  "Leave type": "forms.tplLeaveType",
  Vacation: "forms.tplVacation",
  Sick: "forms.tplSick",
  Personal: "forms.tplPersonal",
  "Start date": "forms.tplStartDate",
  "End date": "forms.tplEndDate",
  Reason: "forms.tplReason",
  "Contact while away": "forms.tplContactWhileAway",
  "Customer Survey": "forms.tplCustomerSurvey",
  "Gather customer feedback and satisfaction ratings": "forms.tplCustomerSurveyHelp",
  "Visit date": "forms.tplVisitDate",
  "Overall rating": "forms.tplOverallRating",
  Food: "forms.tplFood",
  Excellent: "forms.tplExcellent",
  Good: "forms.tplGood",
  Fair: "forms.tplFair",
  Poor: "forms.tplPoor",
  Service: "forms.tplService",
  Comments: "forms.tplComments",
  "Training Evaluation": "forms.tplTrainingEvaluation",
  "Evaluate training effectiveness and gather feedback": "forms.tplTrainingEvaluationHelp",
  "Session name": "forms.tplSessionName",
  Trainer: "forms.tplTrainer",
  Usefulness: "forms.tplUsefulness",
  "What you learned": "forms.tplWhatYouLearned",
  Suggestions: "forms.tplSuggestions",
  "Restaurant Opening Checklist": "forms.tplOpeningChecklist",
  "Prep the store, stations, safety checks, and manager signoff before service.":
    "forms.tplOpeningChecklistHelp",
  "Opening manager": "forms.tplOpeningManager",
  "Stations ready": "forms.tplStationsReady",
  Line: "forms.tplLine",
  Expo: "forms.tplExpo",
  Dish: "forms.tplDish",
  Prep: "forms.tplPrep",
  Register: "forms.tplRegister",
  "Store location confirmation": "forms.tplStoreLocation",
  "Manager signoff": "forms.tplManagerSignoff",
  "Food Safety Temperature Log": "forms.tplTemperatureLog",
  "Capture cold holding, hot holding, corrective action, and evidence photos.":
    "forms.tplTemperatureLogHelp",
  "Station or unit": "forms.tplStationOrUnit",
  "Walk-in, hot well, prep table": "forms.tplStationHint",
  Temperature: "forms.tplTemperature",
  Degrees: "forms.tplDegrees",
  "Evidence photo": "forms.tplEvidencePhoto",
  "Corrective action": "forms.tplCorrectiveAction",
  "What changed if temperature was out of range?": "forms.tplCorrectiveHint",
  "Retail Inventory Count": "forms.tplInventoryCount",
  "Scan items, count shelf/backroom stock, rate shelf condition, and attach photos.":
    "forms.tplInventoryCountHelp",
  "SKU or barcode": "forms.tplSku",
  "On-hand count": "forms.tplOnHand",
  Units: "forms.tplUnits",
  "Shelf condition": "forms.tplShelfCondition",
  "Shelf photo": "forms.tplShelfPhoto",
};

export function templateCopyKey(text: string): string | null {
  return TEMPLATE_COPY_KEYS[text] ?? null;
}

export function translateTemplateCopy(
  text: string,
  translate: (key: string) => string,
): string {
  const key = templateCopyKey(text);
  return key ? translate(key) : text;
}

export function templateSourceStrings(): string[] {
  const values = new Set<string>();
  for (const template of formTemplates) {
    values.add(template.name);
    values.add(template.description);
    for (const field of template.fields) {
      if (field.label) values.add(field.label);
      if (field.placeholder) values.add(field.placeholder);
      if (Array.isArray(field.options)) {
        for (const option of field.options) {
          if (typeof option === "string") values.add(option);
        }
      }
    }
  }
  return [...values];
}
