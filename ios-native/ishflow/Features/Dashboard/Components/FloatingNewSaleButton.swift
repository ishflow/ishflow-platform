import SwiftUI

struct FloatingNewSaleButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.tint, in: Circle())
                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
        }
        .accessibilityLabel(Text("dashboard.fab.newSale"))
        .padding(.trailing, 20)
        .padding(.bottom, 24)
    }
}

#Preview {
    ZStack {
        VStack {
            Spacer()
            Text("Dashboard content")
                .foregroundStyle(.secondary)
        }

        VStack {
            Spacer()
            HStack {
                Spacer()
                FloatingNewSaleButton(action: {})
            }
        }
    }
}
