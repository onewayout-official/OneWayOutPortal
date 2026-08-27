import type { PlatformUserSummary } from "@/lib/usersAdminApi";

export const USER_EXPORT_COLUMNS = [
  "Name",
  "Email",
  "Mobile",
  "Status",
  "Wallet Balance",
  "Total Points",
  "Joined",
] as const;

function formatExportDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatWalletBalance(amount: number) {
  return `R ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function userToExportRow(user: PlatformUserSummary): string[] {
  return [
    user.name || "—",
    user.email,
    user.phone || "—",
    user.status === "suspended" ? "Suspended" : "Active",
    formatWalletBalance(user.walletBalance),
    user.totalPoints.toLocaleString(),
    formatExportDate(user.createdAt),
  ];
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportFilename(extension: "csv" | "pdf") {
  const stamp = new Date().toISOString().slice(0, 10);
  return `onewayout-users-${stamp}.${extension}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadUsersCsv(users: PlatformUserSummary[]) {
  const header = USER_EXPORT_COLUMNS.join(",");
  const rows = users.map((user) => userToExportRow(user).map(escapeCsvCell).join(","));
  const csv = [header, ...rows].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, exportFilename("csv"));
}

export async function downloadUsersPdf(users: PlatformUserSummary[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const exportedAt = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text("One Way Out — Users Export", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Exported: ${exportedAt}  |  Total users: ${users.length}`, 40, 58);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 72,
    head: [USER_EXPORT_COLUMNS.slice()],
    body: users.map((user) => userToExportRow(user)),
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [47, 96, 100],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(exportFilename("pdf"));
}
