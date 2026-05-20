# Sidecar binaries

This directory holds platform-specific `ffmpeg` and `ffprobe` static binaries that
Tauri bundles into the installer at build time. The binaries themselves are
**not committed to the repo** (too large) — each developer fetches them locally.

## Required naming convention

Tauri's `externalBin` mechanism expects each binary to be named with the Rust
**target triple** suffix for the current platform. Tauri then strips the suffix
at runtime and looks up the right one per platform.

For the most common platforms:

| Platform                   | ffmpeg name                                       | ffprobe name                                       |
| -------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Windows x64                | `ffmpeg-x86_64-pc-windows-msvc.exe`               | `ffprobe-x86_64-pc-windows-msvc.exe`               |
| macOS Intel                | `ffmpeg-x86_64-apple-darwin`                      | `ffprobe-x86_64-apple-darwin`                      |
| macOS Apple Silicon        | `ffmpeg-aarch64-apple-darwin`                     | `ffprobe-aarch64-apple-darwin`                     |
| Linux x64                  | `ffmpeg-x86_64-unknown-linux-gnu`                 | `ffprobe-x86_64-unknown-linux-gnu`                 |

Find your target triple with: `rustc -vV | grep host`

## Quick setup

### Windows (PowerShell)

Run `setup-windows.ps1` from this directory. It downloads the latest static
build from gyan.dev and renames the binaries.

### macOS

```sh
brew install ffmpeg                                  # quick: use system binaries
# OR download static builds from https://evermeet.cx/ffmpeg/
# Drop them in this directory with the target-triple suffix.
```

### Linux

```sh
# Download from https://johnvansickle.com/ffmpeg/
# Extract and rename per the table above.
```

## License note

ffmpeg is licensed under LGPL/GPL depending on build options. The static
binaries from gyan.dev/evermeet.cx are typically built with `--enable-gpl`
which means **this app inherits GPL when distributed with those binaries**.
If that matters for distribution, fetch LGPL-only builds instead.
