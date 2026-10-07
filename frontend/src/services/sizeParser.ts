export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  if (!bytes || isNaN(bytes)) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  const formatted = parseFloat((bytes / Math.pow(k, idx)).toFixed(dm));

  return `${formatted} ${sizes[idx]}`;
}

export function parseTargetBytes(
  targetSize?: string,
  targetValue?: number,
  targetUnit?: string
): number | null {
  if (targetValue !== undefined && !isNaN(targetValue) && targetValue > 0) {
    const unit = (targetUnit || "KB").toUpperCase().trim();
    switch (unit) {
      case "B":
        return Math.round(targetValue);
      case "KB":
        return Math.round(targetValue * 1024);
      case "MB":
        return Math.round(targetValue * 1024 * 1024);
      case "GB":
        return Math.round(targetValue * 1024 * 1024 * 1024);
      default:
        return Math.round(targetValue * 1024);
    }
  }

  if (targetSize && targetSize.trim()) {
    const clean = targetSize.trim();
    const match = clean.match(/^([\d.,]+)\s*([a-zA-Z]*)$/);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      const unit = match[2] ? match[2].toUpperCase() : "KB";
      if (!isNaN(num) && num > 0) {
        if (unit.startsWith("G")) return Math.round(num * 1024 * 1024 * 1024);
        if (unit.startsWith("M")) return Math.round(num * 1024 * 1024);
        if (unit.startsWith("K")) return Math.round(num * 1024);
        if (unit === "B" || unit === "") return Math.round(num);
      }
    }
  }

  return null;
}
