#!/bin/bash

APP_PATH="/Users/srho/electron-test/juniper-jccm-project/jccm/out/Juniper Cloud Connection Manager-darwin-arm64/Juniper Cloud Connection Manager.app"
PLIST="/Users/srho/electron-test/juniper-jccm-project/jccm/entitlements.plist"

codesign --sign "Developer ID Application: Simon Rho (9B54K458K9)" --deep --force --timestamp --options runtime --entitlements "${PLIST}" "${APP_PATH}"

