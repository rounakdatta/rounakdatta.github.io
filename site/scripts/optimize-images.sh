#!/bin/bash
# Optimize images in-place before commit
# Keeps original extensions, compresses for web

IMAGES_DIR="site/public/images"

echo "Optimizing images..."

# Optimize JPEGs (quality 85, strip metadata)
find "$IMAGES_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read img; do
  echo "Optimizing: $img"
  magick "$img" -quality 85 -strip "$img"
done

# Optimize PNGs (compress)
find "$IMAGES_DIR" -type f -iname "*.png" | while read img; do
  echo "Optimizing: $img"
  magick "$img" -quality 90 -strip "$img"
done

# Optimize WebPs
find "$IMAGES_DIR" -type f -iname "*.webp" | while read img; do
  echo "Optimizing: $img"
  magick "$img" -quality 85 "$img"
done

echo "Done!"
