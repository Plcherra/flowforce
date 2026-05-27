#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();

function readEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(cwd, fileName);
    if (!existsSync(filePath)) continue;

    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      let value = rawValueParts.join("=").trim();
      value = value.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function requireEnv(name, fallbackName) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(`Missing ${name}${fallbackName ? `/${fallbackName}` : ""}`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function countRows(admin, table, filterColumn, filterValue) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(filterColumn, filterValue);

  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function main() {
  readEnvFiles();

  const baseUrl = process.env.ONBOARDING_E2E_BASE_URL ?? "http://127.0.0.1:3000";
  const supabaseUrl = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `onboarding-e2e-${runId}@example.test`;
  const password = `FlowForce-${runId}!`;
  const companyName = `Onboarding E2E ${runId}`;
  const retryCompanyName = `${companyName} Retry`;

  let userId = null;
  let companyId = null;

  try {
    const { data: authData, error: signUpError } = await publicClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: "E2E",
          last_name: "Owner",
        },
      },
    });

    if (signUpError) throw new Error(`Signup failed: ${signUpError.message}`);
    userId = authData.user?.id ?? null;
    assert(userId, "Signup did not return a user id");

    const payload = {
      userId,
      userInfo: {
        firstName: "E2E",
        lastName: "Owner",
        email,
        password,
        phone: "+15555550199",
      },
      companyInfo: {
        name: companyName,
        industry: "Technology",
        size: "1-10 employees",
        description: "Automated onboarding verification tenant",
        website: "https://example.test",
        phone: "+15555550100",
      },
      branding: {
        logo: null,
        primaryColor: "#2563eb",
        secondaryColor: "#111827",
      },
      template: {
        id: "e2e-template",
        name: "E2E Template",
        industry: "Technology",
        defaultRoles: ["Owner", "Employee"],
        customFields: {},
        suggestedPositions: {},
      },
      enabledSections: ["dashboard", "employees"],
      customRoles: [
        {
          id: "e2e-manager",
          name: "E2E Manager",
          description: "E2E custom role",
          color: "#16a34a",
          icon: "Users",
          hierarchy_level: 3,
          permissions: { manageTeam: true },
          is_system_role: false,
        },
      ],
      positions: [
        {
          id: "e2e-lead",
          name: "E2E Lead",
          description: "E2E custom position",
          roleId: "e2e-manager",
          permissions: { manageTeam: true },
        },
      ],
    };

    const firstResponse = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const firstResult = await firstResponse.json().catch(() => ({}));
    assert(
      firstResponse.ok,
      `Onboarding API failed: ${firstResponse.status} ${JSON.stringify(firstResult)}`,
    );
    companyId = firstResult.companyId ?? null;
    assert(companyId, "Onboarding API did not return companyId");
    assert(firstResult.setup?.ok === true, "Onboarding API setup verification did not pass");

    await admin.from("audit_log").delete().eq("company_id", companyId);
    await admin.from("company_members").delete().eq("company_id", companyId);
    await admin.from("company_roles").delete().eq("company_id", companyId);
    await admin.from("system_settings").delete().eq("company_id", companyId);

    const retryResponse = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        companyInfo: {
          ...payload.companyInfo,
          name: retryCompanyName,
        },
      }),
    });
    const retryResult = await retryResponse.json().catch(() => ({}));
    assert(
      retryResponse.ok,
      `Onboarding retry failed: ${retryResponse.status} ${JSON.stringify(retryResult)}`,
    );
    assert(retryResult.companyId === companyId, "Onboarding retry created a different company");
    assert(retryResult.setup?.ok === true, "Onboarding retry did not repair setup baseline");

    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, name, registration_complete, owner_id")
      .eq("id", companyId)
      .single();
    if (companyError) throw new Error(`Company read failed: ${companyError.message}`);
    assert(company.name === retryCompanyName, "Retry did not repair company payload");
    assert(company.registration_complete === true, "Company is not marked registration_complete");
    assert(company.owner_id === userId, "Company owner_id does not match signup user");

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, company_id, first_name, last_name, email, role, is_company_admin")
      .eq("id", userId)
      .single();
    if (profileError) throw new Error(`Profile read failed: ${profileError.message}`);
    assert(profile.company_id === companyId, "Profile company_id does not match company");
    assert(profile.first_name === "E2E", "Profile first_name was not written");
    assert(profile.last_name === "Owner", "Profile last_name was not written");
    assert(profile.email === email, "Profile email was not written");
    assert(profile.role === "owner", "Profile role is not owner");
    assert(profile.is_company_admin === true, "Profile is not company admin");

    assert(
      (await countRows(admin, "company_members", "company_id", companyId)) === 1,
      "Expected exactly one company_members row",
    );
    assert(
      (await countRows(admin, "system_settings", "company_id", companyId)) === 1,
      "Expected exactly one system_settings row",
    );
    assert(
      (await countRows(admin, "companies", "owner_id", userId)) === 1,
      "Expected exactly one company for owner after retry",
    );

    const roleCount = await countRows(admin, "company_roles", "company_id", companyId);
    assert(roleCount >= 5, `Expected default roles plus custom role, got ${roleCount}`);
    assert(
      (await countRows(admin, "audit_log", "company_id", companyId)) >= 1,
      "Expected at least one onboarding setup audit event",
    );

    process.stdout.write(
      `OK onboarding E2E completed and retried idempotently for ${companyId}\n`,
    );
  } finally {
    if (companyId) {
      await admin.from("audit_log").delete().eq("company_id", companyId);
      await admin.from("positions").delete().eq("company_id", companyId);
      await admin.from("company_roles").delete().eq("company_id", companyId);
      await admin.from("system_settings").delete().eq("company_id", companyId);
      await admin.from("company_members").delete().eq("company_id", companyId);
      await admin.from("profiles").delete().eq("company_id", companyId);
      await admin.from("companies").delete().eq("id", companyId);
    }

    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
