#!/bin/bash -x

INPUT=$1
APP_ID=$2
IDENTITY="${CODESIGN_IDENTITY:-Developer ID Application: Your Company Name}"
APPLE_ID="${APPLE_ID:-your.email@example.com}"
APPLE_PASSWORD="${APPLE_PASSWORD:-@keychain:AC_PASSWORD}"
TEAM_ID="${TEAM_ID:-YOUR_TEAM_ID}"

echo "Preparing to notarize ${INPUT} with bundle ID ${APP_ID}"

# Create a temporary zip file for notarization
ZIP_FILE="notarize_app.zip"
echo "Creating zip file for notarization..."
ditto -c -k --keepParent "${INPUT}" "${ZIP_FILE}"

# Submit for notarization
echo "Submitting for notarization..."
xcrun notarytool submit "${ZIP_FILE}" \
  --apple-id "${APPLE_ID}" \
  --password "${APPLE_PASSWORD}" \
  --team-id "${TEAM_ID}" \
  --wait

if [ $? -ne 0 ]; then
    echo "Notarization submission failed"
    rm -f "${ZIP_FILE}"
    exit 1
fi

# Clean up the zip file
rm -f "${ZIP_FILE}"

# Staple the notarization ticket to the app
echo "Stapling notarization ticket to ${INPUT}..."
xcrun stapler staple "${INPUT}"

if [ $? -ne 0 ]; then
    echo "Stapling failed"
    exit 1
fi

echo "Successfully notarized and stapled ${INPUT}"
