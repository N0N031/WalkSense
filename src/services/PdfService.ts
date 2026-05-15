import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Session, GpsPoint, MarkedEvent } from "@/src/services/sessionService";

export interface PdfExportOptions {
  includePhotos?: boolean;
  includeSignature?: boolean;
  signatureDataUrl?: string;
  ownerName?: string;
}

class PdfService {
  /**
   * Exporte une session en PDF avec signature propriétaire optionnelle
   */
  async exportSessionPdf(
    session: Session,
    options: PdfExportOptions = {},
  ): Promise<string> {
    try {
      const html = this.buildPdfHtml(session, options);
      const filename = `WalkSense_${session.id.slice(0, 8)}.html`;
      const docDir = (FileSystem as any).documentDirectory;
      const filepath = `${docDir}${filename}`;

      await FileSystem.writeAsStringAsync(filepath, html);

      return filepath;
    } catch (error) {
      console.error("PdfService.exportSessionPdf error:", error);
      throw error;
    }
  }

  /**
   * Partage un PDF exporté
   */
  async sharePdf(filepath: string, filename: string): Promise<boolean> {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        console.warn("Sharing not available on this device");
        return false;
      }

      await Sharing.shareAsync(filepath, {
        mimeType: "application/pdf",
        dialogTitle: `Partager ${filename}`,
        UTI: "com.adobe.pdf",
      });

