# ishflow iOS Native

SwiftUI iOS 26+ native app. Apple-verbatim, Liquid Glass.

## Build + Run

```bash
xcodebuild \
  -workspace ishflow.xcworkspace \
  -scheme ishflow \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.0' \
  -derivedDataPath build build
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/ishflow.app
xcrun simctl launch booted dev.ishflow.ios
```

