import { test, expect } from "../fixtures/auth.fixture"
import { DashboardPage } from "../pages/dashboard.page"
import { CenterEditPage } from "../pages/center-edit.page"
import { TEST_CENTERS } from "../utils/test-data"

test.describe("Superadmin Features", () => {
  test("superadmin sees all dialysis centers", async ({ superadminPage }) => {
    const dashboard = new DashboardPage(superadminPage)
    await dashboard.goto()

    await expect(dashboard.welcomeCard).toBeVisible()

    const centerCount = await dashboard.getCenterCount()
    expect(centerCount).toBeGreaterThanOrEqual(TEST_CENTERS.length)

    for (const center of TEST_CENTERS) {
      await expect(superadminPage.getByText(center.dialysisCenterName)).toBeVisible()
    }
  })

  test("superadmin can access invitations tab", async ({ superadminPage }) => {
    const dashboard = new DashboardPage(superadminPage)
    await dashboard.goto()

    await expect(dashboard.invitationsButton).toBeVisible()
    await dashboard.invitationsButton.click()

    await expect(dashboard.generatePicInvitation).toBeVisible()
  })

  test("superadmin can generate invitation link", async ({ superadminPage }) => {
    const dashboard = new DashboardPage(superadminPage)
    await dashboard.goto()

    await dashboard.invitationsButton.click()
    await dashboard.selectCenterForInvitation(TEST_CENTERS[0].dialysisCenterName)
    await dashboard.generateInvitationLink()

    await expect(dashboard.invitationLinkInput).toBeVisible()
    const link = await dashboard.getGeneratedLink()
    expect(link).toContain("/auth/sign-up?invite=")
  })

  test("superadmin can navigate to center edit page", async ({ superadminPage }) => {
    const dashboard = new DashboardPage(superadminPage)
    await dashboard.goto()

    await dashboard.clickCenter(TEST_CENTERS[0].dialysisCenterName)

    await expect(superadminPage).toHaveURL(`/centers/${TEST_CENTERS[0].id}`)
  })

  test("superadmin can create a new center", async ({ superadminPage }) => {
    const dashboard = new DashboardPage(superadminPage)
    const centerEdit = new CenterEditPage(superadminPage)
    const centerName = `Fresh Center ${Date.now()}`

    await dashboard.goto()
    await dashboard.clickAddCenter()

    await expect(superadminPage).toHaveURL("/centers/new")

    await centerEdit.centerNameInput.fill(centerName)
    await centerEdit.sectorInput.fill("Private")
    await centerEdit.townInput.fill("Cyberjaya")
    await centerEdit.addressInput.fill("1 New Center Road")
    await centerEdit.telephoneInput.fill("03-22223333")
    await centerEdit.selectState("Selangor")
    await centerEdit.saveChanges()

    await centerEdit.waitForCreateSuccess()
    await expect(superadminPage).not.toHaveURL("/centers/new")
    await expect(
      superadminPage.getByRole("heading", { name: "Edit Center" })
    ).toBeVisible()
    await expect(centerEdit.centerNameInput).toHaveValue(centerName)
  })
})