      return true;
    } catch (error) {
      console.error("PdfService.sharePdf error:", error);
      return false;
    }
  }

  /**
   * Construit le HTML du PDF
   */
  private buildPdfHtml(session: Session, options: PdfExportOptions): string {
    const duration = this.formatDuration(session.duration);
    const distance = (session.distance / 1000).toFixed(2);
    const startDate = new Date(session.startTime).toLocaleDateString("fr-FR");
    const startTime = new Date(session.startTime).toLocaleTimeString("fr-FR");
    const endTime = session.endTime
      ? new Date(session.endTime).toLocaleTimeString("fr-FR")
      : "En cours";

    const classifiedCount = session.events.filter((e) =>
      Boolean(e.classification),
    ).length;
    const refillStats = {
      done: session.events.filter((e) => e.refilledAt).length,
      pending: session.events.filter(
        (e) => (e.type === "find" || e.type === "manual") && !e.refilledAt,
      ).length,
    };

    const eventsSortedByTime = [...session.events].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    const ownerName = options.ownerName || "Prospecteur WalkSense";

    let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WalkSense Session ${session.id.slice(0, 8)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #fff;
      color: #333;
      line-height: 1.6;
    }
    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
      page-break-after: always;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      border-bottom: 3px solid #D4AF37;
      padding-bottom: 16px;
    }
    .header-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #050505 0%, #1a3a1a 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #D4AF37;
      font-size: 28px;
      font-weight: bold;
    }
    .header-title {
      flex: 1;
    }
    .header-title h1 {
      font-size: 28px;
      font-weight: 900;
      color: #D4AF37;
      margin: 0;
    }
    .header-title p {
      font-size: 13px;
      color: #888;
      margin: 4px 0 0 0;
      letter-spacing: 0.5px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #050505;
      border-left: 4px solid #D4AF37;
      padding-left: 12px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: #f5f5f5;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 900;
      color: #50E64E;
      font-variant: tabular-nums;
    }
    .metadata-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .metadata-label {
      font-weight: 600;
      color: #666;
    }
    .metadata-value {
      color: #333;
      font-weight: 500;
    }
    .event-row {
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .event-type {
      font-weight: 700;
      color: #D4AF37;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .event-time {
      color: #999;
      font-size: 11px;
    }
    .event-classification {
      color: #50E64E;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .event-location {
      color: #666;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .event-notes {
      color: #333;
      font-style: italic;
      margin-top: 4px;
    }
    .refill-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 6px;
    }
    .refill-done {
      background: #50E64E;
      color: white;
    }
    .refill-pending {
      background: #D4AF37;
      color: #050505;
    }
    .signature-section {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 2px solid #D4AF37;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .signature-block {
      text-align: center;
    }
    .signature-image {
      width: 100%;
      height: 60px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 12px;
    }
    .signature-line {
      border-top: 1px solid #333;
      height: 1px;
      margin-bottom: 4px;
    }
    .signature-label {
      font-size: 11px;
      font-weight: 600;
      color: #333;
    }
    .hash-section {
      margin-top: 20px;
      padding: 12px;
      background: #f0f0f0;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      word-break: break-all;
    }
    .hash-label {
      font-weight: 700;
      color: #666;
      margin-bottom: 4px;
    }
    .hash-value {
      color: #333;
      letter-spacing: 0.5px;
    }
    @media print {
      .page {
        margin: 0;
        padding: 20mm;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">🗺️</div>
      <div class="header-title">
        <h1>WalkSense</h1>
        <p>Terrain Tracking Session Report</p>
      </div>
    </div>

    <!-- Session Info -->
    <div class="section">
      <div class="section-title">Session</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Durée</div>
          <div class="stat-value">${duration}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Distance</div>
          <div class="stat-value">${distance} km</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Trouvailles</div>
          <div class="stat-value">${session.events.length}</div>
        </div>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Date :</span>
        <span class="metadata-value">${startDate}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Heure :</span>
        <span class="metadata-value">${startTime} → ${endTime}</span>
      </div>
      ${
        session.commune
          ? `<div class="metadata-row">
        <span class="metadata-label">Commune :</span>
        <span class="metadata-value">${session.commune}</span>
      </div>`
          : ""
      }
      <div class="metadata-row">
        <span class="metadata-label">État :</span>
        <span class="metadata-value">${session.status === "completed" ? "Terminée" : "En cours"}</span>
      </div>
      ${
        session.hash
          ? `<div class="metadata-row">
        <span class="metadata-label">Verrouillée :</span>
        <span class="metadata-value">✓ SHA-256</span>
      </div>`
          : ""
      }
    </div>

    <!-- Findings Summary -->
    ${
      session.events.length > 0
        ? `
    <div class="section">
      <div class="section-title">Résumé Trouvailles</div>
      <div class="metadata-row">
        <span class="metadata-label">Total :</span>
        <span class="metadata-value">${session.events.length}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Classifiées :</span>
        <span class="metadata-value">${classifiedCount}</span>
      </div>
      ${
        refillStats.pending > 0
          ? `
      <div class="metadata-row">
        <span class="metadata-label">À reboucher :</span>
        <span class="metadata-value" style="color: #D4AF37; font-weight: 700;">${refillStats.pending}</span>
      </div>
      `
          : ""
      }
      ${
        refillStats.done > 0
          ? `
      <div class="metadata-row">
        <span class="metadata-label">Rebouchées :</span>
        <span class="metadata-value" style="color: #50E64E; font-weight: 700;">${refillStats.done}</span>
      </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <!-- Events Detail -->
    ${
      eventsSortedByTime.length > 0
        ? `
    <div class="section">
      <div class="section-title">Détail des Trouvailles</div>
      ${eventsSortedByTime
        .map(
          (event, idx) => `
      <div class="event-row">
        <div class="event-header">
          <span class="event-type">#${idx + 1} ${event.type}</span>
          <span class="event-time">${new Date(event.timestamp).toLocaleTimeString("fr-FR")}</span>
        </div>
        ${event.classification ? `<div class="event-classification">📍 ${event.classification}</div>` : ""}
        <div class="event-location">
          ${event.location.lat.toFixed(5)}, ${event.location.lon.toFixed(5)} ±${Math.round(event.location.accuracy)}m
        </div>
        ${event.notes ? `<div class="event-notes">"${event.notes}"</div>` : ""}
        ${
          event.refilledAt || event.type === "find" || event.type === "manual"
            ? `
        <div style="margin-top: 6px;">
          <span class="refill-badge ${event.refilledAt ? "refill-done" : "refill-pending"}">
            ${event.refilledAt ? "✓ REBOUCHÉ" : "⚠ À REBOUCHER"}
          </span>
        </div>
        `
            : ""
        }
      </div>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }

    <!-- Signature Section -->
    ${
      options.includeSignature
        ? `
    <div class="signature-section">
      <div class="section-title">Attestation</div>
      <p style="font-size: 12px; color: #666; margin-bottom: 16px;">
        Je certifie que les données enregistrées ci-dessus ont été collectées conformément à la réglementation en vigueur.
      </p>
      <div class="signature-grid">
        <div class="signature-block">
          <div class="signature-image">
            ${options.signatureDataUrl ? `<img src="${options.signatureDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />` : "[Signature]"}
          </div>
          <div class="signature-line"></div>
          <div class="signature-label">Signature du Prospecteur</div>
        </div>
        <div class="signature-block">
          <div style="height: 60px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">
            ${new Date().toLocaleDateString("fr-FR")}
          </div>
          <div class="signature-line"></div>
          <div class="signature-label">Date</div>
        </div>
      </div>
      <div style="margin-top: 12px; font-size: 11px; color: #999; text-align: center;">
        ${ownerName}
      </div>
    </div>
    `
        : ""
    }

    <!-- Hash Footer -->
    ${
      session.hash
        ? `
    <div class="hash-section">
      <div class="hash-label">HASH SHA-256 (Preuve d'intégrité) :</div>
      <div class="hash-value">${session.hash}</div>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999;">
      <p>WalkSense v1.0 | Généré le ${new Date().toLocaleString("fr-FR")}</p>
      <p>Ce document est confidentiel et destiné au propriétaire de la session.</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
}

export const pdfService = new PdfService();
