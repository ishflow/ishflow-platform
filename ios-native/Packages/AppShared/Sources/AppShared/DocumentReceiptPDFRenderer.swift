import SwiftUI
import UIKit

/// Renders a `DocumentReceiptPDFView` to an A4 PDF file in the temporary
/// directory and returns its URL — ready to be handed to a share sheet.
///
/// Strategy:
///   1. Lay out the SwiftUI view at A4 content width with natural height
///      via `ImageRenderer`.
///   2. Rasterise into a single tall CGImage.
///   3. Slice the image into 595×842 pt PDF pages with `UIGraphicsPDFRenderer`.
///
/// Vector PDF (via `CGContext(url:mediaBox:nil)` + `ImageRenderer.render`)
/// was considered, but its single-shot rendering can't be split into A4
/// pages without re-rendering each slice — and would still rasterise the
/// glyphs anyway because `ImageRenderer` paints to a raster context.
/// Slicing a high-resolution raster keeps the code simple and the output
/// crisp enough for print at scale 3×.
public enum DocumentReceiptPDFRenderer {
    public enum Failure: Error {
        case rasterFailed
        case writeFailed
    }

    /// Render the receipt view to a temp `.pdf` file. Returns the file URL.
    @MainActor
    public static func makePDF(
        for doc: DocumentRecord,
        kind: DocumentKind,
        tenantCurrency: String,
        tenantName: String? = nil
    ) throws -> URL {
        let view = DocumentReceiptPDFView(
            doc: doc,
            kind: kind,
            tenantCurrency: tenantCurrency,
            tenantName: tenantName
        )
        // Wrap with outer page padding so content sits inside the A4 frame.
        let paddedView = view
            .padding(.horizontal, DocumentReceiptPDFView.pageMargin)
            .padding(.vertical, DocumentReceiptPDFView.pageMargin)
            .frame(width: DocumentReceiptPDFView.pageWidth, alignment: .top)
            .background(Color.white)

        let renderer = ImageRenderer(content: paddedView)
        renderer.scale = 3 // print-friendly resolution

        guard let cgImage = renderer.cgImage else {
            throw Failure.rasterFailed
        }

        let pageWidthPt = DocumentReceiptPDFView.pageWidth
        let pageHeightPt = DocumentReceiptPDFView.pageHeight
        let totalHeightPt = CGFloat(cgImage.height) / renderer.scale
        let pageCount = max(1, Int(ceil(totalHeightPt / pageHeightPt)))

        let pageRect = CGRect(x: 0, y: 0, width: pageWidthPt, height: pageHeightPt)
        let pdfRenderer = UIGraphicsPDFRenderer(bounds: pageRect)

        let fileName = "\(filePrefix(kind: kind))-\(doc.number).pdf"
            .replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try pdfRenderer.writePDF(to: url) { ctx in
                for page in 0 ..< pageCount {
                    ctx.beginPage()
                    let yOffsetPt = CGFloat(page) * pageHeightPt
                    let visibleHeightPt = min(pageHeightPt, totalHeightPt - yOffsetPt)
                    let yPx = Int(yOffsetPt * renderer.scale)
                    let heightPx = Int(visibleHeightPt * renderer.scale)
                    let cropRect = CGRect(x: 0, y: yPx, width: cgImage.width, height: heightPx)
                    guard let slice = cgImage.cropping(to: cropRect) else { continue }
                    let sliceImage = UIImage(
                        cgImage: slice,
                        scale: renderer.scale,
                        orientation: .up
                    )
                    sliceImage.draw(in: CGRect(
                        x: 0, y: 0,
                        width: pageWidthPt,
                        height: visibleHeightPt
                    ))
                }
            }
        } catch {
            throw Failure.writeFailed
        }

        return url
    }

    private static func filePrefix(kind: DocumentKind) -> String {
        switch kind {
        case .salesInvoice:         return "invoice"
        case .salesPaymentReceived: return "receipt"
        case .purchaseInvoice:      return "purchase"
        case .purchasePaymentSent:  return "payment"
        }
    }
}
