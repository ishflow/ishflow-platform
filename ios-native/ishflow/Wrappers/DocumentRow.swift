import AppShared
import SwiftUI

struct DocumentRow: View {
    let record: DocumentRecord

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(record.number).font(.headline)
                Text(record.date, style: .date).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            StatusChip(status: record.status)
        }
    }
}
