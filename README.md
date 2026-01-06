# Oxidize

A fast, modern desktop image processing app built with Tauri 2, React 19, and Rust.

## Features

- **Convert** - Transform images between formats (PNG, JPG, WebP, GIF, BMP, ICO, TIFF)
- **Compress** - Reduce file sizes with advanced compression algorithms
- **Beautify** - Enhance images with filters and adjustments (coming soon)
- **Effects** - Apply visual effects and transformations (coming soon)
- **History** - Track all operations with persistent history

### Compression Technology

Oxidize uses industry-leading compression libraries for maximum quality and size reduction:

- **PNG**: oxipng for lossless optimization, imagequant for lossy color quantization
- **JPEG**: mozjpeg for superior compression ratios
- **WebP**: Native WebP encoding with quality control

## Tech Stack

**Frontend**
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack React Table
- Motion (animations)
- ShadCN/ui components

**Backend**
- Tauri 2
- Rust
- rayon (parallel processing)
- image, oxipng, mozjpeg, webp crates

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
│   ├── pages/              # Page components
│   ├── lib/                # Utilities and stores
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── src-tauri/              # Tauri/Rust backend
│   ├── src/                # Rust source code
│   ├── capabilities/       # Permission configs
│   └── Cargo.toml          # Rust dependencies
└── package.json
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
