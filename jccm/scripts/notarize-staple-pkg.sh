#!/bin/bash

# Function to handle notarization and verification
notarize_and_verify() {
    architecture=$1
    pkg_path="./out/make/jccm-darwin-$architecture.pkg"

    echo "Submitting $pkg_path for Notarization..."
    xcrun notarytool submit $pkg_path --keychain-profile jccm --wait

    echo "Stapling the Notarization Ticket to $pkg_path..."
    xcrun stapler staple $pkg_path

    echo "Verifying the Notarization of $pkg_path..."
    spctl -a -t install -vv $pkg_path
}

# Log in to Notarytool
echo "Storing notary credentials..."
xcrun notarytool store-credentials jccm --apple-id $APPLE_ID --team-id ${APPLE_TEAM_ID} --password ${APPLE_APP_SPECIFIC_PASSWORD}

# Notarize and verify for both architectures
notarize_and_verify "arm64"
notarize_and_verify "x64"
