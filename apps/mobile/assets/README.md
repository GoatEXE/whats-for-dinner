# Mobile App Assets

## Current files

- `favicon.svg` — dinner plate with fork and knife (copied from `public/favicon.svg`).
  Used as the web favicon via `app.json` → `expo.web.favicon`.

## Missing (needed for full branding)

Expo requires PNG images for native app icons and splash screens. The SVG
above can be rasterized to generate them. Recommended exports:

| File                 | Size        | Usage                                        |
| -------------------- | ----------- | -------------------------------------------- |
| `icon.png`           | 1024 × 1024 | `expo.icon` (iOS + fallback)                 |
| `adaptive-icon.png`  | 1024 × 1024 | `expo.android.adaptiveIcon.foregroundImage`  |
| `splash.png`         | 1242 × 2436 | `expo-splash-screen` plugin `image`          |

Until PNGs are generated, the app uses Expo's default icon on native and
the SVG favicon on web. The splash screen is configured with the brand
orange background color (`#F97316`) but no image.

### Generating PNGs

On a machine with ImageMagick or `sharp` available:

```bash
# Using ImageMagick (requires rsvg support):
magick -background none -density 300 favicon.svg -resize 1024x1024 icon.png

# Or using sharp via npx:
npx sharp-cli -i favicon.svg -o icon.png resize 1024 1024
```

Then update `app.json` to reference the new PNGs and rebuild.
