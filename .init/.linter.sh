#!/bin/bash
cd /home/kavia/workspace/code-generation/roadrescue-quickassist-platform-41193-41202/frontend_user_website
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

