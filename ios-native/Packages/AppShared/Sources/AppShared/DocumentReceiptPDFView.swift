import SwiftUI

/// Black-and-white A4 paper-receipt rendering of a `DocumentRecord`,
/// designed to be rasterised via `ImageRenderer` into a PDF.
///
/// Mirrors the on-screen `DocumentDetailContent` layout but strips every
/// hue: monospace body, plain border on the status pill, neutral totals.
/// Direction (in / out / due) is communicated by labels + arrow glyphs
/// + sign prefixes — never color — so the print is legible on a black-
/// and-white printer.
///
/// Sized for the A4 content area (`pageWidth - 2 * margin` points), the
/// view lays out at its natural height; the renderer slices it into
/// 595×842 pt pages.
public struct DocumentReceiptPDFView: View {
    public let doc: DocumentRecord
    public let kind: DocumentKind
    public let tenantCurrency: String
    public let tenantName: String?

    /// A4 width / height in PDF points (1/72 inch).
    public static let pageWidth: CGFloat = 595
    public static let pageHeight: CGFloat = 842
    /// Outer margin around the content on each page.
    public static let pageMargin: CGFloat = 36

    /// Width the SwiftUI view should lay out at (A4 minus margins).
    public static var contentWidth: CGFloat { pageWidth - 2 * pageMargin }

