#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../android-native"

echo "▸ ktlint"
ktlint --relative --color "**/*.kt" "**/*.kts"

echo "▸ detekt"
detekt --config config/detekt/detekt.yml --build-upon-default-config

echo "▸ Android Lint"
./gradlew lint --quiet

echo "✓ android-native pre-commit checks passed"
