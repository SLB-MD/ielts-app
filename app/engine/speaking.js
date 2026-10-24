// Chi so co hoc Speaking — Muc 17.6. Khong phai diem, khong phai band.
/** frames: mang RMS theo khung 50 ms. Nguong tu hieu chinh theo on nen (noiseFloor). */
export function countLongSilences(frames, noiseFloor, minMs = 2000, frameMs = 50) {
  const threshold = Math.max(noiseFloor * 2, 0.02);
  const need = Math.round(minMs / frameMs);
  let run = 0, count = 0;
  for (const rms of frames) {
    if (rms < threshold) { run++; if (run === need) count++; }
    else run = 0;
  }
  return count;
}
export function speechMetrics({ spokenMs, totalMs, transcriptWords }) {
  const out = { ratio: totalMs > 0 ? spokenMs / totalMs : 0 };
  if (transcriptWords != null && spokenMs > 0) out.wpm = Math.round(transcriptWords / (spokenMs / 60000));
  return out;
}
