#!/bin/bash

# Transforms JSON input to a JavaScript include file.
# Input must be a valid lyrics database.

if [ -z "$1" ]; then
    echo "Usage: $0 <input.json> [output.js]"
    exit 1
fi

INFILE="${1}"
OUTFILE="${2:-all_lyrics.js}"


echo "Writing output file: $OUTFILE"
echo "const all_lyrics = " > "$OUTFILE"
cat "$INFILE" >> "$OUTFILE"
