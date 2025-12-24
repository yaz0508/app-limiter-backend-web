import { prisma } from "../prisma/client";

// Helper function to extract a readable app name from a package name
const extractAppNameFromPackage = (packageName: string): string => {
  if (!packageName) return packageName;
  
  // Split by dots
  const parts = packageName.split('.');
  
  // Remove common prefixes (com, org, net, etc.)
  const meaningfulParts = parts.filter(part => 
    part && 
    part !== 'com' && 
    part !== 'org' && 
    part !== 'net' && 
    part !== 'io' &&
    part !== 'android' &&
    part !== 'app'
  );
  
  if (meaningfulParts.length === 0) {
    // If no meaningful parts, use the last part
    const lastPart = parts[parts.length - 1];
    return capitalizeWords(lastPart);
  }
  
  // Take the last meaningful part(s)
  // For cases like "com.facebook.lite", we want "Facebook Lite"
  // For cases like "wp.wattpad", we want "Wattpad"
  const lastPart = meaningfulParts[meaningfulParts.length - 1];
  const secondLastPart = meaningfulParts.length > 1 ? meaningfulParts[meaningfulParts.length - 2] : null;
  
  // Handle common company patterns (facebook, google, microsoft, etc.)
  // If secondLastPart is a known company name, combine it with the last part
  const knownCompanies = ['facebook', 'google', 'microsoft', 'amazon', 'apple', 'twitter', 'instagram', 'whatsapp', 'telegram'];
  if (secondLastPart && knownCompanies.includes(secondLastPart.toLowerCase())) {
    return `${capitalizeWords(secondLastPart)} ${capitalizeWords(lastPart)}`;
  }
  
  // Handle single-word packages like "wattpad" from "wp.wattpad"
  if (meaningfulParts.length === 1) {
    return capitalizeWords(lastPart);
  }
  
  // Default: use the last meaningful part
  return capitalizeWords(lastPart);
};

// Helper to capitalize words (e.g., "facebook" -> "Facebook", "wattpad" -> "Wattpad")
const capitalizeWords = (str: string): string => {
  if (!str) return str;
  // Split by common separators and capitalize each word
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const findOrCreateApp = async (
  packageName: string,
  name?: string
) => {
  const existing = await prisma.app.findUnique({ where: { packageName } });
  if (existing) {
    // Update the app name if a new name is provided and it's different
    if (name && name !== existing.name && name !== packageName) {
      return prisma.app.update({
        where: { packageName },
        data: { name },
      });
    }
    // If existing app has package name as name, try to improve it
    if (existing.name === packageName || !existing.name) {
      const improvedName = extractAppNameFromPackage(packageName);
      if (improvedName !== packageName) {
        return prisma.app.update({
          where: { packageName },
          data: { name: improvedName },
        });
      }
    }
    return existing;
  }

  // Use provided name, or extract from package name, or fallback to package name
  const finalName = name || extractAppNameFromPackage(packageName) || packageName;

  return prisma.app.create({
    data: {
      packageName,
      name: finalName,
    },
  });
};

export const listApps = async () => {
  return prisma.app.findMany({
    orderBy: { name: "asc" },
  });
};

export const getAppsUsedOnDevice = async (deviceId: string) => {
  // Get unique apps that have usage logs for this device
  const usageLogs = await prisma.usageLog.findMany({
    where: { deviceId },
    select: {
      app: {
        select: {
          id: true,
          name: true,
          packageName: true,
        },
      },
    },
  });

  // Extract unique apps
  const uniqueApps = new Map<string, { id: string; name: string; packageName: string }>();
  for (const log of usageLogs) {
    if (log.app && !uniqueApps.has(log.app.id)) {
      uniqueApps.set(log.app.id, log.app);
    }
  }

  // Sort by name
  return Array.from(uniqueApps.values()).sort((a, b) => a.name.localeCompare(b.name));
};


