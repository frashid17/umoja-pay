"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { LogoMark } from "@/components/brand/logo";

export type PaymentLinkCardProps = {
  payUrl: string;
  merchantName: string;
  merchantLogoUrl: string | null;
  productName: string;
  description: string | null;
  amountLabel: string;
  productImageUrl: string | null;
  brandAccent?: string | null;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineHeight;
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText(line.slice(0, Math.max(0, line.length - 1)) + "…", x, cy);
        return cy + lineHeight;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

async function renderFlyerCanvas(input: {
  payUrl: string;
  merchantName: string;
  merchantLogoUrl: string | null;
  productName: string;
  description: string | null;
  amountLabel: string;
  productImageUrl: string | null;
  brandAccent: string;
  qrDataUrl: string;
}): Promise<HTMLCanvasElement> {
  const W = 840;
  const pad = 64;
  const contentW = W - pad * 2;

  // Measure height dynamically after drawing pass 1 layout
  let y = 72;
  y += 128; // logo block
  y += 36; // merchant
  y += 56; // product
  if (input.description) y += 80;
  if (input.productImageUrl) y += 280;
  y += 64; // amount
  y += 400; // qr + link + hint
  y += 80; // powered by
  y += 48;

  const H = Math.max(1100, y);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const accent = input.brandAccent || "#0d6e56";
  const muted = "#5a6a62";
  const ink = "#0d1512";
  const border = "#d5ddd8";
  const sand = "#f3f5f4";

  let cy = 72;

  // Logo box
  const logoSize = 112;
  const logoX = (W - logoSize) / 2;
  ctx.fillStyle = sand;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  roundRect(ctx, logoX, cy, logoSize, logoSize, 24);
  ctx.fill();
  ctx.stroke();

  if (input.merchantLogoUrl) {
    const logo = await loadImage(input.merchantLogoUrl);
    if (logo) {
      const inset = 12;
      const box = logoSize - inset * 2;
      const scale = Math.min(box / logo.width, box / logo.height);
      const dw = logo.width * scale;
      const dh = logo.height * scale;
      ctx.drawImage(logo, logoX + inset + (box - dw) / 2, cy + inset + (box - dh) / 2, dw, dh);
    } else {
      drawInitial(ctx, input.merchantName, logoX, cy, logoSize, accent);
    }
  } else {
    drawInitial(ctx, input.merchantName, logoX, cy, logoSize, accent);
  }
  cy += logoSize + 28;

  ctx.textAlign = "center";
  ctx.fillStyle = muted;
  ctx.font = "500 26px system-ui, -apple-system, sans-serif";
  ctx.fillText(input.merchantName, W / 2, cy);
  cy += 44;

  ctx.fillStyle = ink;
  ctx.font = "700 44px system-ui, -apple-system, sans-serif";
  cy = wrapText(ctx, input.productName, W / 2, cy, contentW, 52, 3);
  cy += 8;

  if (input.description) {
    ctx.fillStyle = muted;
    ctx.font = "400 24px system-ui, -apple-system, sans-serif";
    cy = wrapText(ctx, input.description, W / 2, cy, contentW, 34, 4);
    cy += 16;
  }

  if (input.productImageUrl) {
    const product = await loadImage(input.productImageUrl);
    if (product) {
      const maxH = 240;
      const scale = Math.min(contentW / product.width, maxH / product.height);
      const dw = product.width * scale;
      const dh = product.height * scale;
      const dx = (W - dw) / 2;
      roundRect(ctx, dx, cy, dw, dh, 20);
      ctx.save();
      ctx.clip();
      ctx.drawImage(product, dx, cy, dw, dh);
      ctx.restore();
      cy += dh + 28;
    }
  }

  ctx.fillStyle = accent;
  ctx.font = "700 52px system-ui, -apple-system, sans-serif";
  ctx.fillText(input.amountLabel, W / 2, cy);
  cy += 48;

  // QR
  const qr = await loadImage(input.qrDataUrl);
  const qrSize = 320;
  if (qr) {
    const qx = (W - qrSize) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    roundRect(ctx, qx - 12, cy - 12, qrSize + 24, qrSize + 24, 16);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(qr, qx, cy, qrSize, qrSize);
    cy += qrSize + 36;
  }

  ctx.fillStyle = accent;
  ctx.font = "500 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  cy = wrapText(ctx, input.payUrl, W / 2, cy, contentW, 26, 4);
  cy += 12;

  ctx.fillStyle = muted;
  ctx.font = "400 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Scan to pay · use the link if the QR code does not work", W / 2, cy);
  cy += 56;

  // Powered by
  ctx.fillStyle = muted;
  ctx.font = "600 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Powered by Umoja Pay", W / 2, cy);

  // Trim unused bottom whitespace
  const usedH = Math.min(H, cy + 64);
  if (usedH < H) {
    const trimmed = document.createElement("canvas");
    trimmed.width = W;
    trimmed.height = usedH;
    const tctx = trimmed.getContext("2d");
    if (tctx) {
      tctx.fillStyle = "#ffffff";
      tctx.fillRect(0, 0, W, usedH);
      tctx.drawImage(canvas, 0, 0);
      return trimmed;
    }
  }

  return canvas;
}

