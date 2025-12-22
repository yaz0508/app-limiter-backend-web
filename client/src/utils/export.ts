export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportUsageToCSV = (summary: { byApp: any[]; start: string; end: string }) => {
  const data = summary.byApp.map((app) => ({
    App: app.appName,
    "Package Name": app.packageName,
    "Total Minutes": app.totalMinutes.toFixed(2),
    "Total Seconds": app.totalSeconds,
    Sessions: app.sessions,
  }));

  const dateRange = `${new Date(summary.start).toLocaleDateString()} - ${new Date(summary.end).toLocaleDateString()}`;
  exportToCSV(data, `usage-report-${dateRange.replace(/\s/g, "-")}`);
};

export const exportUsersToCSV = (users: any[]) => {
  const data = users.map((u) => ({
    Name: u.name,
    Email: u.email,
    Role: u.role,
    "Device Count": u.deviceCount || 0,
  }));
  exportToCSV(data, "users-export");
};

export const exportDevicesToCSV = (devices: any[]) => {
  const data = devices.map((d) => ({
    Name: d.name,
    "Device Identifier": d.deviceIdentifier,
    OS: d.os || "Unknown",
    "User Name": d.user?.name || "Unknown",
    "User Email": d.user?.email || "Unknown",
  }));
  exportToCSV(data, "devices-export");
};
