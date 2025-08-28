#!/bin/bash

REMOTE=${1:-zykure.de}

echo "Uploading to $REMOTE ..."
sftp -b "batchfile.sftp" "${REMOTE}"
