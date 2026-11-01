# admin-ui test

`test_cloudpackage.mjs` (fix 55c): "Sync To Cloud Server", "Subscribe to Content Package" and
"Download Missing Content Files" are shown only when the box has a Box ID and a Cloud Server URL is
saved (a URL typed but not saved does not count). Runs `src/js/admin/cloudpackage.js` with stand-in
page elements.

```
bash tests/run.sh        # Node 16 or later, no npm install needed
```

Result on 2026-11-01 (7ebac19): 8 passed, 0 failed.
See connectbox-pi `docs/testing.md` for all tests and when to run them.
