import SwiftUI
#if canImport(Metal)
import Metal
#endif

/// Full-bleed animated "aurora" background used behind every onboarding screen.
///
/// Renders the brand-blue flow shader (`Aurora.metal`) animated with a
/// `TimelineView(.animation)`. If the Metal shader library or the `aurora`
/// function cannot be resolved on the current device, it transparently falls
/// back to a static brand gradient so the screen is **never** blank. The
/// dark/light palette is chosen from the SwiftUI `colorScheme` environment.
public struct AuroraBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let dark = colorScheme == .dark
            ZStack {
                // Gradient base is always present: it is the graceful fallback
                // when the shader is unavailable and also a sensible backdrop
                // while the first shader frame is computed.
                AuroraGradient.fill(dark: dark)

                if AuroraShader.isAvailable {
                    TimelineView(.animation) { timeline in
                        let elapsed = timeline.date.timeIntervalSinceReferenceDate
                        Rectangle()
                            .fill(
                                ShaderLibrary
                                    .bundle(AuroraShader.bundle)
                                    .aurora(
                                        .float(elapsed),
                                        .float(dark ? 1 : 0),
                                        .float2(size.width, size.height)
                                    )
                            )
                    }
                    .drawingGroup()
                }
            }
            .frame(width: size.width, height: size.height)
        }
        .ignoresSafeArea()
    }
}

/// Static brand gradient used as the shader fallback and initial backdrop.
enum AuroraGradient {
    static func fill(dark: Bool) -> some View {
        let stops: [Color] = dark
            ? [
                Color(red: 0.02, green: 0.03, blue: 0.06),
                Color(red: 0.04, green: 0.10, blue: 0.30),
                Color(red: 0.059, green: 0.369, blue: 0.937)
            ]
            : [
                Color(red: 0.957, green: 0.965, blue: 0.98),
                Color(red: 0.690, green: 0.914, blue: 0.992),
                Color(red: 0.059, green: 0.369, blue: 0.937).opacity(0.45)
            ]
        return LinearGradient(
            colors: stops,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// Resolves and caches whether the bundled `aurora` Metal function is usable.
///
/// SwiftUI `Shader` failures surface only at render time (a blank fill), so the
/// availability is probed up-front against the module's compiled metallib. The
/// `.metal` file in this target is compiled by SwiftPM into a resource bundle;
/// `Bundle.module` is its location.
enum AuroraShader {
    /// Bundle that owns the compiled `Aurora.metal` (this SwiftPM module).
    static let bundle: Bundle = .module

    /// True when a Metal device exists, the module's `default.metallib` loads,
    /// and it exports the `aurora` function. Computed once.
    static let isAvailable: Bool = probe()

    private static func probe() -> Bool {
        #if canImport(Metal)
        guard let device = MTLCreateSystemDefaultDevice() else { return false }
        guard let url = bundle.url(forResource: "default", withExtension: "metallib"),
              let library = try? device.makeLibrary(URL: url)
        else { return false }
        return library.functionNames.contains("aurora")
        #else
        return false
        #endif
    }
}
