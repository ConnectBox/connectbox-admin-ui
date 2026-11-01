#!/bin/bash
# Fix 55c: shows/hides the Cloud Server items (src/js/admin/cloudpackage.js) with stand-in page elements.
# usage: bash tests/run.sh          (Node 16 or later; no npm install needed)
HERE=$(dirname "$(realpath "$0")"); D=$(mktemp -d); trap 'rm -rf "$D"' EXIT
cp "$HERE/../src/js/admin/cloudpackage.js" "$D/cloudpackage.mjs"; cp "$HERE/test_cloudpackage.mjs" "$D/"
node "$D/test_cloudpackage.mjs"
