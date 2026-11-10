@testable import AppShared
import XCTest

final class CounterpartyTests: XCTestCase {
    // Use the canonical decoder so changes to JSONDecoder.ishflow are
    // caught by tests rather than silently passing with a local copy.
    private let decoder = JSONDecoder.ishflow

    func testCounterpartyDecodesCustomerOwedBalance() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000801",
            "code": "C-001",
            "name": "Acme Corp",
            "balance": "1250.50",
            "balanceDirection": "owesUs",
            "currency": "USD"
        }
        """#.utf8)
        let counterparty = try decoder.decode(Counterparty.self, from: json)
        XCTAssertEqual(counterparty.id, UUID(uuidString: "00000000-0000-0000-0000-000000000801"))
        XCTAssertEqual(counterparty.code, "C-001")
        XCTAssertEqual(counterparty.name, "Acme Corp")
        XCTAssertEqual(counterparty.balance.value, Decimal(string: "1250.50"))
        XCTAssertEqual(counterparty.balanceDirection, .owesUs)
        XCTAssertEqual(counterparty.currency, "USD")
    }

    func testCounterpartyDecodesZeroBalanceWithoutCode() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000802",
            "code": null,
            "name": "Walk-in customer",
            "balance": "0",
            "balanceDirection": "zero",
            "currency": "RUB"
        }
        """#.utf8)
        let counterparty = try decoder.decode(Counterparty.self, from: json)
        XCTAssertEqual(counterparty.id, UUID(uuidString: "00000000-0000-0000-0000-000000000802"))
        XCTAssertNil(counterparty.code)
        XCTAssertEqual(counterparty.name, "Walk-in customer")
        XCTAssertEqual(counterparty.balance.value, Decimal.zero)
        XCTAssertEqual(counterparty.balanceDirection, .zero)
        XCTAssertEqual(counterparty.currency, "RUB")
    }
}
