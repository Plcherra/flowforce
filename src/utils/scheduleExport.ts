import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface ExportData {
  employee: string;
  role: string;
  day: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export const exportScheduleAsCSV = (
  scheduleData: ExportData[],
  weekDate: Date,
) => {
  const weekStart = startOfWeek(weekDate);
  const weekEnd = endOfWeek(weekDate);
  const fileName = `schedule-${format(weekStart, "yyyy-MM-dd")}-to-${format(weekEnd, "yyyy-MM-dd")}.csv`;

  const headers = [
    "Employee",
    "Role",
    "Day",
    "Start Time",
    "End Time",
    "Hours",
  ];
  const csvContent = [
    headers.join(","),
    ...scheduleData.map(
      (row) =>
        `"${row.employee}","${row.role}","${row.day}","${row.startTime}","${row.endTime}",${row.hours}`,
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateWhatsAppMessage = (
  scheduleData: ExportData[],
  weekDate: Date,
) => {
  const weekStart = startOfWeek(weekDate);
  const weekEnd = endOfWeek(weekDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  let message = `📅 *Schedule for ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}*\n\n`;

  weekDays.forEach((day) => {
    const dayName = format(day, "EEEE");
    const dayShifts = scheduleData.filter((shift) => shift.day === dayName);

    if (dayShifts.length > 0) {
      message += `*${dayName} ${format(day, "MMM d")}*\n`;
      dayShifts.forEach((shift) => {
        message += `• ${shift.employee} (${shift.role}): ${shift.startTime}-${shift.endTime}\n`;
      });
      message += "\n";
    }
  });

  message +=
    "📝 Please confirm your shifts and report any conflicts immediately.";

  return encodeURIComponent(message);
};

export const exportScheduleAsPDF = async (
  scheduleData: ExportData[],
  weekDate: Date,
) => {
  // This would integrate with a PDF library like jsPDF
  // For now, we'll create a printable HTML version
  const weekStart = startOfWeek(weekDate);
  const weekEnd = endOfWeek(weekDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Weekly Schedule ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .day-section { margin-bottom: 20px; page-break-inside: avoid; }
        .day-title { background-color: #f0f0f0; padding: 10px; font-weight: bold; }
        .shift { padding: 5px 10px; border-left: 3px solid #007bff; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Weekly Schedule</h1>
        <h2>${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}</h2>
      </div>
      
      ${weekDays
        .map((day) => {
          const dayName = format(day, "EEEE");
          const dayShifts = scheduleData.filter(
            (shift) => shift.day === dayName,
          );

          if (dayShifts.length === 0) return "";

          return `
          <div class="day-section">
            <div class="day-title">${dayName} ${format(day, "MMM d")}</div>
            ${dayShifts
              .map(
                (shift) => `
              <div class="shift">
                <strong>${shift.employee}</strong> (${shift.role}) - ${shift.startTime} to ${shift.endTime} (${shift.hours}h)
              </div>
            `,
              )
              .join("")}
          </div>
        `;
        })
        .join("")}
      
      <button class="no-print" onclick="window.print()" 
              style="margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: white; border: none; cursor: pointer;">
        Print Schedule
      </button>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
