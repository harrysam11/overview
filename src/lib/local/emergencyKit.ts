import { getPassphraseHint } from "./vault";

export interface PassphraseStrength {
  score: number; // 0 to 4
  label: "Too Short" | "Weak" | "Fair" | "Strong" | "Very Strong";
  feedback: string[];
}

export const evaluatePassphraseStrength = (passphrase: string): PassphraseStrength => {
  const feedback: string[] = [];
  if (passphrase.length < 12) {
    return {
      score: 0,
      label: "Too Short",
      feedback: ["Passphrase must be at least 12 characters."],
    };
  }

  let score = 1;
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);
  const words = passphrase.split(/\s+|-|_/);

  if (passphrase.length >= 16) score++;
  if (passphrase.length >= 24 || (words.length >= 4 && passphrase.length >= 16)) score++;
  if ((hasLower && hasUpper && hasNumber) || hasSpecial) score++;

  if (score > 4) score = 4;

  const labels: PassphraseStrength["label"][] = [
    "Too Short",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];

  if (score < 3) {
    feedback.push("Add more words or mix numbers and symbols to increase resilience against guessing.");
  } else {
    feedback.push("Strong entropy. Hard to brute force.");
  }

  return {
    score,
    label: labels[score],
    feedback,
  };
};

export const generateEmergencyKitHtml = async (currentPassphraseHint?: string | null): Promise<string> => {
  const hint = currentPassphraseHint !== undefined ? currentPassphraseHint : await getPassphraseHint();
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>HabitFlow LifeOS - Emergency Vault Recovery Kit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111; max-width: 760px; margin: 40px auto; padding: 0 24px; }
    .header { border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #555; font-size: 14px; }
    .warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 14px; border-radius: 6px; font-size: 13px; margin-bottom: 24px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 24px; background: #fafafa; }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #666; margin-bottom: 4px; }
    .field-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; background: #fff; padding: 10px; border: 1px solid #ccc; border-radius: 4px; word-break: break-all; }
    .box { min-height: 48px; border: 2px dashed #999; background: #fff; border-radius: 4px; padding: 10px; font-family: monospace; }
    .instructions { font-size: 13px; color: #333; line-height: 1.6; }
    .instructions ol { padding-left: 20px; }
    .footer { text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-top: 40px; }
    @media print {
      body { margin: 0; padding: 12px; }
      .warning { border-color: #333; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">HabitFlow LifeOS</div>
      <div class="subtitle">Emergency Vault Recovery Kit</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #666;">
      Generated: ${dateStr} ${timeStr}<br>
      Schema Version: 4.0
    </div>
  </div>

  <div class="warning">
    <strong>CRITICAL PRIVACY & SECURITY DOCUMENT:</strong> This recovery sheet contains account recovery guidance. Store it in a secure safe, locked drawer, or your offline password manager. Never share this document over the internet or email.
  </div>

  <div class="card">
    <div class="field">
      <div class="field-label">Vault Web Application Address</div>
      <div class="field-value">${typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4173"}</div>
    </div>

    <div class="field">
      <div class="field-label">Passphrase Hint (Public metadata)</div>
      <div class="field-value">${hint || "(No hint configured)"}</div>
    </div>

    <div class="field">
      <div class="field-label">Emergency Recovery Passphrase (Write down or paste below)</div>
      <div class="box">
        ____________________________________________________________________________________
      </div>
      <div style="font-size: 11px; color: #777; margin-top: 4px;">
        Tip: If you ever lose access to this browser, this passphrase is required to decrypt your on-device IndexedDB vault and encrypted backup files.
      </div>
    </div>
  </div>

  <div class="instructions">
    <h3 style="font-size: 15px; margin-bottom: 8px;">How to Restore Your Vault on Any Device:</h3>
    <ol>
      <li><strong>Install or Open HabitFlow:</strong> Navigate to your self-hosted HabitFlow instance on any supported browser (Chrome, Firefox, Safari, Edge, Brave).</li>
      <li><strong>Restore from Backup:</strong> Open the <code>/data</code> page, select your latest <code>.json</code> encrypted backup file, and input your passphrase.</li>
      <li><strong>Sync Merge:</strong> Use the "Sync Merge" option to combine records seamlessly if you have tracked habits on multiple computers.</li>
      <li><strong>Offline Guarantees:</strong> Your data remains 100% on your machine. Neither the developers nor any third party has access to your recovery secret.</li>
    </ol>
  </div>

  <div class="footer">
    HabitFlow LifeOS • Zero-Knowledge AES-256-GCM Local-First Storage • Keep Safe
  </div>
</body>
</html>`;
};

export const downloadEmergencyRecoveryKit = async (hint?: string | null): Promise<void> => {
  const html = await generateEmergencyKitHtml(hint);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HabitFlow-Recovery-Kit-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
