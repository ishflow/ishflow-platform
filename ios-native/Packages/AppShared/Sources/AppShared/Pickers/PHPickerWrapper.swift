import PhotosUI
import SwiftUI

/// SwiftUI wrapper around `PHPickerViewController` for selecting photos
/// from the library. Returns JPEG-encoded `[Data]`.
public struct PHPickerWrapper: UIViewControllerRepresentable {
    public let onPick: ([Data]) -> Void
    public let onCancel: () -> Void

    public init(onPick: @escaping ([Data]) -> Void, onCancel: @escaping () -> Void = {}) {
        self.onPick = onPick
        self.onCancel = onCancel
    }

    public func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.selectionLimit = 10
        config.filter = .images
        let controller = PHPickerViewController(configuration: config)
        controller.delegate = context.coordinator
        return controller
    }

    public func updateUIViewController(_: PHPickerViewController, context: Context) {}

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        private let parent: PHPickerWrapper

        init(_ parent: PHPickerWrapper) {
            self.parent = parent
        }

        public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            guard !results.isEmpty else {
                parent.onCancel()
                return
            }

            Task {
                var datas: [Data] = []
                for result in results {
                    if let data = try? await result.itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier) as? Data {
                        datas.append(data)
                    }
                }
                await MainActor.run {
                    parent.onPick(datas)
                }
            }
        }
    }
}
