import { AppConstants } from "../constants";

const EXACT_SYSTEM_APPS = new Set<string>([
  "android",
  "com.example.applimiter",
  "com.android.vending",
  "com.google.android.permissioncontroller",
  "com.google.android.packageinstaller",
  "com.coloros.gesture",
  "com.coloros.gallery3d",
  "ai.character.app",
  "com.coloros.wirelesssettings",
  "com.coloros.filemanager",
  "com.sh.smart.caller",
]);

const PREFIX_SYSTEM_APPS: string[] = [
  "android.",
  "com.android.systemui",
  "com.android.settings",
  "com.transsion.",
  "com.transsnet.",
  "com.samsung.android.",
  "com.miui.",
  "com.xiaomi.",
  "com.huawei.",
  "com.oppo.",
  "com.coloros.",
  "com.vivo.",
  "com.oneplus.",
  "com.google.android.gms",
  "com.google.android.apps.nexuslauncher",
  "com.google.android.setupwizard",
  "com.google.android.inputmethod",
  "com.google.android.apps.inputmethod",
];

/**
 * Single source of truth for filtering system/OEM apps out of analytics.
 */
export const isSystemApp = (packageName: string): boolean => {
  if (!packageName || packageName.trim() === "") return true;
  const lower = packageName.toLowerCase();

  if (EXACT_SYSTEM_APPS.has(lower)) return true;
  if (PREFIX_SYSTEM_APPS.some((p) => lower.startsWith(p))) return true;

  // Transsion variant: *.transsion
  if (lower.includes(".transsion")) return true;

  // input methods / keyboards
  if (lower.includes("inputmethod") || lower.includes("keyboard")) return true;

  // sanity: treat unlimited as "not a user app" (only used for safety in callers)
  void AppConstants.UNLIMITED_LIMIT_MINUTES;

  return false;
};


