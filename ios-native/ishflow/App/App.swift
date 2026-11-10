import Auth
import Core
import SwiftUI

@main
struct IshflowApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @State private var container = AppContainer()
    @State private var pendingDeepLink: URL?

    var body: some Scene {
        WindowGroup {
            BiometricGateView {
                AppRoot(container: container, pendingDeepLink: $pendingDeepLink)
            }
            .task {
                delegate.onAPNsToken = { tokenData in
                    Task { await container.registerPushToken(tokenData) }
                }
                delegate.onAPNsFailure = { error in
                    print("APNs registration failed: \(error)")
                }
                delegate.onNotificationTap = { deepLink in
                    pendingDeepLink = URL(string: deepLink)
                }
                delegate.onQuickAction = { deepLink in
                    pendingDeepLink = URL(string: deepLink)
                }
                // BEGIN: stream-1-offline
                await container.reachability.start()
                await container.configureOfflineSync()
                for await isOnline in await container.reachability.observe() {
                    if isOnline {
                        // Drain everything queued while offline — but stop as soon
                        // as a pass fails to shrink the queue, so a persistently
                        // failing head can't spin us in a tight retry loop.
                        var remaining = await container.syncQueue.pendingMutations().count
                        while remaining > 0 {
                            await container.syncQueue.processNext()
                            let now = await container.syncQueue.pendingMutations().count
                            if now >= remaining { break }
                            remaining = now
                        }
                    }
                }
                // END: stream-1-offline
            }
            // BEGIN: stream-2-push
            .task {
                #if !DEBUG
                // Skip the launch-time notification prompt in DEBUG: the system
                // permission alert blocks automated simulator testing. Release
                // builds keep prompting as before.
                _ = try? await PushService.shared.requestAuthorizationIfNeeded()
                #endif
                MetricKitReporter.shared.start()
            }
            // END: stream-2-push
        }
    }
}
