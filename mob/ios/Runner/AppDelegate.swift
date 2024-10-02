import UIKit
import Flutter
import workmanager
import AppTrackingTransparency

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {

    GeneratedPluginRegistrant.register(with: self)
    WorkmanagerPlugin.registerTask(withIdentifier: "task-identifier")
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
      
  }
    override func applicationDidBecomeActive(_ application: UIApplication) {
        super.applicationDidBecomeActive(application)
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization(completionHandler: { status in
                // Tracking authorization completed. Start loading ads here.
                switch status {
                case .authorized:
                    print("enable tracking")
                case .denied:
                    print("disable tracking")
                default:
                    print("disable tracking")
            }
            })
        }
    }
}
