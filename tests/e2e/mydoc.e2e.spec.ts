import { expect, test } from "@playwright/test";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateParam(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function minutesToTimeValue(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function computeUniqueSlotTimes(
  unique: string,
  salt = 0
): { start: string; end: string } {
  const n = Number(unique.slice(-6));
  const slotIndexBase = Number.isFinite(n) ? n % 20 : 0; // 20 half-hours -> 10h window
  const slotIndex = (slotIndexBase + salt) % 20;
  const startMinutes = 8 * 60 + slotIndex * 30;
  return {
    start: minutesToTimeValue(startMinutes),
    end: minutesToTimeValue(startMinutes + 30),
  };
}

async function login(page: import("@playwright/test").Page) {
  const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "changeme";

  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Accedi" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function createCustomSlotWithRetry(addSlotDialog: import("@playwright/test").Locator, options: {
  start: string;
  end: string;
  maxAttempts?: number;
}) {
  const maxAttempts = options.maxAttempts ?? 12;
  const overlapError = addSlotDialog.getByText("Esiste già uno slot sovrapposto in questo orario");
  const times = addSlotDialog.locator('input[type="time"]');

  const parseTime = (value: string) => {
    const [hh, mm] = value.split(":").map(Number);
    return hh * 60 + mm;
  };
  const baseStartMin = parseTime(options.start);
  const baseEndMin = parseTime(options.end);
  const duration = Math.max(15, baseEndMin - baseStartMin);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startMin = baseStartMin + attempt * 30;
    const endMin = startMin + duration;
    await times.nth(0).fill(minutesToTimeValue(startMin));
    await times.nth(1).fill(minutesToTimeValue(endMin));

    await addSlotDialog
      .getByRole("button", { name: /Crea slot automatici|Crea Slot Personalizzato/i })
      .click();

    const result = await Promise.race([
      addSlotDialog.waitFor({ state: "hidden" }).then(() => "closed" as const),
      overlapError.waitFor({ state: "visible", timeout: 1500 }).then(() => "overlap" as const),
    ]).catch(() => "unknown" as const);

    if (result === "closed") return;
    if (result === "overlap") continue;

    // Unknown failure: surface any error text from the dialog.
    const errorText = await addSlotDialog.locator(".text-destructive").first().textContent().catch(() => null);
    throw new Error(`Slot creation did not complete. Last error: ${errorText ?? "(none)"}`);
  }

  throw new Error(`Unable to create a non-overlapping slot after ${maxAttempts} attempts.`);
}

async function openPatientDetailFromList(
  page: import("@playwright/test").Page,
  telefono: string
) {
  await page.getByPlaceholder("Cerca paziente...").fill(telefono);
  const patientRow = page.getByRole("row", { name: new RegExp(telefono) }).first();
  await expect(patientRow).toBeVisible({ timeout: 15_000 });

  const detailsLink = patientRow.locator('a[href^="/pazienti/"]').first();
  const href = await detailsLink.getAttribute("href");
  if (!href) {
    throw new Error(`Unable to find details link for patient with phone ${telefono}`);
  }

  // Navigation via href is more stable in CI than waiting for a click-driven route transition.
  await page.goto(href);
  await expect(page).toHaveURL(/\/pazienti\/[^/]+(?:\?.*)?$/, { timeout: 15_000 });
}

async function openAddSlotDialogFromHeader(page: import("@playwright/test").Page) {
  const addSlotButton = page
    .locator('[data-calendar-day-header] button[title="Aggiungi slot"]:visible')
    .first();
  await expect(addSlotButton).toBeVisible({ timeout: 15_000 });

  const addSlotDialog = page.getByRole("dialog").filter({
    has: page.getByRole("button", {
      name: /Crea slot automatici|Crea Slot Personalizzato/i,
    }),
  }).first();

  if (await addSlotDialog.isVisible()) {
    return addSlotDialog;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    await addSlotButton.click();
    if (await addSlotDialog.isVisible()) {
      return addSlotDialog;
    }
  }

  await expect(addSlotDialog).toBeVisible({ timeout: 15_000 });
  return addSlotDialog;
}

async function confirmAutoAssignIfPrompted(page: import("@playwright/test").Page) {
  const confirmDialog = page.getByRole("dialog", { name: /Conferma auto-assegnazione/i });
  const visible = await confirmDialog
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) return;

  await confirmDialog.getByRole("button", { name: /Accetta e prenota/i }).click();
  await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
}

async function confirmBookingIfPrompted(page: import("@playwright/test").Page) {
  const confirmDialog = page.getByRole("dialog", { name: /Confermare prenotazione/i });
  const visible = await confirmDialog
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) return;

  await confirmDialog.getByRole("button", { name: /Prenota slot/i }).click();
  await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
}

