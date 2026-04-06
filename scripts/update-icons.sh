#!/bin/bash

# Icon Update Script
# Copies new icons from NEW_ICONS/ to their proper locations in the project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/NEW_ICONS"
PUBLIC_DIR="$SCRIPT_DIR/public"

# Check if NEW_ICONS directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: NEW_ICONS directory not found at $SOURCE_DIR"
    exit 1
fi

echo "Updating icons from NEW_ICONS..."

# Define the mapping: source -> destination
# Format: "source_filename" "destination_path"
declare -A ICON_MAP=(
    # Favicon files
    ["labitat-16x16.png"]="public/favicon-16x16.png"
    ["labitat-32x32.png"]="public/favicon-32x32.png"
    ["labitat.ico"]="public/favicon.ico"
    ["labitat-32x32.png"]="public/favicon.png"
    
    # Apple touch icons
    ["labitat-120x120.png"]="public/apple-touch-icon-120x120.png"
    ["labitat-152x152.png"]="public/apple-touch-icon-152x152.png"
    ["labitat-180x180.png"]="public/apple-touch-icon.png"
    
    # PWA icons
    ["labitat-96x96.png"]="public/icons/icon-96x96.png"
    ["labitat-144x144.png"]="public/icons/icon-144x144.png"
    ["labitat-152x152.png"]="public/icons/icon-152x152.png"
    ["labitat-192x192.png"]="public/icons/icon-192x192.png"
    ["labitat-384x384.png"]="public/icons/icon-384x384.png"
    ["labitat-512x512.png"]="public/icons/icon-512x512.png"
    ["labitat-512x512.png"]="public/icons/icon-maskable-512x512.png"
)

# Track if any files were updated
updated=0

# Copy icons
for source_file in "${!ICON_MAP[@]}"; do
    dest_path="${ICON_MAP[$source_file]}"
    source_path="$SOURCE_DIR/$source_file"
    full_dest_path="$SCRIPT_DIR/$dest_path"
    
    if [ -f "$source_path" ]; then
        # Create destination directory if it doesn't exist
        mkdir -p "$(dirname "$full_dest_path")"
        
        # Copy the file
        cp "$source_path" "$full_dest_path"
        echo "✓ Copied $source_file -> $dest_path"
        updated=$((updated + 1))
    else
        echo "⚠ Source file not found: $source_file"
    fi
done

# Also copy the SVG icon if it exists
if [ -f "$SOURCE_DIR/ICON.svg" ]; then
    cp "$SOURCE_DIR/ICON.svg" "$SCRIPT_DIR/ICON.svg"
    echo "✓ Copied ICON.svg"
    updated=$((updated + 1))
elif [ -f "$SCRIPT_DIR/ICON.svg" ]; then
    echo "⚠ ICON.svg not found in NEW_ICONS, keeping existing"
fi

echo ""
echo "Icon update complete! Updated $updated file(s)."
echo ""
echo "Note: If you need different sizes that aren't in NEW_ICONS, you may need to:"
echo "  1. Generate them using a tool like ImageMagick or an online favicon generator"
echo "  2. Add them to the ICON_MAP in this script"
