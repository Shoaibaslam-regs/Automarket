import { expect, test } from "@playwright/test";
import { dayFromToday, seedData, signedIn } from "./helpers";

// Business → Announcements: a dealer posts on its shop page; visitors see it at the top; ending it takes it off.
test.describe.serial("shop announcements", () => {
  test("the dealer posts a pinned event with a button, checking the preview first", async ({ browser }) => {
    const { users, dealId } = seedData();
    const page = await signedIn(browser, users.dealer);
    await page.goto("/business/announcements");
    await page.getByRole("button", { name: "New announcement" }).first().click();
    const form = page.getByRole("dialog", { name: "New announcement" });
    await form.getByRole("radio", { name: "Event" }).click();
    await form.getByLabel("Title").fill("Test-drive day at E2E Motors");
    await form.getByLabel(/^Details/).fill("Drive any Fortuner in our fleet. Tea and samosas on us.");
    await form.getByLabel("Event date & time").fill(`${dayFromToday(5)}T16:00`);
    await form.getByLabel(/^Button link/).fill(`/deals/${dealId}`);
    await form.getByLabel("Button text").fill("See the convoy deal");
    await form.getByText("Pin to the top").click();
    // The preview is the same card visitors will see
    await expect(form.getByRole("heading", { name: "Test-drive day at E2E Motors" })).toBeVisible();
    await form.getByRole("button", { name: "Post announcement" }).click();
    await expect(form).toBeHidden();
    await expect(page.getByText("On your shop page (1)")).toBeVisible();
  });

  test("visitors see it at the top of the shop page, with its date and button", async ({ page }) => {
    const { dealId } = seedData();
    await page.goto("/dealers/e2e-motors");
    const notices = page.getByRole("region", { name: "Announcements from E2E Motors" });
    await expect(notices.getByRole("heading", { name: "Test-drive day at E2E Motors" })).toBeVisible();
    await expect(notices.getByText("Event", { exact: true })).toBeVisible();
    await expect(notices.getByText("Pinned")).toBeVisible();
    await expect(notices.getByText(/ · 4:00 PM$/)).toBeVisible();
    await expect(notices.getByRole("link", { name: /See the convoy deal/ })).toHaveAttribute("href", `/deals/${dealId}`);
  });

  test("ending it takes it off the shop page", async ({ browser }) => {
    const page = await signedIn(browser, seedData().users.dealer);
    await page.goto("/business/announcements");
    await page.getByRole("button", { name: "End" }).click();
    await expect(page.getByText("On your shop page (0)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ended" })).toBeVisible();
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto("/dealers/e2e-motors");
    await expect(visitor.getByRole("region", { name: "Announcements from E2E Motors" })).toHaveCount(0);
  });

  test("the form saves itself: tapping outside and opening it again brings the text back", async ({ browser }) => {
    const page = await signedIn(browser, seedData().users.dealer);
    await page.goto("/business/announcements");
    await page.getByRole("button", { name: "New announcement" }).first().click();
    const form = page.getByRole("dialog", { name: "New announcement" });
    await form.getByLabel("Title").fill("Eid timings: open till midnight");
    await form.getByLabel(/^Details/).fill("Open every day of Eid.");
    await expect(form.getByText("Draft saved on this device")).toBeVisible();
    // A tap outside the dialog closes it
    await page.mouse.click(5, 5);
    await expect(form).toBeHidden();

    await page.getByRole("button", { name: "New announcement" }).first().click();
    await expect(form.getByLabel("Title")).toHaveValue("Eid timings: open till midnight");
    await expect(form.getByLabel(/^Details/)).toHaveValue("Open every day of Eid.");
    await expect(form.getByText(/Restored your draft/)).toBeVisible();

    // Still there after a reload, and gone once it is posted
    await page.reload();
    await page.getByRole("button", { name: "New announcement" }).first().click();
    await expect(form.getByLabel("Title")).toHaveValue("Eid timings: open till midnight");
    await form.getByRole("button", { name: "Post announcement" }).click();
    await expect(form).toBeHidden();
    await page.getByRole("button", { name: "New announcement" }).first().click();
    await expect(form.getByLabel("Title")).toHaveValue("");
  });
});
