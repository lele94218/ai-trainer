#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first:"
    echo "brew install imagemagick"
    exit 1
fi

# Check if iconutil is available (should be on macOS)
if ! command -v iconutil &> /dev/null; then
    echo "iconutil is required but not available. This script must be run on macOS."
    exit 1
fi

# Source PNG file
PNG_FILE="assets/icon.png"

# Create iconset directory
ICONSET_DIR="assets/icon.iconset"
mkdir -p "$ICONSET_DIR"

# Generate different sizes
convert "$PNG_FILE" -resize 16x16 "$ICONSET_DIR/icon_16x16.png"
convert "$PNG_FILE" -resize 32x32 "$ICONSET_DIR/icon_16x16@2x.png"
convert "$PNG_FILE" -resize 32x32 "$ICONSET_DIR/icon_32x32.png"
convert "$PNG_FILE" -resize 64x64 "$ICONSET_DIR/icon_32x32@2x.png"
convert "$PNG_FILE" -resize 128x128 "$ICONSET_DIR/icon_128x128.png"
convert "$PNG_FILE" -resize 256x256 "$ICONSET_DIR/icon_128x128@2x.png"
convert "$PNG_FILE" -resize 256x256 "$ICONSET_DIR/icon_256x256.png"
convert "$PNG_FILE" -resize 512x512 "$ICONSET_DIR/icon_256x256@2x.png"
convert "$PNG_FILE" -resize 512x512 "$ICONSET_DIR/icon_512x512.png"
convert "$PNG_FILE" -resize 1024x1024 "$ICONSET_DIR/icon_512x512@2x.png"

# Convert to icns
iconutil -c icns -o "assets/icon.icns" "$ICONSET_DIR"

# Clean up
rm -rf "$ICONSET_DIR"

echo "Icon successfully created at assets/icon.icns" 