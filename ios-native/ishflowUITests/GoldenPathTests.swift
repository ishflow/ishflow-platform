import XCTest

/// Golden-path UI test for the iOS native MVP demo build.
///
/// The Clerk OAuth flow can't be exercised in a UI test (no callback URI is
/// registered for the simulator), so this test drives the demo "Skip" button on
/// the sign-in screen instead. From there it verifies:
///
///   1. Skip → MainTabView lands on the Dashboard tab.
///   2. Sales tab is reachable and renders the localized title.
///   3. The "+" toolbar button presents the sales wizard.
///   4. The wizard's customer-step pick button is visible.
///   5. Cancelling out of the wizard returns to the Sales list.
///
/// Extended in M14 to cover the full wizard flow:
///   6. Pick a customer, advance to header step.
///   7. Pick warehouse and price type, advance to lines step.
///   8. Add a product, edit its quantity, save the line.
///   9. Advance to review step and post the invoice.
///  10. Verify dismissal back to the Sales list.
final class GoldenPathTests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testSkipPreviewToDashboardToWizard() {
        let app = XCUIApplication()
        app.launch()

        // Sign-in screen — tap the demo skip button.
        let skipButton = app.buttons["auth.skip"]
        XCTAssertTrue(
            skipButton.waitForExistence(timeout: 5),
            "Skip button should appear on cold launch"
        )
        skipButton.tap()

        // Dashboard tab is the default landing screen after skip.
        let dashboardTitle = app.navigationBars.staticTexts["Dashboard"]
        XCTAssertTrue(
            dashboardTitle.waitForExistence(timeout: 5),
            "Dashboard should appear after skip"
        )

        // Switch to Sales tab.
        app.tabBars.buttons["Sales"].tap()
        let salesTitle = app.navigationBars.staticTexts["Sales"]
        XCTAssertTrue(
            salesTitle.waitForExistence(timeout: 3),
            "Sales tab should render"
        )

        // Open wizard via "+" toolbar button.
        let newInvoiceButton = app.buttons["sales.newInvoice"].firstMatch
        XCTAssertTrue(
            newInvoiceButton.waitForExistence(timeout: 3),
            "New invoice toolbar button should be present"
        )
        newInvoiceButton.tap()

        // Customer step — pick button should appear (no customer selected yet).
        let pickCustomer = app.buttons["wizard.customer.pick"]
        XCTAssertTrue(
            pickCustomer.waitForExistence(timeout: 3),
            "Customer pick button should appear in wizard customer step"
        )

