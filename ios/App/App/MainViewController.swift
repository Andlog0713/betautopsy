import UIKit
import Capacitor

/// Subclass of `CAPBridgeViewController` that wires up native gestures
/// and any other post-load WKWebView config.
///
/// `capacitorDidLoad()` is the documented hook (see
/// `CAPBridgeViewController.swift` in @capacitor/ios) that runs after
/// the bridge has been initialized and the `webView` property is set.
///
/// Don't move this configuration into `AppDelegate.swift`'s
/// `didFinishLaunchingWithOptions`: at that point the storyboard's
/// root view controller hasn't been instantiated yet, so the
/// `webView` is nil and the assignment silently no-ops.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Native iOS edge-swipe to go back / forward through the
        // webview's navigation history. Without this users can't
        // pop back through nested routes the way they expect from
        // every other iOS app.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
