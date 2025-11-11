import { scheduleMeeting, createVendorVisit } from "@/shared/api/scheduleClient";

async function runTests() {
  console.log(
    await scheduleMeeting({
      company_id: "demo",
      title: "Codex test meeting",
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
    }),
  );

  console.log(
    await createVendorVisit({
      company_id: "demo",
      vendor_name: "Ecolab",
      service_type: "maintenance",
      start: new Date().toISOString(),
      end: new Date(Date.now() + 7200000).toISOString(),
    }),
  );
}

runTests().catch((err) => {
  console.error("Test harness failed", err);
  process.exit(1);
});
