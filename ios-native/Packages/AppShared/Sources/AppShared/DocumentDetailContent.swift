import SwiftUI

/// Reusable read-only document detail body — rendered as a **paper-receipt
/// card** that adapts to both light and dark mode. Both `DocumentDetailView`
/// (Docs package — purchase invoices + payment docs) and `SalesDetailView`
/// (Sales package — sales invoice with wizard-resume) render through this
/// so the visual language stays in lockstep across all four doc kinds.
///
/// The view is intentionally pure presentation: it takes a fully-loaded
/// `DocumentRecord`, a `DocumentKind` for the directional tinting, and the
/// tenant currency. Loading + error handling lives in the calling view.
public struct DocumentDetailContent: View {
    private let doc: DocumentRecord
    private let kind: DocumentKind
    private let tenantCurrency: String
    private let extra: AnyView?

    public init(doc: DocumentRecord, kind: DocumentKind, tenantCurrency: String, extra: AnyView? = nil) {
        self.doc = doc
        self.kind = kind
        self.tenantCurrency = tenantCurrency
        self.extra = extra
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                paperCard
                if let extra {
                    extra
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Paper card

    private var paperCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            paperHeader
            dashedDivider
            metaFields
            dashedDivider
            content
            dashedDivider
            totalsView
            if let comment = doc.comment, !comment.isEmpty {
                dashedDivider
                commentView(comment)
            }
            footerView
        }
        .padding(.horizontal, 20)
        .padding(.top, 22)
        .padding(.bottom, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.06), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 4)
    }

    // MARK: - Header (brand · number · date · status pill)

    @ViewBuilder
    private var paperHeader: some View {
        VStack(spacing: 8) {
            Text(verbatim: "I S H F L O W")
                .font(.system(size: 11, weight: .bold))
                .tracking(4)
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)
            Text(verbatim: doc.number)
                .font(.system(size: 24, weight: .heavy, design: .default))
                .foregroundStyle(.primary)
            Text(doc.date, format: .dateTime.day().month(.wide).year())
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)
            statusPill
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 6)
    }

    @ViewBuilder
    private var statusPill: some View {
        let (label, fg, bg) = pillStyle()
        Text(label)
            .font(.system(size: 12, weight: .semibold))
            .padding(.horizontal, 14)
            .padding(.vertical, 5)
            .foregroundStyle(fg)
            .background(Capsule().fill(bg))
    }

    // MARK: - Meta fields (counterparty · warehouse · price type)

    @ViewBuilder
    private var metaFields: some View {
        VStack(spacing: 0) {
            if let customer = doc.customer {
                fieldRow(label: "docs.detail.customer", value: customer.name)
            }
            if let supplier = doc.supplier {
                fieldRow(label: "docs.detail.supplier", value: supplier.name)
            }
            if let warehouse = doc.warehouse {
                fieldRow(label: "docs.detail.warehouse", value: warehouse.name)
            } else if hasLines {
                fieldRow(label: "docs.detail.warehouse", value: nil)
            }
            if let priceType = doc.priceType {
                fieldRow(label: "docs.detail.priceType", value: priceType.name)
            } else if kind == .salesInvoice {
                fieldRow(label: "docs.detail.priceType", value: nil)
            }
        }
    }

    @ViewBuilder
    private func fieldRow(label: LocalizedStringKey, value: String?) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 14, design: .monospaced))
                .foregroundStyle(.primary)
            Spacer(minLength: 8)
            if let value, !value.isEmpty {
                Text(verbatim: value)
                    .font(.system(size: 14, design: .monospaced))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(1)
                    .truncationMode(.tail)
            } else {
                Text(verbatim: "—")
                    .font(.system(size: 14, design: .monospaced))
                    .foregroundStyle(Color(.tertiaryLabel))
            }
        }
        .padding(.vertical, 6)
    }

    // MARK: - Content (lines or big amount)

    @ViewBuilder
    private var content: some View {
        if let lines = doc.lines, !lines.isEmpty {
            linesList(lines)
        } else {
            bigAmountBlock
        }
    }

    @ViewBuilder
    private func linesList(_ lines: [DocumentLine]) -> some View {
        VStack(spacing: 0) {
            ForEach(lines, id: \.id) { line in
                lineRow(line)
            }
        }
    }

    @ViewBuilder
    private func lineRow(_ line: DocumentLine) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline) {
                Text(verbatim: line.product?.name ?? "—")
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(verbatim: line.quantity.value.formatted(.number) + " × " + line.unitPrice.value.formatted(.currency(code: tenantCurrency).precision(.fractionLength(2)).presentation(.narrow)))
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            HStack {
                Spacer()
                Text(line.rowTotal.value, format: .currency(code: tenantCurrency))
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(.primary)
                    .monospacedDigit()
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var bigAmountBlock: some View {
        let (label, tint, arrow) = bigAmountStyle()
        VStack(spacing: 8) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .tracking(2)
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                if let arrow {
                    Text(verbatim: arrow)
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(tint)
                }
                Text(amountTotal, format: .currency(code: tenantCurrency))
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .foregroundStyle(tint)
                    .monospacedDigit()
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    // MARK: - Totals

    @ViewBuilder
    private var totalsView: some View {
        let (totalLabel, totalTint, prefix) = totalStyle()
        VStack(spacing: 0) {
            if hasLines, let total = doc.total {
                HStack {
                    Text("docs.detail.subtotal")
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(total.value, format: .currency(code: tenantCurrency))
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.primary)
                        .monospacedDigit()
                }
                .padding(.vertical, 4)
            }
            HStack {
                Text(totalLabel)
                    .font(.system(size: 16, weight: .heavy, design: .monospaced))
                    .tracking(0.6)
                    .textCase(.uppercase)
                    .foregroundStyle(totalTint)
                Spacer()
                HStack(spacing: 2) {
                    if let prefix {
                        Text(verbatim: prefix)
                            .font(.system(size: 16, weight: .heavy, design: .monospaced))
                            .foregroundStyle(totalTint)
                    }
                    Text(amountTotal, format: .currency(code: tenantCurrency))
                        .font(.system(size: 16, weight: .heavy, design: .monospaced))
                        .foregroundStyle(totalTint)
                        .monospacedDigit()
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Comment

    @ViewBuilder
    private func commentView(_ comment: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("docs.detail.comment")
                .font(.system(size: 11, weight: .bold))
                .tracking(2)
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            Text(verbatim: comment)
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 8)
    }

    // MARK: - Footer (thank-you)

    @ViewBuilder
    private var footerView: some View {
        Text(footerText)
            .font(.system(size: 12, design: .monospaced))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.top, 12)
    }

    // MARK: - Helpers

    private var dashedDivider: some View {
        DashedLine()
            .stroke(
                Color(.separator),
                style: StrokeStyle(lineWidth: 1, dash: [4, 4])
            )
            .frame(height: 1)
            .padding(.vertical, 12)
    }

    private var hasLines: Bool {
        (doc.lines?.isEmpty == false)
    }

    private var amountTotal: Decimal {
        doc.total?.value ?? 0
    }

    private var footerText: String {
        let shortId = String(doc.id.uuidString.prefix(6))
        let prefix: String
        switch kind {
        case .salesInvoice:         prefix = "Thank you · #"
        case .salesPaymentReceived: prefix = "Receipt · #"
        case .purchaseInvoice:      prefix = "Stock updated · #"
        case .purchasePaymentSent:  prefix = "Cash paid · #"
        }
        return prefix + shortId
    }

    /// Status pill: kind-tinted ("Posted · Received" for incoming money,
    /// neutral colors for non-posted statuses). Returns `(label, fg, bg)`.
    private func pillStyle() -> (LocalizedStringKey, Color, Color) {
        if doc.status != .posted {
            // Non-posted: neutral status pill (gray/blue/red per legacy).
            switch doc.status {
            case .draft:     return ("status.draft",     .gray,  Color.gray.opacity(0.15))
            case .saved:     return ("status.saved",     .blue,  Color.blue.opacity(0.15))
            case .cancelled: return ("status.cancelled", .red,   Color.red.opacity(0.15))
            case .posted:    return ("status.posted",    .green, Color.green.opacity(0.15)) // unreachable
            }
        }
        switch kind {
        case .salesInvoice:
            return ("status.posted", Color(red: 0.10, green: 0.34, blue: 0.69),
                    Color.blue.opacity(0.15))
        case .salesPaymentReceived:
            return ("docs.detail.pill.received", Color(red: 0.12, green: 0.48, blue: 0.23),
                    Color.green.opacity(0.18))
        case .purchaseInvoice:
            return ("status.posted", Color(red: 0.60, green: 0.32, blue: 0.00),
                    Color.orange.opacity(0.18))
        case .purchasePaymentSent:
            return ("docs.detail.pill.sent", Color(red: 0.66, green: 0.18, blue: 0.13),
                    Color.red.opacity(0.16))
        }
    }

    /// TOTAL line styling per doc direction. Returns `(label, tint, prefix)`.
    private func totalStyle() -> (LocalizedStringKey, Color, String?) {
        switch kind {
        case .salesInvoice:
            return ("docs.detail.total", .primary, nil)
        case .salesPaymentReceived:
            return ("docs.detail.total.in", .green, "+ ")
        case .purchaseInvoice:
            return ("docs.detail.total.due", .orange, nil)
        case .purchasePaymentSent:
            return ("docs.detail.total.out", .red, "− ")
        }
    }

    /// Big-amount header label + tint + arrow glyph (for payment docs).
    private func bigAmountStyle() -> (LocalizedStringKey, Color, String?) {
        switch kind {
        case .salesPaymentReceived:
            return ("docs.detail.amount.received", .green, "↓")
        case .purchasePaymentSent:
            return ("docs.detail.amount.sent", .red, "↑")
        default:
            return ("docs.detail.amount", .primary, nil)
        }
    }
}

// MARK: - Shape helpers

/// Horizontal dashed line shape used between paper-card sections.
private struct DashedLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        return path
    }
}

/// Public mapping from `DocumentStatus` to a `LocalizedStringKey` so list
/// rows + detail screens stay aligned. Constant string keys (one per case)
/// — built via interpolation the lookup would miss the localization table.
public func localizedStatusKey(for status: DocumentStatus) -> LocalizedStringKey {
    switch status {
    case .posted: "status.posted"
    case .draft: "status.draft"
    case .saved: "status.saved"
    case .cancelled: "status.cancelled"
    }
}
