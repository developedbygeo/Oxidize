# Oxidize

A fast, modern desktop image processing app built with Tauri 2, React 19, and Rust.

## Features

- **Convert** - Transform images between formats (PNG, JPG, WebP, GIF, BMP, ICO, TIFF)
- **Compress** - Reduce file sizes with advanced compression algorithms
- **Beautify** - Enhance images with brightness, contrast, saturation, sharpness, exposure, hue shift, temperature, and white balance adjustments
- **Effects** - Apply visual effects including grayscale, sepia, vintage, blur, sharpen, invert, vignette, noise, pixelate, and posterize
- **History** - Track all operations with persistent history

### Real-Time Preview

Both Beautify and Effects pages feature real-time canvas-based previews, allowing you to see adjustments instantly before applying them. The preview uses debounced processing for smooth slider interactions.

### Compression Technology

Oxidize uses industry-leading compression libraries for maximum quality and size reduction:

| Format | Method | Typical Savings |
|--------|--------|-----------------|
| **PNG** | oxipng (lossless) + exoquant color quantization (lossy) | ~75% |
| **JPEG** | mozjpeg for superior compression | ~67% |
| **WebP** | Native WebP encoding with quality control | ~87% |
| **GIF** | Color reduction with Floyd-Steinberg dithering | Varies |
| **BMP** | Converts to optimized PNG (BMP is uncompressed) | ~75% |
| **TIFF** | Converts to optimized PNG (TIFF is often uncompressed) | ~75% |

## Tech Stack

**Frontend**
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack React Table
- Motion (animations)
- ShadCN/ui components
- Lodash (debouncing)

**Backend**
- Tauri 2
- Rust
- rayon (parallel processing)
- image, oxipng, mozjpeg, webp, gif, exoquant crates

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/oxidize.git
cd oxidize

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Building

```bash
# Build for production
pnpm tauri build
```

## Project Structure

```
oxidize/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ui/             # ShadCN-style base components
│   │   ├── ImageDropzone   # Drag-and-drop image upload
│   │   ├── ImagePreview    # Real-time beautify preview
│   │   └── EffectsPreview  # Real-time effects preview
│   ├── pages/              # Page components
│   │   ├── ConvertPage     # Image format conversion
│   │   ├── CompressPage    # Image compression
│   │   ├── BeautifyPage    # Image adjustments
│   │   ├── EffectsPage     # Visual effects
│   │   └── HistoryPage     # Operation history
│   ├── lib/                # Utilities and stores
│   │   ├── utils.ts        # Class merging utilities
│   │   ├── history-store   # Persistent history storage
│   │   └── image-preview   # Canvas-based preview processing
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── src-tauri/              # Tauri/Rust backend
│   ├── src/
│   │   ├── lib.rs          # App entry point and command registration
│   │   ├── types.rs        # Shared types (ImageInfo, results, options)
│   │   ├── utils.rs        # Format detection utilities
│   │   ├── loader.rs       # Image loading and preview generation
│   │   ├── convert.rs      # Format conversion
│   │   ├── compress.rs     # PNG/JPEG/WebP/GIF/BMP/TIFF compression
│   │   ├── beautify.rs     # Image adjustments (brightness, contrast, etc.)
│   │   ├── effects.rs      # Visual effects (grayscale, sepia, blur, etc.)
│   │   └── commands.rs     # File explorer commands
│   ├── capabilities/       # Permission configs
│   └── Cargo.toml          # Rust dependencies
└── package.json
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT

See [LICENSES.md](LICENSES.md) for third-party dependency licenses.
