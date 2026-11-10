import SwiftUI

/// Shared visual tokens for the wizard primitives. Centralized here so iOS
/// wizards (sales, purchase, payment_received, payment_sent) read the same
/// colors / metrics / typography — analogous to Android's `WizardDefaults`.
public enum WizardTokens {
    // Spacing
    public static let screenGutter: CGFloat = 16
    public static let sectionGap: CGFloat = 12

    // Heights
    public static let actionPillHeight: CGFloat = 44
    public static let chipHeight: CGFloat = 34
    public static let searchHeight: CGFloat = 48

    // Radii
    public static let pillRadius: CGFloat = 22
    public static let cardRadius: CGFloat = 16
    public static let totalBarRadius: CGFloat = 16

    // Typography
    public static let labelFont: Font = .system(size: 11, weight: .semibold)
    public static let valueFont: Font = .system(size: 16)
    public static let totalValueFont: Font = .system(size: 19, weight: .bold, design: .rounded)

    // Tints — semantic
    /// Draft badge — warm amber over background.
    public static let draftBackground = Color(red: 0.95, green: 0.62, blue: 0.04).opacity(0.22)
    public static let draftForeground = Color(red: 1.0, green: 0.82, blue: 0.54)
    /// Money-in tint for sales sticky-total (system-green derived).
    public static let totalTint = Color.green
    /// Stroke color for "empty" dashed chips.
    public static let dashedStroke = Color.white.opacity(0.22)
    /// Stroke color for filled chips/cards.
    public static let solidStroke = Color.white.opacity(0.10)
}
