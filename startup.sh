#!/bin/bash
echo "=== CWD: $(pwd) ==="
echo "=== /home/site/wwwroot top-level ==="
ls -la /home/site/wwwroot/ 2>&1 | head -30
echo "=== .next directory ==="
ls -la /home/site/wwwroot/.next/ 2>&1 || echo "ERROR: .next not found"
echo "=== BUILD_ID ==="
cat /home/site/wwwroot/.next/BUILD_ID 2>&1 || echo "ERROR: BUILD_ID not found"
echo "=== Starting server ==="
exec node server.js