function drawInitial(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(size * 0.45)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 2);
  ctx.textBaseline = "alphabetic";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function PaymentLinkShareCard({
  payUrl,
  merchantName,
  merchantLogoUrl,
  productName,
  description,
  amountLabel,
  productImageUrl,
  brandAccent,
}: PaymentLinkCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payUrl, {
      width: 560,
      margin: 1,
      color: { dark: "#0d1512", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Could not generate QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [payUrl]);

  async function buildCanvas() {
    if (!qrDataUrl) throw new Error("QR not ready");
    return renderFlyerCanvas({
      payUrl,
      merchantName,
      merchantLogoUrl,
      productName,
      description,
      amountLabel,
      productImageUrl,
      brandAccent: brandAccent || "#0d6e56",
      qrDataUrl,
    });
  }

  async function downloadPng() {
    setError(null);
    setBusy("png");
    try {
      const canvas = await buildCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${productName.replace(/\s+/g, "-").toLowerCase() || "payment"}-link.png`;
      a.click();
    } catch {
      setError("Could not download image");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setError(null);
    setBusy("pdf");
    try {
      const canvas = await buildCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      pdf.addImage(dataUrl, "PNG", x, margin, w, h);
      pdf.save(`${productName.replace(/\s+/g, "-").toLowerCase() || "payment"}-link.pdf`);
    } catch {
      setError("Could not download PDF");
    } finally {
      setBusy(null);
    }
  }

  const accent = brandAccent || undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-sand/40">
            {merchantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={merchantLogoUrl} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span
                className="font-display text-2xl font-bold text-accent"
                style={accent ? { color: accent } : undefined}
              >
                {merchantName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm font-medium text-muted">{merchantName}</p>
          <p className="font-display text-xl font-bold text-foreground">{productName}</p>
          {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
          {productImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={productImageUrl}
              alt=""
              className="mt-4 h-36 w-full max-w-sm rounded-xl object-cover"
            />
          ) : null}
          <p
            className="mt-4 font-display text-2xl font-bold text-accent"
            style={accent ? { color: accent } : undefined}
          >
            {amountLabel}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Payment QR code"
                className="h-44 w-44 rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-border bg-sand/40 text-sm text-muted">
                Generating QR…
              </div>
            )}
            <p className="max-w-full break-all font-mono text-xs text-accent">
              <a href={payUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {payUrl}
              </a>
            </p>
            <p className="text-xs text-muted">Scan to open checkout · link below if QR fails</p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-muted">
            <LogoMark className="h-4 w-4" />
            <span className="text-xs font-medium">Powered by Umoja Pay</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void downloadPng()}
          disabled={busy !== null || !qrDataUrl}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {busy === "png" ? "Preparing…" : "Download image"}
        </button>
        <button
          type="button"
          onClick={() => void downloadPdf()}
          disabled={busy !== null || !qrDataUrl}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent/40 disabled:opacity-60"
        >
          {busy === "pdf" ? "Preparing…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(payUrl)}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent/40"
        >
          Copy link
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
