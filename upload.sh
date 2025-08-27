#!/bin/bash

PATHS="acid-banger what-the-gizz"

for path in ${PATHS}; do
    echo "> $path"
    cd "${path}" || continue
    ./upload.sh
    cd ..
done
