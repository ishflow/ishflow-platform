import APIClient
import AppShared
import SwiftUI

/// Thin wrapper that re-exports `Customer360View` for backward compatibility.
/// Replaces the legacy `CounterpartyDetailView` with the new 360 experience.
public struct CounterpartyDetailView: View {
    private let api: any APIClient
    private let counterparty: Counterparty
    private let type: CounterpartyType

    public init(
        api: any APIClient,
        counterparty: Counterparty,
        type: CounterpartyType = .customer
    ) {
        self.api = api
        self.counterparty = counterparty
        self.type = type
    }

    public var body: some View {
        Customer360View(
            api: api,
            counterparty: counterparty,
            type: type
        )
    }
}
