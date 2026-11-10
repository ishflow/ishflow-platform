import SwiftUI

struct KPIRow: View {
    let title: LocalizedStringKey
    let value: String
    let systemImage: String

    var body: some View {
        LabeledContent {
            Text(value).font(.title3).fontWeight(.semibold)
        } label: {
            Label(title, systemImage: systemImage)
        }
        .padding(.vertical, 4)
    }
}
