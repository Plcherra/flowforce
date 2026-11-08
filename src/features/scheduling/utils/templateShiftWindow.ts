export function templateShiftWindow(day: Date, start: string, end: string) {
  const parts = (value: string) => {
    const [hour, minute] = value.split(":");
    return { hour: Number(hour) || 0, minute: Number(minute) || 0 };
  };
  const startParts = parts(start);
  const endParts = parts(end);
  const startTime = new Date(day);
  startTime.setHours(startParts.hour, startParts.minute, 0, 0);
  const endTime = new Date(day);
  endTime.setHours(endParts.hour, endParts.minute, 0, 0);
  if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);
  return { startTime, endTime };
}
