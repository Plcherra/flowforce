#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js"; // pragma: allowlist secret

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // pragma: allowlist secret
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // pragma: allowlist secret

if (!supabaseUrl || !serviceRoleKey) { // pragma: allowlist secret
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"); // pragma: allowlist secret
}

const host = new URL(supabaseUrl).hostname; // pragma: allowlist secret
if (host !== "127.0.0.1" && host !== "localhost") {
  throw new Error(`Refusing to seed a non-local Supabase project at ${host}`); // pragma: allowlist secret
}

const admin = createClient(supabaseUrl, serviceRoleKey, { // pragma: allowlist secret
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const companyId = randomUUID();
const userId = randomUUID();
const roleId = randomUUID();
const email = `playwright-${runId}@example.test`;
const password = `FlowForce-${runId}!`;

const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
  id: userId,
  email,
  password,
  email_confirm: true,
  user_metadata: {
    first_name: "Playwright",
    last_name: "Owner",
    company_id: companyId,
    active_company_id: companyId,
  },
  app_metadata: {
    company_id: companyId,
    active_company_id: companyId,
  },
});

if (createUserError) {
  throw new Error(`Playwright auth user seed failed: ${createUserError.message}`);
}

const authUserId = createdUser.user?.id ?? userId;

async function insert(table, rows) {
  const { error } = await admin.from(table).insert(rows);
  if (error) throw new Error(`${table} seed failed: ${error.message}`);
}

await insert("companies", [
  {
    id: companyId,
    name: `Playwright ${runId}`,
    slug: `playwright-${runId}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
    created_by: authUserId,
    owner_id: authUserId,
    registration_complete: true,
    enabled_sections: ["dashboard", "employees", "tasks", "forms", "settings"],
  },
]);

await insert("company_roles", [
  {
    id: roleId,
    company_id: companyId,
    name: "Owner",
    description: "Playwright owner role",
    hierarchy_level: 1,
    permissions: { all: true },
    is_system_role: true,
    is_active: true,
    created_by: authUserId,
  },
]);

await insert("profiles", [
  {
    id: authUserId,
    company_id: companyId,
    first_name: "Playwright",
    last_name: "Owner",
    email,
    role: "owner",
    role_id: roleId,
    is_company_admin: true,
    employment_status: "active",
  },
]);

await insert("company_members", [
  {
    company_id: companyId,
    user_id: authUserId,
    role: "owner",
    added_at: new Date().toISOString(),
  },
]);

await insert("system_settings", [
  {
    company_id: companyId,
    admin_config: {
      packFlags: { team: true, insights: true, stock: true },
    },
  },
]);

process.stdout.write(
  [
    `TEST_USER_EMAIL=${email}`,
    `TEST_USER_PASSWORD=${password}`,
    `E2E_EMAIL=${email}`,
    `E2E_PASSWORD=${password}`,
    "",
  ].join("\n"),
);
