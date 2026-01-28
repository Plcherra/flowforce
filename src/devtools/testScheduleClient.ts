import { scheduleGateway } from "@/lib/api/scheduleGateway";

async function runTests() {
  console.log(
    await scheduleGateway.createEvent({
      company_id: "demo",
      title: "Codex test meeting",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3_600_000).toISOString(),
      event_type: "meeting",
      description: "Local harness test",
      location: "HQ",
    }),
  );

  console.log(
    await scheduleGateway.createVendorVisit({
      calendar: {
        company_id: "demo",
        title: "Vendor Visit",
        event_type: "vendor_visit",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7_200_000).toISOString(),
      },
      vendor: {
        company_id: "demo",
        vendor_name: "Ecolab",
        service_type: "maintenance",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7_200_000).toISOString(),
      },
    }),
  );
}

runTests().catch((err) => {
  console.error("Test harness failed", err);
  process.exit(1);
});
