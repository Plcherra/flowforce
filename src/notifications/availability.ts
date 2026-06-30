import dayjs from "dayjs";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

const sendEmail = async (to: string[], subject: string, body: string) => {  logger.info("[notify][email]", {
    context: { to, subject, body },
    tags: ["info"],
  });
};

const sendInAppNotification = async (userIds: string[], message: string) => {
  logger.info("[notify][in-app]", {
    context: { userIds, message },
    tags: ["info"],
  });
};

const fetchRequestWithEmployee = async (requestId: string) => {
  const { data: request, error } = await supabase
    .from("availability_request")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !request) {
    throw error ?? new Error("Request not found");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", request.employee_id)
    .maybeSingle();

  if (employeeError || !employee) {
    throw employeeError ?? new Error("Employee profile not found");
  }

  return { request, employee };
};

export async function notifyManagersNewRequest(
  requestId: string,
): Promise<void> {
  try {
    const { request, employee } = await fetchRequestWithEmployee(requestId);

    const { data: managers, error: managersError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, is_company_admin")
      .in("role", ["manager", "admin"]);

    if (managersError) throw managersError;

    const managerList = (managers ?? []).filter((profile) => profile.email);
    if (managerList.length === 0) return;

    const subject = `Availability request from ${employee.first_name} ${employee.last_name}`;
    const requestedWeek = dayjs(request.week_start).format("MMM D, YYYY");
    const body = `Employee ${employee.first_name} ${employee.last_name} submitted an availability change request for the week of ${requestedWeek}. Please review in the manager portal.`;

    await sendEmail(
      managerList.map((profile) => profile.email),
      subject,
      body,
    );
    await sendInAppNotification(
      managerList.map((profile) => profile.id),
      `${employee.first_name} ${employee.last_name} submitted an availability request (week of ${requestedWeek}).`,
    );
  } catch (error) {
    logger.error("[notifyManagersNewRequest] Failed", {
      error,
      tags: ["error"],
    });
  }
}

export async function notifyEmployeeDecision(requestId: string): Promise<void> {
  try {
    const { request, employee } = await fetchRequestWithEmployee(requestId);

    const status = request.status as "pending" | "approved" | "denied";
    const subject = `Your availability request has been ${status}`;
    const decisionDetail =
      status === "approved"
        ? "approved"
        : status === "denied"
          ? "denied"
          : "updated";

    const body = `Your availability request for the week of ${dayjs(
      request.week_start,
    ).format("MMM D, YYYY")} has been ${decisionDetail}.`;

    await sendEmail([employee.email], subject, body);
    await sendInAppNotification(
      [employee.id],
      `Your availability request for ${dayjs(request.week_start).format("MMM D")} was ${decisionDetail}.`,
    );
  } catch (error) {
    logger.error("[notifyEmployeeDecision] Failed", { error, tags: ["error"] });
  }
}

export default {
  notifyManagersNewRequest,
  notifyEmployeeDecision,
};
