#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../ios-native"
swiftlint --strict
swiftformat --lint .
