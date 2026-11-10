import Foundation
import SwiftUI

#if canImport(UIKit) && os(iOS)
import AVFoundation
import UIKit

/// SwiftUI wrapper around an `AVCaptureSession` that streams barcode and
/// QR scans. The closure is invoked on the main queue with the decoded
/// string the first time a recognised payload appears in frame.
public struct BarcodeScanView: UIViewControllerRepresentable {
    /// Invoked with the decoded barcode payload.
    public let onScan: (String) -> Void

    /// Create a barcode scanner view with the given scan callback.
    public init(onScan: @escaping (String) -> Void) {
        self.onScan = onScan
    }

    /// Build the underlying scanner view controller.
    public func makeUIViewController(context _: Context) -> ScannerViewController {
        let viewController = ScannerViewController()
        viewController.onScan = onScan
        return viewController
    }

    /// No-op; the scanner controller updates itself.
    public func updateUIViewController(_: ScannerViewController, context _: Context) {}
}

/// Lightweight `UIViewController` that owns the `AVCaptureSession` and
/// forwards the first recognised payload to the SwiftUI wrapper.
public final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    /// Invoked with the first decoded barcode payload.
    public var onScan: ((String) -> Void)?
    /// `AVCaptureSession` is not `Sendable`; we explicitly opt out of
    /// isolation checks so background start/stop calls compile under
    /// Swift 6 strict concurrency.
    private nonisolated(unsafe) let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?

    /// Configure the capture session and preview layer.
    override public func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configure()
    }

    private func configure() {
        guard
            let device = AVCaptureDevice.default(for: .video),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else { return }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.ean13, .ean8, .qr, .code128]

        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.frame = view.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        preview = previewLayer

        let captureSession = session
        DispatchQueue.global(qos: .userInitiated).async {
            captureSession.startRunning()
        }
    }

    /// Keep the preview layer matched to the host view bounds.
    override public func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    /// Forward the first recognised payload, then stop capturing. The
    /// AVFoundation delegate is `nonisolated`; we extract the value off
    /// the main actor and hop back onto it before touching mutable state.
    public nonisolated func metadataOutput(
        _: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from _: AVCaptureConnection
    ) {
        guard
            let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
            let value = object.stringValue
        else { return }
        Task { @MainActor [weak self] in
            guard let self else { return }
            session.stopRunning()
            onScan?(value)
        }
    }
}
#else
/// Stub implementation used when AVFoundation/UIKit are unavailable
/// (e.g. when SwiftPM resolves the target on macOS for `swift test`).
public struct BarcodeScanView: View {
    /// Invoked with the decoded barcode payload. Never called on this
    /// platform; the view simply renders an unsupported message.
    public let onScan: (String) -> Void

    /// Create the unsupported-platform stub.
    public init(onScan: @escaping (String) -> Void) {
        self.onScan = onScan
    }

    public var body: some View {
        Text("Barcode scanning unavailable on this platform")
    }
}
#endif