test("core flow: create patient, add waiting request, schedule next available", async ({ page }) => {
  await login(page);

  const unique = `${Date.now()}`;
  const nome = `Mario${unique}`;
  const cognome = `Rossi${unique}`;
  const telefono = `333${unique.slice(-7)}`;
  const motivo = `E2E motivo ${unique}`;

  // Create patient
  await page.getByRole("link", { name: "Pazienti", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pazienti" })).toBeVisible();

  await page.getByRole("link", { name: "Nuovo Paziente" }).click();
  await expect(page.getByRole("heading", { name: "Nuovo Paziente" })).toBeVisible();

  await page.getByLabel(/Nome/).fill(nome);
  await page.getByLabel(/Cognome/).fill(cognome);
  await page.getByLabel(/Telefono/).fill(telefono);
  await page.getByLabel(/Email/).fill(`e2e-${unique}@example.com`);

  await page.getByRole("button", { name: "Crea Paziente" }).click();
  await expect(page).toHaveURL(/\/pazienti(?:\?.*)?$/);

  // Open patient details
  await openPatientDetailFromList(page, telefono);
  await expect(page.getByRole("heading", { name: `${cognome} ${nome}` })).toBeVisible({
    timeout: 15_000,
  });

  // Add request to waiting list from patient detail page
  await page
    .getByRole("button", { name: "Aggiungi alla Lista d'Attesa" })
    .click();
  await page.getByLabel(/Motivo della visita/).fill(motivo);
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText(motivo)).toBeVisible();

  // Create at least one future slot (needed for CI where the DB starts empty)
  const dayOffset = 7 + (Number(unique.slice(-2)) % 14);
  const futureWeek = addDays(new Date(), dayOffset);
  const time = computeUniqueSlotTimes(unique, 0);
  await page.goto(`/agenda?view=week&date=${formatDateParam(futureWeek)}&hours=business`);
  await expect(page.getByRole("heading", { name: "Agenda e Disponibilita" })).toBeVisible();

  const addSlotDialog = await openAddSlotDialogFromHeader(page);
  await createCustomSlotWithRetry(addSlotDialog, { start: time.start, end: time.end });

  // Schedule the request at the next available slot from waiting list
  await page.getByRole("link", { name: "Lista d'Attesa" }).click();
  await expect(page.getByRole("heading", { name: "Lista d'Attesa" })).toBeVisible();

  const requestRow = page.locator("tr").filter({ hasText: motivo }).first();
  await expect(requestRow).toBeVisible();

  const scheduledSection = page.locator("h3").filter({ hasText: /Programmati/ }).locator("..");
  const scheduledExpectation = expect(scheduledSection.getByText(motivo)).toBeVisible({
    timeout: 20_000,
  });

  await requestRow.locator('button[title="Assegna primo slot disponibile"]').click();
  await confirmAutoAssignIfPrompted(page);

  await scheduledExpectation;
});

test("booking dialog: shows future availability and allows manual booking", async ({ page }) => {
  await login(page);

  const unique = `${Date.now()}`;
  const nome = `Luigi${unique}`;
  const cognome = `Verdi${unique}`;
  const telefono = `334${unique.slice(-7)}`;
  const motivo = `E2E prenota ${unique}`;

  // Create a new slot in the future (the first test may have booked the only existing slot).
  const dayOffset = 10 + (Number(unique.slice(-2)) % 14);
  const futureWeek = addDays(new Date(), dayOffset);
  const time = computeUniqueSlotTimes(unique, 7);

  await page.goto(`/agenda?view=week&date=${formatDateParam(futureWeek)}&hours=business`);
  await expect(page.getByRole("heading", { name: "Agenda e Disponibilita" })).toBeVisible();

  const addSlotDialog = await openAddSlotDialogFromHeader(page);
  await createCustomSlotWithRetry(addSlotDialog, { start: time.start, end: time.end });

  // Create patient + waiting request
  await page.getByRole("link", { name: "Pazienti", exact: true }).click();
  await page.getByRole("link", { name: "Nuovo Paziente" }).click();
  await page.getByLabel(/Nome/).fill(nome);
  await page.getByLabel(/Cognome/).fill(cognome);
  await page.getByLabel(/Telefono/).fill(telefono);
  await page.getByRole("button", { name: "Crea Paziente" }).click();
  await expect(page).toHaveURL(/\/pazienti(?:\?.*)?$/);

  await openPatientDetailFromList(page, telefono);

  await page.getByRole("button", { name: "Aggiungi alla Lista d'Attesa" }).click();
  await page.getByLabel(/Motivo della visita/).fill(motivo);
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText(motivo)).toBeVisible();

  // Manual booking via "Prenota" (ScheduleDialog)
  await page.getByRole("link", { name: "Lista d'Attesa" }).click();
  const requestRow = page.locator("tr").filter({ hasText: motivo }).first();
  await expect(requestRow).toBeVisible();

  await requestRow.getByRole("button", { name: "Prenota" }).click();
  const bookingDialog = page.getByRole("dialog", { name: "Prenota Appuntamento" });
  await expect(bookingDialog).toBeVisible();

  await bookingDialog.locator('[data-slot-item="true"]').first().click();
  await confirmBookingIfPrompted(page);

  await expect(bookingDialog).toBeHidden({ timeout: 15_000 });

  const scheduledSection = page.locator("h3").filter({ hasText: /Programmati/ }).locator("..");
  await expect(scheduledSection.getByText(motivo)).toBeVisible({ timeout: 20_000 });
});
