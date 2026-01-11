#!/bin/bash
set -e

cd /home/kavia/workspace/code-generation/roadrescue-quickassist-platform-41193-41202/frontend_user_website

# Ensure dependencies are present for CI builds.
npm install

npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

