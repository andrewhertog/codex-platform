#!/bin/bash -x

INPUT=$1
ENTITLEMENTS=$2
IDENTITY="${CODESIGN_IDENTITY:-Developer ID Application: Your Company Name}"
NEEDS_UNZIP=false

# if folder, zip it
if [ -d "${INPUT}" ]; then
    NEEDS_UNZIP=true
    zip -r -q -y unsigned.zip "${INPUT}"
    rm -rf "${INPUT}"
    INPUT=unsigned.zip
fi

# Unzip if needed
if [ "$NEEDS_UNZIP" = true ]; then
    unzip -qq "${INPUT}"
    
    if [ $? -ne 0 ]; then
        # echo contents if unzip failed
        output=$(cat $INPUT)
        echo "$output"
        exit 1
    fi
    
    rm -f "${INPUT}"
    # Get the directory name that was extracted
    INPUT=$(ls -d */ | head -n 1)
    INPUT=${INPUT%/}
fi

# Sign the app using codesign
echo "Signing ${INPUT} with identity: ${IDENTITY}"
codesign --force --options runtime --deep --sign "${IDENTITY}" --entitlements "${ENTITLEMENTS}" "${INPUT}"

if [ $? -ne 0 ]; then
    echo "Signing failed"
    exit 1
fi

echo "Successfully signed ${INPUT}"
