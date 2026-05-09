#!/bin/bash
git add .
git commit -m "$(gshuf -n1 -e "Update project" "Fix bugs" "Refactor code" "Improve performance" "Minor cleanup")"
git push origin main