#!/data/data/com.termux/files/usr/bin/bash
set -e
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  grep -q 'android.permission.RECORD_AUDIO' "$MANIFEST" || \
    sed -i 's#<manifest #<manifest \n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n#' "$MANIFEST"
  echo "RECORD_AUDIO permission patched."
else
  echo "Run npx cap add android first."
  exit 1
fi
