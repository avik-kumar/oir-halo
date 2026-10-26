#!/usr/bin/env sh
cd "$(dirname "$0")/.." || exit 1
echo "Serving FSGP Halo sim at http://localhost:8080"
npx --yes serve . -l 8080