    public init(
        doc: DocumentRecord,
        kind: DocumentKind,
        tenantCurrency: String,
        tenantName: String? = nil
    ) {
        self.doc = doc
        self.kind = kind
        self.tenantCurrency = tenantCurrency
        self.tenantName = tenantName
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            dashedRule
            metaFields
            dashedRule
            content
            dashedRule
            totals
            if let comment = doc.comment, !comment.isEmpty {
                dashedRule
                commentBlock(comment)
            }
            Spacer(minLength: 16)
            footer
        }
        .frame(width: Self.contentWidth, alignment: .leading)
        .padding(.vertical, 12)
        .background(Color.white)
        .foregroundStyle(Color.black)
        .environment(\.colorScheme, .light)
        // ImageRenderer hosts the view in a fresh SwiftUI context — none of
        // AppRoot's `.environment(\.locale, ...)` propagates here. Pin the
        // user's chosen locale so .formatted(...) calls (dates, currency)
        // render in the right language. String-table lookups go through
        // `L(_:)` below for the same reason.
        .environment(\.locale, appLocale)
    }

    // MARK: - Locale resolution (explicit, ImageRenderer-safe)

    /// User-chosen app locale code — mirrors `AppRoot.localeCode`.
    private var localeCode: String {
        UserDefaults.standard.string(forKey: "appLocale") ?? "ru"
    }

    private var appLocale: Locale { Locale(identifier: localeCode) }

    /// Bundle scoped to the user's chosen language (`<code>.lproj`).
    /// SwiftUI's `Text(LocalizedStringKey)` resolution inside `ImageRenderer`
    /// has been observed to fall back to `Bundle.main.preferredLocalizations`
    /// instead of the in-app override, so we look strings up explicitly.
    private var langBundle: Bundle {
        if let path = Bundle.main.path(forResource: localeCode, ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return bundle
        }
        if let path = Bundle.main.path(forResource: "en", ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return bundle
        }
        return Bundle.main
    }

    /// Explicit string-catalog lookup. Returns the value for `key` in the
    /// user's-language bundle.
    private func L(_ key: String) -> String {
        langBundle.localizedString(forKey: key, value: nil, table: nil)
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        VStack(spacing: 6) {
            Text(verbatim: brandText)
                .font(.system(size: 11, weight: .bold))
                .tracking(5)
                .foregroundStyle(Color.black.opacity(0.65))
                .padding(.bottom, 4)
            Text(verbatim: doc.number)
                .font(.system(size: 26, weight: .heavy))
            Text(verbatim: L(kindTitleKey))
                .font(.system(size: 11, weight: .semibold))
                .tracking(2)
                .textCase(.uppercase)
                .foregroundStyle(Color.black.opacity(0.55))
            Text(doc.date, format: .dateTime.day().month(.wide).year())
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Color.black.opacity(0.65))
                .padding(.bottom, 8)
            outlinedStatusPill
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 10)
    }

    @ViewBuilder
    private var outlinedStatusPill: some View {
        Text(verbatim: L(pillLabelKey))
            .font(.system(size: 11, weight: .bold))
            .tracking(1.2)
            .textCase(.uppercase)
            .padding(.horizontal, 14)
            .padding(.vertical, 4)
            .overlay(
                Capsule().strokeBorder(Color.black, lineWidth: 1)
            )
    }

    // MARK: - Meta

    @ViewBuilder
    private var metaFields: some View {
        VStack(spacing: 0) {
            if let customer = doc.customer {
                row(labelKey: "docs.detail.customer", value: customer.name)
            }
            if let supplier = doc.supplier {
                row(labelKey: "docs.detail.supplier", value: supplier.name)
            }
            if let warehouse = doc.warehouse {
                row(labelKey: "docs.detail.warehouse", value: warehouse.name)
            } else if hasLines {
                row(labelKey: "docs.detail.warehouse", value: nil)
            }
            if let priceType = doc.priceType {
                row(labelKey: "docs.detail.priceType", value: priceType.name)
            } else if kind == .salesInvoice {
                row(labelKey: "docs.detail.priceType", value: nil)
            }
        }
    }

    @ViewBuilder
    private func row(labelKey: String, value: String?) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(verbatim: L(labelKey))
                .font(.system(size: 12, design: .monospaced))
            Spacer(minLength: 8)
            Text(verbatim: value ?? "—")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(value == nil ? Color.black.opacity(0.35) : Color.black)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Content (lines or big amount)

    @ViewBuilder
    private var content: some View {
        if let lines = doc.lines, !lines.isEmpty {
            VStack(spacing: 0) {
                ForEach(lines, id: \.id) { line in
                    lineRow(line)
                }
            }
        } else {
            bigAmount
        }
    }

    @ViewBuilder
    private func lineRow(_ line: DocumentLine) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline) {
                Text(verbatim: line.product?.name ?? "—")
                    .font(.system(size: 12.5, weight: .medium, design: .monospaced))
                Spacer(minLength: 8)
                Text(verbatim: line.quantity.value.formatted(.number)
                     + " × "
                     + line.unitPrice.value.formatted(.currency(code: tenantCurrency).precision(.fractionLength(2))))
                    .font(.system(size: 11.5, design: .monospaced))
                    .foregroundStyle(Color.black.opacity(0.65))
            }
            HStack {
                Spacer()
                Text(line.rowTotal.value, format: .currency(code: tenantCurrency))
                    .font(.system(size: 12.5, weight: .bold, design: .monospaced))
                    .monospacedDigit()
            }
        }
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private var bigAmount: some View {
        let (labelKey, arrow) = bigAmountStyle()
        VStack(spacing: 6) {
            Text(verbatim: L(labelKey))
                .font(.system(size: 10, weight: .bold))
                .tracking(2)
                .textCase(.uppercase)
                .foregroundStyle(Color.black.opacity(0.65))
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                if let arrow {
                    Text(verbatim: arrow)
                        .font(.system(size: 26, weight: .semibold))
                }
                Text(amountTotal, format: .currency(code: tenantCurrency))
                    .font(.system(size: 30, weight: .bold, design: .monospaced))
                    .monospacedDigit()
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }

    // MARK: - Totals

    @ViewBuilder
    private var totals: some View {
        let (labelKey, prefix) = totalStyle()
        VStack(spacing: 0) {
            if hasLines, let total = doc.total {
                HStack {
                    Text(verbatim: L("docs.detail.subtotal"))
                        .font(.system(size: 12, design: .monospaced))
                    Spacer()
                    Text(total.value, format: .currency(code: tenantCurrency))
                        .font(.system(size: 12, design: .monospaced))
                        .monospacedDigit()
                }
                .padding(.vertical, 3)
            }
            HStack {
                Text(verbatim: L(labelKey))
                    .font(.system(size: 14, weight: .heavy, design: .monospaced))
                    .tracking(0.8)
                    .textCase(.uppercase)
                Spacer()
                HStack(spacing: 2) {
                    if let prefix {
                        Text(verbatim: prefix)
                            .font(.system(size: 14, weight: .heavy, design: .monospaced))
                    }
                    Text(amountTotal, format: .currency(code: tenantCurrency))
                        .font(.system(size: 14, weight: .heavy, design: .monospaced))
                        .monospacedDigit()
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Comment + Footer

    @ViewBuilder
    private func commentBlock(_ comment: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: L("docs.detail.comment"))
                .font(.system(size: 10, weight: .bold))
                .tracking(2)
                .textCase(.uppercase)
                .foregroundStyle(Color.black.opacity(0.65))
            Text(verbatim: comment)
                .font(.system(size: 11.5, design: .monospaced))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private var footer: some View {
        let shortId = String(doc.id.uuidString.prefix(8))
        VStack(spacing: 4) {
            Text(verbatim: "\(L(footerPrefixKey)) · #\(shortId)")
                .font(.system(size: 10.5, design: .monospaced))
                .foregroundStyle(Color.black.opacity(0.55))
            Text(verbatim: "ID: \(doc.id.uuidString)")
                .font(.system(size: 8.5, design: .monospaced))
                .foregroundStyle(Color.black.opacity(0.35))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 10)
    }

    // MARK: - Bits

    private var dashedRule: some View {
        DashedLine()
            .stroke(Color.black.opacity(0.40), style: StrokeStyle(lineWidth: 0.6, dash: [3, 3]))
            .frame(height: 1)
            .padding(.vertical, 10)
    }

    private var hasLines: Bool { doc.lines?.isEmpty == false }
    private var amountTotal: Decimal { doc.total?.value ?? 0 }

    private var brandText: String {
        (tenantName?.uppercased() ?? "ISHFLOW")
            .map { String($0) }
            .joined(separator: " ")
    }

    private var kindTitleKey: String {
        switch kind {
        case .salesInvoice:          return "docs.detail.kind.salesInvoice"
        case .salesPaymentReceived:  return "docs.detail.kind.paymentReceived"
        case .purchaseInvoice:       return "docs.detail.kind.purchaseInvoice"
        case .purchasePaymentSent:   return "docs.detail.kind.paymentSent"
        }
    }

    private var footerPrefixKey: String {
        switch kind {
        case .salesInvoice:         return "docs.detail.footer.sales"
        case .salesPaymentReceived: return "docs.detail.footer.received"
        case .purchaseInvoice:      return "docs.detail.footer.purchase"
        case .purchasePaymentSent:  return "docs.detail.footer.sent"
        }
    }

    private var pillLabelKey: String {
        if doc.status != .posted {
            switch doc.status {
            case .draft:     return "status.draft"
            case .saved:     return "status.saved"
            case .cancelled: return "status.cancelled"
            case .posted:    return "status.posted"
            }
        }
        switch kind {
        case .salesPaymentReceived: return "docs.detail.pill.received"
        case .purchasePaymentSent:  return "docs.detail.pill.sent"
        default:                    return "status.posted"
        }
    }

    /// (string-catalog key, optional sign prefix to render before the amount)
    private func totalStyle() -> (String, String?) {
        switch kind {
        case .salesInvoice:         return ("docs.detail.total", nil)
        case .salesPaymentReceived: return ("docs.detail.total.in", "+ ")
        case .purchaseInvoice:      return ("docs.detail.total.due", nil)
        case .purchasePaymentSent:  return ("docs.detail.total.out", "− ")
        }
    }

    /// (string-catalog key, optional arrow glyph for direction)
    private func bigAmountStyle() -> (String, String?) {
        switch kind {
        case .salesPaymentReceived: return ("docs.detail.amount.received", "↓")
        case .purchasePaymentSent:  return ("docs.detail.amount.sent", "↑")
        default:                    return ("docs.detail.amount", nil)
        }
    }

}

private struct DashedLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        return path
    }
}
