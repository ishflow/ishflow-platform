import SwiftUI
import UIKit
import VisionKit

/// SwiftUI wrapper around `VNDocumentCameraViewController`.
/// Returns scanned pages as `[UIImage]` via the `onScan` callback.
public struct VisionDocumentScanner: UIViewControllerRepresentable {
    public let onScan: ([UIImage]) -> Void
    public let onCancel: () -> Void

    public init(onScan: @escaping ([UIImage]) -> Void, onCancel: @escaping () -> Void = {}) {
        self.onScan = onScan
        self.onCancel = onCancel
    }

    public func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    public func updateUIViewController(_: VNDocumentCameraViewController, context: Context) {}

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        private let parent: VisionDocumentScanner

        init(_ parent: VisionDocumentScanner) {
            self.parent = parent
        }

        public func documentCameraViewController(
            _: VNDocumentCameraViewController,
            didFinishWith scan: VNDocumentCameraScan
        ) {
            var images: [UIImage] = []
            for i in 0..<scan.pageCount {
                images.append(scan.imageOfPage(at: i))
            }
            parent.onScan(images)
        }

        public func documentCameraViewControllerDidCancel(
            _: VNDocumentCameraViewController
        ) {
            parent.onCancel()
        }

        public func documentCameraViewController(
            _: VNDocumentCameraViewController,
            didFailWithError error: Error
        ) {
            parent.onCancel()
        }
    }
}
