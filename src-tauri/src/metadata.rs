//! Metadata extraction helpers used by the preserve-metadata toggle.
//!
//! Currently scoped to JPEG APP marker segments — that's enough to round-trip
//! EXIF (APP1, "Exif\0\0…") and ICC color profiles (APP2, "ICC_PROFILE\0…")
//! through `compress_jpeg_with_markers`. PNG metadata preservation is handled
//! by oxipng's `StripChunks::None` mode directly on the source bytes, so it
//! doesn't need this module at all.

/// Walk a JPEG byte stream and return the payload of every APPn segment whose
/// `n` is in `wanted`. Each returned tuple is `(n, payload)` where `payload` is
/// the segment's content with the 2-byte length header already stripped — the
/// exact shape `mozjpeg::Compress::write_marker` expects.
///
/// Returns an empty vec on any of:
/// - input shorter than the SOI marker (`FF D8`)
/// - missing SOI
/// - any segment with a malformed length field
/// - we hit SOS (`FF DA`, start of scan) — there are no metadata markers past
///   the entropy-coded data
pub fn read_jpeg_app_segments(data: &[u8], wanted: &[u8]) -> Vec<(u8, Vec<u8>)> {
    let mut out = Vec::new();
    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return out;
    }
    let mut i = 2;
    while i + 1 < data.len() {
        // Markers can be padded with extra 0xFF bytes ("fill bytes"); skip them.
        if data[i] != 0xFF {
            return out;
        }
        let mut j = i + 1;
        while j < data.len() && data[j] == 0xFF {
            j += 1;
        }
        if j >= data.len() {
            return out;
        }
        let marker = data[j];
        i = j + 1;

        // Standalone markers (no length, no payload): SOI/EOI/RST*/TEM.
        if marker == 0xD9 // EOI
            || marker == 0xD8 // SOI (shouldn't reoccur but be safe)
            || marker == 0x01 // TEM
            || (0xD0..=0xD7).contains(&marker)
        // RST0..RST7
        {
            if marker == 0xD9 {
                return out;
            }
            continue;
        }

        // SOS — past this is entropy-coded data; bail. Anything we wanted
        // would have been seen by now.
        if marker == 0xDA {
            return out;
        }

        // Everything else has a 2-byte big-endian length INCLUDING the length
        // bytes themselves.
        if i + 2 > data.len() {
            return out;
        }
        let len = u16::from_be_bytes([data[i], data[i + 1]]) as usize;
        if len < 2 || i + len > data.len() {
            return out;
        }
        let payload_start = i + 2;
        let payload_end = i + len;

        if (0xE0..=0xEF).contains(&marker) {
            let app_n = marker - 0xE0;
            if wanted.contains(&app_n) {
                out.push((app_n, data[payload_start..payload_end].to_vec()));
            }
        }
        i = payload_end;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a minimal JPEG byte stream containing the requested APP segments
    /// followed by SOS. Not a valid decodable JPEG — just enough structure for
    /// the parser to walk.
    fn jpeg_with_app_segments(segments: &[(u8, &[u8])]) -> Vec<u8> {
        let mut out = vec![0xFF, 0xD8]; // SOI
        for (app_n, payload) in segments {
            out.push(0xFF);
            out.push(0xE0 + app_n);
            let len = (payload.len() + 2) as u16;
            out.extend_from_slice(&len.to_be_bytes());
            out.extend_from_slice(payload);
        }
        out.push(0xFF);
        out.push(0xDA); // SOS — parser bails here
        out
    }

    #[test]
    fn returns_empty_for_inputs_without_an_soi() {
        assert!(read_jpeg_app_segments(&[], &[1]).is_empty());
        assert!(read_jpeg_app_segments(&[0xFF], &[1]).is_empty());
        assert!(read_jpeg_app_segments(&[0xFF, 0xE0, 0x00, 0x02], &[0]).is_empty());
    }

    #[test]
    fn extracts_a_single_app1_exif_segment() {
        let exif = b"Exif\0\0TIFF-data-goes-here";
        let jpeg = jpeg_with_app_segments(&[(1, exif)]);
        let got = read_jpeg_app_segments(&jpeg, &[1]);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].0, 1);
        assert_eq!(got[0].1, exif);
    }

    #[test]
    fn extracts_both_app1_and_app2_when_both_requested() {
        let exif = b"Exif\0\0TIFF...";
        let icc = b"ICC_PROFILE\0\x01\x02icc-bytes";
        let jpeg = jpeg_with_app_segments(&[(1, exif), (2, icc)]);
        let got = read_jpeg_app_segments(&jpeg, &[1, 2]);
        assert_eq!(got.len(), 2);
        assert_eq!(got[0], (1, exif.to_vec()));
        assert_eq!(got[1], (2, icc.to_vec()));
    }

    #[test]
    fn skips_app_segments_not_in_the_wanted_set() {
        let exif = b"Exif\0\0...";
        let icc = b"ICC_PROFILE\0\x01\x01...";
        let jpeg = jpeg_with_app_segments(&[(1, exif), (2, icc)]);
        let got = read_jpeg_app_segments(&jpeg, &[1]);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].0, 1);
    }

    #[test]
    fn handles_extra_fill_bytes_between_segments() {
        // Some encoders pad with extra 0xFF bytes — `FF FF FF E1 ...` should
        // still parse as APP1.
        let mut jpeg = vec![0xFF, 0xD8, 0xFF, 0xFF, 0xFF, 0xE1, 0x00, 0x08];
        jpeg.extend_from_slice(b"Exif\0\0");
        jpeg.extend_from_slice(&[0xFF, 0xDA]); // SOS
        let got = read_jpeg_app_segments(&jpeg, &[1]);
        assert_eq!(got.len(), 1);
        assert_eq!(&got[0].1, b"Exif\0\0");
    }

    #[test]
    fn returns_what_was_parsed_so_far_when_a_segment_length_overruns() {
        // Build: SOI + APP1 (valid) + APP2 with a length that runs off the end.
        let mut jpeg = vec![0xFF, 0xD8];
        // Valid APP1
        jpeg.extend_from_slice(&[0xFF, 0xE1, 0x00, 0x08]); // len=8 incl header
        jpeg.extend_from_slice(b"Exif\0\0");
        // Malformed APP2 — length 0xFFFF but no data
        jpeg.extend_from_slice(&[0xFF, 0xE2, 0xFF, 0xFF, 0x01, 0x02]);
        let got = read_jpeg_app_segments(&jpeg, &[1, 2]);
        // We keep what we got before the bad segment.
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].0, 1);
    }

    #[test]
    fn stops_at_sos_so_we_dont_scan_entropy_coded_data() {
        // Two APP segments before SOS, then garbage that looks like markers
        // after SOS. Parser should ignore the garbage.
        let exif = b"Exif\0\0EXIF";
        let mut jpeg = jpeg_with_app_segments(&[(1, exif)]);
        // Garbage that would look like a fake APP1 if we kept scanning.
        jpeg.extend_from_slice(&[0xFF, 0xE1, 0x00, 0x04, 0x99, 0x99]);
        let got = read_jpeg_app_segments(&jpeg, &[1]);
        assert_eq!(got.len(), 1);
    }
}
