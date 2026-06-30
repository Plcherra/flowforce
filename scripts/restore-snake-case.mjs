import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RESTORES = [
  ["companyid", "company_id"],
  ["goalid", "goal_id"],
  ["sectionid", "section_id"],
  ["userid", "user_id"],
  ["eventid", "event_id"],
  ["profileid", "profile_id"],
  ["storeid", "store_id"],
  ["taskid", "task_id"],
  ["roleid", "role_id"],
  ["formid", "form_id"],
  ["shiftid", "shift_id"],
  ["employeeid", "employee_id"],
  ["scheduleid", "schedule_id"],
  ["positionid", "position_id"],
  ["templateid", "template_id"],
  ["vendorid", "vendor_id"],
  ["locationid", "location_id"],
  ["channelid", "channel_id"],
  ["messageid", "message_id"],
  ["enrollmentid", "enrollment_id"],
  ["courseid", "course_id"],
  ["moduleid", "module_id"],
  ["organizationid", "organization_id"],
  ["orgid", "org_id"],
  ["inviteid", "invite_id"],
  ["managerid", "manager_id"],
  ["assigneeid", "assignee_id"],
  ["creatorid", "creator_id"],
  ["authorid", "author_id"],
  ["parentid", "parent_id"],
  ["resourceid", "resource_id"],
  ["invoiceid", "invoice_id"],
  ["supplierid", "supplier_id"],
  ["itemid", "item_id"],
  ["orderid", "order_id"],
  ["weekid", "week_id"],
  ["teamid", "team_id"],
  ["captionlabel", "caption_label"],
  ["starttime", "start_time"],
  ["endtime", "end_time"],
  ["createdat", "created_at"],
  ["updatedat", "updated_at"],
  ["deletedat", "deleted_at"],
  ["publishedat", "published_at"],
  ["completedat", "completed_at"],
  ["submittedat", "submitted_at"],
  ["approvedat", "approved_at"],
  ["expiresat", "expires_at"],
  ["invitedat", "invited_at"],
  ["acceptedat", "accepted_at"],
  ["firstname", "first_name"],
  ["lastname", "last_name"],
  ["isactive", "is_active"],
  ["isadmin", "is_admin"],
  ["sortorder", "sort_order"],
  ["displayname", "display_name"],
  ["avatarurl", "avatar_url"],
  ["employmentstatus", "employment_status"],
  ["newvalue", "new_value"],
  ["oldvalue", "old_value"],
  ["breakminutes", "break_minutes"],
  ["hourlyrate", "hourly_rate"],
  ["requiredheadcount", "required_headcount"],
  ["isallday", "is_all_day"],
  ["ispublished", "is_published"],
  ["istemplate", "is_template"],
  ["componentid", "component_id"],
  ["defaultpages", "default_pages"],
  ["customsectionpages", "custom_section_pages"],
  ["invitetoken", "invite_token"],
  ["invitedby", "invited_by"],
  ["accountid", "account_id"],
  ["apikey", "api_key"],
  ["referenceid", "reference_id"],
  ["referencenumber", "reference_number"],
  ["paymentmethod", "payment_method"],
  ["duedate", "due_date"],
  ["unitprice", "unit_price"],
  ["onhandquantity", "on_hand_quantity"],
  ["parlevel", "par_level"],
  ["netsales", "net_sales"],
  ["insightdate", "insight_date"],
  ["periodstart", "period_start"],
  ["periodend", "period_end"],
  ["recognitioncount", "recognition_count"],
  ["checklistcompletions", "checklist_completions"],
  ["punctualityscore", "punctuality_score"],
  ["engagementscore", "engagement_score"],
  ["calculatedat", "calculated_at"],
  ["collectedat", "collected_at"],
  ["totalshiftsworked", "total_shifts_worked"],
  ["opentasks", "open_tasks"],
  ["schedulechanges", "schedule_changes"],
  ["generatedby", "generated_by"],
  ["kpikey", "kpi_key"],
  ["issuetype", "issue_type"],
  ["relatedshiftids", "related_shift_ids"],
  ["eventtype", "event_type"],
  ["responstatus", "response_status"],
  ["responsetatus", "response_status"],
  ["linkedat", "linked_at"],
  ["weekstart", "week_start"],
  ["adminconfig", "admin_config"],
  ["aicopilot", "ai_copilot"],
  ["restrictedmodules", "restricted_modules"],
  ["automationlevel", "automation_level"],
  ["lastauditat", "last_audit_at"],
  ["datakey", "data_key"],
  ["rewardtype", "reward_type"],
  ["awardedat", "awarded_at"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "dist", "android", "ios"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?|sql|mjs)$/.test(entry)) files.push(path);
  }
  return files;
}

let touched = 0;
for (const file of walk(".")) {
  if (file.includes("restore-snake-case")) continue;
  let source = readFileSync(file, "utf8");
  let next = source;
  for (const [from, to] of RESTORES) {
    next = next.replaceAll(from, to);
  }
  if (next !== source) {
    writeFileSync(file, next, "utf8");
    touched++;
  }
}

console.log(`Restored snake_case in ${touched} files`);
