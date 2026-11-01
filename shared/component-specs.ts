export interface ComponentSpecs {
  biosVersion?: string;
  driveType?: string;
  capacity?: string;
  capacityUnit?: string;
  speedGHz?: string;
  coolingType?: string;
}
export function componentProfile(name: string) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (n.includes("motherboard")) return "motherboard";
  if (n.includes("fan") || n.includes("cooling") || n.includes("coolant"))
    return "cooling";
  if (n.includes("processor") || n === "cpu") return "processor";
  if (n === "ram" || n.includes("memory")) return "ram";
  if (
    n.includes("hdd") ||
    n.includes("ssd") ||
    n.includes("harddisk") ||
    n.includes("storage")
  )
    return "storage";
  return "other";
}
