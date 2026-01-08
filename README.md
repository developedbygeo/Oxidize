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
├── src/                   # React frontend
│   ├── components/ui/     # ShadCN-style base components
│   ├── components/        # App components (Sidebar, Dropzone, Previews)
│   ├── pages/             # Convert, Compress, Beautify, Effects, History
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities, stores, helpers
│   └── types/             # TypeScript types
├── src-tauri/src/         # Rust backend (image processing modules)
└── public/                # Static assets
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT

See [LICENSES.md](LICENSES.md) for third-party dependency licenses.
