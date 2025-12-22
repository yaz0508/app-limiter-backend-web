# Device Registration Guide

## Automatic Device Registration (Android App)

When a user logs in or registers on the Android app, the device is **automatically registered** and linked to their account.

### How It Works

1. **User logs in/registers** → Authentication token is saved
2. **Device registration runs automatically:**
   - Uses Android ID as the device identifier
   - Device name: `{MANUFACTURER} {MODEL}` (e.g., "Samsung Galaxy S21")
   - Backend links the device to the authenticated user's account
3. **Device appears in admin dashboard** linked to that user

### Troubleshooting Automatic Registration

If the device is not automatically registered:

1. **Check Android logs:**
   - Look for `[LoginViewModel]` and `[UsageRepository]` log messages
   - Should see: "Login successful, registering device..."
   - Should see: "Device registered successfully: {deviceIdentifier}"

2. **Common issues:**
   - **No auth token:** Device registration requires a valid authentication token
   - **Network error:** Check internet connection
   - **Backend error:** Check backend logs for device creation errors
   - **Android ID unavailable:** Rare, but can happen on some devices

3. **Device will be registered later:**
   - If automatic registration fails, the device will be registered during the next sync operation
   - The app will retry device registration when syncing usage data

---

## Manual Device Registration (Admin Dashboard)

Admins can manually register devices through the web dashboard for testing or edge cases.

### How to Manually Add a Device

1. **Go to Devices page** in the admin dashboard
2. **Fill out the form:**
   - **Name:** Device name (e.g., "John's iPhone", "Test Device")
   - **OS:** Operating system (e.g., "Android", "iOS")
   - **Device Identifier:** Unique identifier for the device
     - For Android: Android ID (can be found in device settings or via ADB)
     - For iOS: UDID or other unique identifier
3. **Click "Save device"**
4. **Device appears in the devices list**

### Important Notes for Manual Registration

- **Device Identifier must be unique:** Each device must have a unique identifier
- **Device is linked to admin account:** When an admin manually creates a device, it's linked to their account
- **To link to a specific user:** The backend automatically links devices to the authenticated user (admin in this case)
- **For testing:** Manual registration is useful for:
  - Testing device management features
  - Registering devices that can't use the Android app
  - Edge cases where automatic registration failed

### Finding Device Identifiers

**Android:**
- Use ADB: `adb shell settings get secure android_id`
- Or check device logs when the app runs
- Android ID is a 64-bit hex string

**iOS:**
- UDID can be found in Xcode or iTunes
- Or use device management tools

---

## Device Linking

### Automatic Linking (Android App)
- Device is **automatically linked** to the user who logs in/registers
- Uses the authentication token to identify the user
- Happens immediately after successful login/registration

### Manual Linking (Admin Dashboard)
- When an admin manually creates a device, it's linked to the **admin's account**
- To link to a different user, you would need to:
  1. Have that user log in on the Android app (automatic)
  2. Or use the backend API directly with that user's token

---

## API Details

### Automatic Registration (Android)
```
POST /api/devices
Authorization: Bearer {user_token}
Body: {
  "name": "Samsung Galaxy S21",
  "os": "Android",
  "deviceIdentifier": "{android_id}",
  "userId": null  // Backend uses token to identify user
}
```

### Manual Registration (Admin)
```
POST /api/devices
Authorization: Bearer {admin_token}
Body: {
  "name": "Test Device",
  "os": "iOS",
  "deviceIdentifier": "{unique_id}",
  "userId": null  // Backend links to admin's account
}
```

---

## Troubleshooting

### Device Not Appearing After Login

1. **Check Android logs** for registration errors
2. **Check backend logs** for device creation errors
3. **Verify authentication token** is valid
4. **Check network connectivity**
5. **Try syncing usage data** - this will also trigger device registration

### Manual Device Creation Fails

1. **Check device identifier is unique** - must not already exist
2. **Verify you're logged in as admin**
3. **Check backend logs** for specific error messages
4. **Ensure all required fields are filled**

### Device Shows "Unknown" User

- This means the device has an invalid `userId` (orphaned device)
- The backend filters these out automatically
- If you see this, the device needs to be re-registered

---

## Best Practices

1. **Let automatic registration work:** Don't manually register devices unless necessary
2. **Use manual registration for testing only**
3. **Keep device identifiers unique:** Never reuse identifiers
4. **Monitor logs:** Check both Android and backend logs for registration issues
