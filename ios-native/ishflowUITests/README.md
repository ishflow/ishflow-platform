# ishflowUITests

XCUITest target covering the demo-mode golden path (skip-auth → dashboard → sales wizard
→ post). Lives outside the SPM test packages because it drives the full app process.

## Running

GitHub Actions runners do not have Xcode 26 installed, so this target does not run in CI.
Run locally on a Mac with Xcode 26 and the iPhone 17 (iOS 26.4) simulator:

```
xcodebuild test \
  -workspace ios-native/ishflow.xcworkspace \
  -scheme ishflow \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.4.1' \
  -only-testing:ishflowUITests
```

## Tests

- `testSkipPreviewToDashboardToWizard` — skip auth → Dashboard → Sales → opens wizard,
  cancels back to list. ~10s.
- `testFullWizardFlowWithLineEditingAndPost` — full wizard: pick customer / warehouse /
  price type, add product, edit quantity to 5, post. ~45s. Asserts dismissal back to the
  Sales list.

Both tests rely on the demo-mode seed (UUIDs `…000000020`, `…000000040`, `…000000050`,
`…000000070`). If the seed changes, update the picker accessibility identifiers in
`GoldenPathTests.swift`.