        // Cancel out — demo API doesn't accept POSTs so we don't drive a full post.
        app.navigationBars.buttons["Cancel"].firstMatch.tap()
        XCTAssertTrue(
            salesTitle.waitForExistence(timeout: 3),
            "Sales list should reappear after cancelling the wizard"
        )
    }

    func testFullWizardFlowWithLineEditingAndPost() {
        let app = XCUIApplication()
        app.launch()

        // Sign-in screen — tap the demo skip button.
        let skipButton = app.buttons["auth.skip"]
        XCTAssertTrue(
            skipButton.waitForExistence(timeout: 5),
            "Skip button should appear on cold launch"
        )
        skipButton.tap()

        // Dashboard tab is the default landing screen after skip.
        let dashboardTitle = app.navigationBars.staticTexts["Dashboard"]
        XCTAssertTrue(
            dashboardTitle.waitForExistence(timeout: 5),
            "Dashboard should appear after skip"
        )

        // Switch to Sales tab.
        app.tabBars.buttons["Sales"].tap()
        let salesTitle = app.navigationBars.staticTexts["Sales"]
        XCTAssertTrue(
            salesTitle.waitForExistence(timeout: 3),
            "Sales tab should render"
        )

        // Open wizard via "+" toolbar button.
        let newInvoiceButton = app.buttons["sales.newInvoice"].firstMatch
        XCTAssertTrue(
            newInvoiceButton.waitForExistence(timeout: 3),
            "New invoice toolbar button should be present"
        )
        newInvoiceButton.tap()

        // === Customer Step ===
        let pickCustomer = app.buttons["wizard.customer.pick"]
        XCTAssertTrue(
            pickCustomer.waitForExistence(timeout: 3),
            "Customer pick button should appear"
        )
        pickCustomer.tap()

        // Pick Acme Corporation from the customer picker.
        let acmeCustomer = app.buttons["picker.customer.00000000-0000-0000-0000-000000000020"]
        XCTAssertTrue(
            acmeCustomer.waitForExistence(timeout: 3),
            "Acme Corporation should appear in customer picker"
        )
        acmeCustomer.tap()

        // Advance to header step.
        let customerNext = app.buttons["wizard.customer.next"]
        XCTAssertTrue(customerNext.waitForExistence(timeout: 3))
        customerNext.tap()

        // === Header Step ===
        let warehousePick = app.buttons["wizard.header.warehouse.pick"]
        XCTAssertTrue(warehousePick.waitForExistence(timeout: 3))
        warehousePick.tap()

        // Pick Main Warehouse.
        let mainWarehouse = app.buttons["picker.warehouse.00000000-0000-0000-0000-000000000040"]
        XCTAssertTrue(mainWarehouse.waitForExistence(timeout: 3))
        mainWarehouse.tap()

        // Pick price type.
        let priceTypePick = app.buttons["wizard.header.priceType.pick"]
        XCTAssertTrue(priceTypePick.waitForExistence(timeout: 3))
        priceTypePick.tap()

        // Pick Retail price type.
        let retailPriceType = app.buttons["picker.priceType.00000000-0000-0000-0000-000000000070"]
        XCTAssertTrue(retailPriceType.waitForExistence(timeout: 3))
        retailPriceType.tap()

        // Advance to lines step.
        let headerNext = app.buttons["wizard.header.next"]
        XCTAssertTrue(headerNext.waitForExistence(timeout: 3))
        headerNext.tap()

        // === Lines Step ===
        let addProduct = app.buttons["wizard.lines.addProduct"]
        XCTAssertTrue(addProduct.waitForExistence(timeout: 3))
        addProduct.tap()

        // Pick Bread product.
        let breadProduct = app.buttons["picker.product.00000000-0000-0000-0000-000000000050"]
        XCTAssertTrue(breadProduct.waitForExistence(timeout: 3))
        breadProduct.tap()

        // Tap the added line to edit it.
        let lineButton = app.buttons["wizard.line.00000000-0000-0000-0000-000000000050"]
        XCTAssertTrue(lineButton.waitForExistence(timeout: 3))
        lineButton.tap()

        // Edit quantity in the line editor.
        let quantityField = app.textFields["wizard.line.quantity"]
        XCTAssertTrue(quantityField.waitForExistence(timeout: 3))
        quantityField.tap()
        quantityField.clearText()
        quantityField.typeText("5")

        // Save the line edit.
        let saveLine = app.buttons["wizard.line.save"]
        XCTAssertTrue(saveLine.waitForExistence(timeout: 3))
        saveLine.tap()

        // Advance to review step.
        let linesNext = app.buttons["wizard.lines.next"]
        XCTAssertTrue(linesNext.waitForExistence(timeout: 3))
        linesNext.tap()

        // === Review Step ===
        let postButton = app.buttons["wizard.post"]
        XCTAssertTrue(
            postButton.waitForExistence(timeout: 3),
            "Post button should appear on review step"
        )
        postButton.tap()

        // After posting, the wizard should dismiss and we're back at Sales list.
        XCTAssertTrue(
            salesTitle.waitForExistence(timeout: 5),
            "Sales list should reappear after posting invoice"
        )
    }
}

private extension XCUIElement {
    func clearText() {
        guard let stringValue = value as? String else { return }
        let deleteString = String(repeating: XCUIKeyboardKey.delete.rawValue, count: stringValue.count)
        typeText(deleteString)
    }
}
