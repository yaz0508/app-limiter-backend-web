type OneSignalNotificationPayload = {
  headings?: Record<string, string>;
  contents: Record<string, string>;
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  data?: Record<string, any>;
};

const ONESIGNAL_APP_ID_DEFAULT = "370953fe-f15f-4226-9335-e63686be6b06";

const getOneSignalConfig = () => {
  const appId = process.env.ONESIGNAL_APP_ID || ONESIGNAL_APP_ID_DEFAULT;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  const adminPlayerId = process.env.ONESIGNAL_ADMIN_PLAYER_ID;
  const adminExternalUserId = process.env.ONESIGNAL_ADMIN_EXTERNAL_USER_ID;
  return { appId, restApiKey, adminPlayerId, adminExternalUserId };
};

export const sendOneSignalNotificationToAdmin = async (
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const { appId, restApiKey, adminPlayerId, adminExternalUserId } =
    getOneSignalConfig();

  // Hard requirement: we must have REST API key + a concrete target (one phone).
  if (!restApiKey) {
    console.warn(
      "[OneSignal] Missing ONESIGNAL_REST_API_KEY; skipping notification"
    );
    return;
  }

  const payload: OneSignalNotificationPayload = {
    headings: { en: title },
    contents: { en: message },
    data,
  };

  if (adminPlayerId) {
    payload.include_player_ids = [adminPlayerId];
  } else if (adminExternalUserId) {
    payload.include_external_user_ids = [adminExternalUserId];
  } else {
    console.warn(
      "[OneSignal] Missing ONESIGNAL_ADMIN_PLAYER_ID (or ONESIGNAL_ADMIN_EXTERNAL_USER_ID); skipping notification"
    );
    return;
  }

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      ...payload,
    }),
  });

  // OneSignal may still return JSON on errors; keep this best-effort.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[OneSignal] Failed to send notification", res.status, text);
  }
};


