import QRCode from 'qrcode';
import { CredentialThemeConfig } from '../components/ProfessionalCredentialCard';

export interface CredentialCanvasOptions {
  theme: CredentialThemeConfig;
  professionalName: string;
  specialty: string;
  crefito: string;
  city: string;
  serviceLabel: string;
  issuedAt: string;
  credentialCode: string;
  approved: boolean;
  isPro?: boolean;
  avatarUrl?: string;
  qrDataUrl?: string;
  publicProfileUrl?: string;
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return 'FH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | number[]
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number' ? radius : radius[0] || 0;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

// Vector Icon Helpers to perfectly match Lucide Icons in HTML
function drawHomeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const half = size / 2;
  ctx.beginPath();
  // Roof
  ctx.moveTo(cx - half, cy + 2);
  ctx.lineTo(cx, cy - half);
  ctx.lineTo(cx + half, cy + 2);
  // Walls
  ctx.moveTo(cx - half + 3, cy);
  ctx.lineTo(cx - half + 3, cy + half);
  ctx.lineTo(cx + half - 3, cy + half);
  ctx.lineTo(cx + half - 3, cy);
  // Door
  ctx.moveTo(cx - 3, cy + half);
  ctx.lineTo(cx - 3, cy + 2);
  ctx.lineTo(cx + 3, cy + 2);
  ctx.lineTo(cx + 3, cy + half);
  ctx.stroke();
  ctx.restore();
}

function drawMapPinIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = size * 0.38;
  const pinTopY = cy - size * 0.15;
  ctx.beginPath();
  ctx.arc(cx, pinTopY, r, Math.PI * 0.75, Math.PI * 0.25, false);
  ctx.lineTo(cx, cy + size * 0.48);
  ctx.closePath();
  ctx.stroke();
  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, pinTopY, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = size * 0.9;
  const h = size * 0.85;
  const left = cx - w / 2;
  const top = cy - h / 2 + 2;
  // Outer Rect
  drawRoundedRect(ctx, left, top, w, h, 4);
  ctx.stroke();
  // Top horizontal divider
  ctx.beginPath();
  ctx.moveTo(left, top + h * 0.32);
  ctx.lineTo(left + w, top + h * 0.32);
  // Binder hooks
  ctx.moveTo(left + w * 0.28, top - 3);
  ctx.lineTo(left + w * 0.28, top + 3);
  ctx.moveTo(left + w * 0.72, top - 3);
  ctx.lineTo(left + w * 0.72, top + 3);
  ctx.stroke();
  ctx.restore();
}

function drawStarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
  ctx.save();
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: try proxy if remote
      if (src.startsWith('http') && !src.includes('/api/proxy-image')) {
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => resolve(null);
        proxyImg.src = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      } else {
        resolve(null);
      }
    };
    img.src = src;
  });
}

export async function renderCredentialToBlob(options: CredentialCanvasOptions): Promise<Blob> {
  const {
    theme,
    professionalName,
    specialty,
    crefito,
    city,
    serviceLabel,
    issuedAt,
    credentialCode,
    isPro,
    avatarUrl,
    qrDataUrl,
    publicProfileUrl,
  } = options;

  // 1. Prepare QR Code
  let finalQrDataUrl = qrDataUrl;
  if (!finalQrDataUrl || !finalQrDataUrl.startsWith('data:image/')) {
    const targetUrl = publicProfileUrl || 'https://fisiocarehub.app';
    const qrDark = theme.isLightMode ? (theme.qrDarkColor || '#3b0764') : '#ffffff';
    try {
      finalQrDataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 600,
        color: {
          dark: qrDark,
          light: '#00000000',
        },
      });
    } catch {
      finalQrDataUrl = '';
    }
  }

  // 2. Preload QR Image & Avatar Image
  const [qrImg, avatarImg] = await Promise.all([
    finalQrDataUrl ? loadImage(finalQrDataUrl) : null,
    avatarUrl ? loadImage(avatarUrl) : null,
  ]);

  // 3. Canvas Setup (High Resolution 1080 x 1920, 9:16 Aspect Ratio)
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o renderizador 2D do Canvas.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- Layer 1: Background & Card Rounded Clipping ---
  const margin = 40;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardX = margin;
  const cardY = margin;
  const cardRadius = 72;

  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW * 0.2, cardY + cardH);
  if (theme.id === 'orange') {
    bgGrad.addColorStop(0, '#1a0a03');
    bgGrad.addColorStop(0.3, '#331406');
    bgGrad.addColorStop(0.6, '#4d1c08');
    bgGrad.addColorStop(0.85, '#2b0e03');
    bgGrad.addColorStop(1, '#150600');
  } else if (theme.id === 'green') {
    bgGrad.addColorStop(0, '#021711');
    bgGrad.addColorStop(0.3, '#053324');
    bgGrad.addColorStop(0.6, '#094a34');
    bgGrad.addColorStop(0.85, '#062e20');
    bgGrad.addColorStop(1, '#01140e');
  } else if (theme.id === 'white-purple') {
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.3, '#faf5ff');
    bgGrad.addColorStop(0.65, '#f3e8ff');
    bgGrad.addColorStop(0.88, '#e9d5ff');
    bgGrad.addColorStop(1, '#f8f5fe');
  } else {
    // Default blue
    bgGrad.addColorStop(0, '#051d27');
    bgGrad.addColorStop(0.25, '#082d3b');
    bgGrad.addColorStop(0.55, '#051f2a');
    bgGrad.addColorStop(0.85, '#031219');
    bgGrad.addColorStop(1, '#020a0e');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // --- Layer 2: Smooth Premium Background (No Grid) ---
  // Clean, sleek gradient background without grid lines

  // --- Layer 3: Premium Concentric Luxury Circles & Orbital Rings ---
  // Left-Mid Premium Dual Orbital Ring & Crosshair Accents
  ctx.save();
  const lmCenterX = cardX + 60;
  const lmCenterY = cardY + 540;

  const lmGrad = ctx.createLinearGradient(lmCenterX - 220, lmCenterY + 220, lmCenterX + 220, lmCenterY - 220);
  lmGrad.addColorStop(0, theme.specialtyColor || theme.brandColor);
  lmGrad.addColorStop(0.7, theme.brandColor);
  lmGrad.addColorStop(1, 'rgba(255,255,255,0.05)');

  // Outer subtle ring
  ctx.strokeStyle = lmGrad;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(lmCenterX, lmCenterY, 220, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed Orbital Ring
  ctx.strokeStyle = theme.brandColor;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 14]);
  ctx.beginPath();
  ctx.arc(lmCenterX, lmCenterY, 175, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main Solid Ring
  ctx.strokeStyle = lmGrad;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(lmCenterX, lmCenterY, 135, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Ring
  ctx.strokeStyle = theme.specialtyColor || theme.brandColor;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(lmCenterX, lmCenterY, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair Ticks & Nodes
  ctx.strokeStyle = theme.brandColor;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(lmCenterX, lmCenterY - 240);
  ctx.lineTo(lmCenterX, lmCenterY - 210);
  ctx.moveTo(lmCenterX, lmCenterY + 210);
  ctx.lineTo(lmCenterX, lmCenterY + 240);
  ctx.moveTo(lmCenterX + 210, lmCenterY);
  ctx.lineTo(lmCenterX + 240, lmCenterY);
  ctx.stroke();

  ctx.fillStyle = theme.brandColor;
  ctx.beginPath();
  ctx.arc(lmCenterX, lmCenterY - 135, 6, 0, Math.PI * 2);
  ctx.arc(lmCenterX + 175, lmCenterY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bottom-Right Premium Nested Rings & Halo
  ctx.save();
  const brCenterX = cardX + cardW - 130;
  const brCenterY = cardY + cardH - 120;

  // Luminous Aura
  const brGlow = ctx.createRadialGradient(brCenterX, brCenterY, 10, brCenterX, brCenterY, 200);
  brGlow.addColorStop(0, theme.specialtyColor || theme.brandColor);
  brGlow.addColorStop(0.6, theme.brandColor);
  brGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = brGlow;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 200, 0, Math.PI * 2);
  ctx.fill();

  const brGrad = ctx.createLinearGradient(brCenterX + 200, brCenterY + 200, brCenterX - 200, brCenterY - 200);
  brGrad.addColorStop(0, theme.brandColor);
  brGrad.addColorStop(0.6, theme.specialtyColor || theme.brandColor);
  brGrad.addColorStop(1, 'rgba(255,255,255,0.05)');

  // Outermost Ring
  ctx.strokeStyle = brGrad;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 250, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed Ring
  ctx.strokeStyle = theme.brandColor;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 200, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main Ring
  ctx.strokeStyle = brGrad;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 155, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Ring
  ctx.strokeStyle = theme.specialtyColor || theme.brandColor;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 110, 0, Math.PI * 2);
  ctx.stroke();

  // Innermost Dashed Ring
  ctx.strokeStyle = theme.brandColor;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Accent Nodes
  ctx.fillStyle = theme.brandColor;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(brCenterX, brCenterY - 200, 5, 0, Math.PI * 2);
  ctx.arc(brCenterX + 250, brCenterY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Layer 4: Header ---
  const headerLeftX = cardX + 70;
  const headerTopY = cardY + 115;

  // Brand Tag
  ctx.fillStyle = theme.brandColor;
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'left';
  ctx.fillText('FISIOCAREHUB', headerLeftX, headerTopY);

  // Main Title
  ctx.fillStyle = theme.titleColor;
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '-0.5px';
  ctx.fillText('Credencial Profissional', headerLeftX, headerTopY + 54);

  // Subtitle
  ctx.fillStyle = theme.subtitleColor;
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '4.5px';
  ctx.fillText('IDENTIFICAÇÃO DIGITAL', headerLeftX, headerTopY + 92);

  // Top Right: Verified Status Pill
  const pillW = 210;
  const pillH = 42;
  const pillX = cardX + cardW - 70 - pillW;
  const pillY = headerTopY - 14;

  ctx.save();
  ctx.fillStyle = theme.verifiedBg;
  ctx.strokeStyle = theme.verifiedBorder;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 21);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.verifiedText;
  ctx.font = '800 19px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('Status Verificado', pillX + pillW / 2, pillY + 27);
  ctx.restore();

  // Top Right: Rosette Seal Medal
  const sealCenterX = cardX + cardW - 70 - 45;
  const sealCenterY = pillY + 90;
  const sealRadius = 34;

  ctx.save();
  ctx.translate(sealCenterX, sealCenterY);
  // Scalloped edges
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? sealRadius : sealRadius * 0.85;
    const a = (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.closePath();
  const rosetteGrad = ctx.createLinearGradient(-sealRadius, -sealRadius, sealRadius, sealRadius);
  theme.rosetteStops.forEach((s) => {
    rosetteGrad.addColorStop(parseFloat(s.offset) / 100, s.color);
  });
  ctx.fillStyle = rosetteGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(0, 0, sealRadius * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = theme.rosetteInner;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Checkmark in Rosette
  ctx.strokeStyle = theme.rosetteCheck;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-2.5, 7);
  ctx.lineTo(10, -7);
  ctx.stroke();
  ctx.restore();

  // --- Layer 5: Middle Section (Proportionally Distributed with CSS justify-evenly rhythm) ---
  
  // Element 1: Avatar Frame (Photo or Fallback)
  const avatarSize = 250;
  const avatarRadius = 54;
  const avatarCenterX = width / 2;
  const avatarY = cardY + 310;
  const avatarX = avatarCenterX - avatarSize / 2;

  // Avatar Shadow & Background
  ctx.save();
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
  ctx.fillStyle = theme.avatarBg;
  ctx.fill();
  ctx.strokeStyle = theme.avatarBorder;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.restore();

  // Draw Avatar Image or Fallback
  ctx.save();
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
  ctx.clip();

  if (avatarImg && avatarImg.naturalWidth > 0) {
    const imgW = avatarImg.naturalWidth;
    const imgH = avatarImg.naturalHeight;
    const scale = Math.max(avatarSize / imgW, avatarSize / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = avatarX + (avatarSize - drawW) / 2;
    const drawY = avatarY + (avatarSize - drawH) / 2;
    ctx.drawImage(avatarImg, drawX, drawY, drawW, drawH);
  } else {
    // High Quality Vector Fallback with Initials
    const initials = getInitials(professionalName);
    const avGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avGrad.addColorStop(0, theme.isLightMode ? '#f3e8ff' : '#0f172a');
    avGrad.addColorStop(1, theme.isLightMode ? '#ede9fe' : '#1e1b4b');
    ctx.fillStyle = avGrad;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

    // Decorative concentric geometric rings inside fallback
    ctx.strokeStyle = theme.brandColor;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize - 40, avatarY + 40, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = theme.specialtyColor || theme.brandColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize - 40, avatarY + 40, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = theme.brandColor;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(avatarX + 40, avatarY + avatarSize - 40, 85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = theme.specialtyColor || theme.brandColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(avatarX + 40, avatarY + avatarSize - 40, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Initials Text
    ctx.fillStyle = theme.isLightMode ? '#6b21a8' : '#ffffff';
    ctx.font = '900 80px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, avatarCenterX, avatarY + avatarSize / 2 - 10);

    // Bottom Small Tag
    ctx.fillStyle = theme.isLightMode ? '#7c3aed' : '#c4b5fd';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('FISIOCAREHUB', avatarCenterX, avatarY + avatarSize / 2 + 50);
  }
  ctx.restore();

  // Avatar Checkmark Badge (Bottom Right of Photo)
  const badgeSize = 44;
  const badgeX = avatarX + avatarSize - badgeSize / 2 - 10;
  const badgeY = avatarY + avatarSize - badgeSize / 2 - 10;

  ctx.save();
  ctx.beginPath();
  ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = theme.avatarCheckBg;
  ctx.fill();
  ctx.strokeStyle = theme.avatarCheckBorder;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Checkmark icon
  ctx.strokeStyle = theme.avatarCheckColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(badgeX + 13, badgeY + 22);
  ctx.lineTo(badgeX + 19, badgeY + 28);
  ctx.lineTo(badgeX + 31, badgeY + 16);
  ctx.stroke();
  ctx.restore();

  // Element 2: Role, Name & Specialization Block
  let cursorY = avatarY + avatarSize + 70;

  // Role: FISIOTERAPEUTA
  ctx.fillStyle = theme.roleColor;
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5.5px';
  ctx.fillText('FISIOTERAPEUTA', width / 2, cursorY);

  // Professional Name
  cursorY += 50;
  ctx.fillStyle = theme.nameColor;
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '-0.5px';
  ctx.textAlign = 'center';

  let displayName = professionalName;
  if (ctx.measureText(displayName).width > cardW - 120) {
    while (displayName.length > 5 && ctx.measureText(displayName + '...').width > cardW - 120) {
      displayName = displayName.slice(0, -1).trim();
    }
    displayName += '...';
  }
  ctx.fillText(displayName, width / 2, cursorY);

  // Specialty
  cursorY += 36;
  ctx.fillStyle = theme.specialtyColor;
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(specialty.toUpperCase(), width / 2, cursorY);

  // Element 3: Registration Pills (CREFITO + PRO) Side by Side
  cursorY += 46;
  const crefitoLabel = crefito.toUpperCase().startsWith('CREFITO')
    ? crefito
    : `CREFITO-3: ${crefito.replace(/^CREFITO-?\d*:\s*/i, '')}`;

  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  const crefTextW = ctx.measureText(crefitoLabel).width;
  const crefPillW = crefTextW + 54;
  const crefPillH = 44;
  const proPillW = 114;
  const totalPillsW = isPro ? crefPillW + proPillW + 16 : crefPillW;
  const startPillsX = (width - totalPillsW) / 2;

  // CREFITO Pill
  ctx.save();
  ctx.fillStyle = theme.crefitoBg;
  ctx.strokeStyle = theme.crefitoBorder;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, startPillsX, cursorY - 30, crefPillW, crefPillH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.crefitoText;
  ctx.textAlign = 'center';
  ctx.fillText(crefitoLabel, startPillsX + crefPillW / 2, cursorY);
  ctx.restore();

  // PRO Badge Pill (if enabled)
  if (isPro) {
    const proPillX = startPillsX + crefPillW + 16;
    ctx.save();
    ctx.fillStyle = theme.proBg;
    ctx.strokeStyle = theme.proBorder;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, proPillX, cursorY - 30, proPillW, crefPillH, 22);
    ctx.fill();
    ctx.stroke();

    // Draw Star icon
    drawStarIcon(ctx, proPillX + 28, cursorY - 8, 5, 8, 4, theme.proText);

    ctx.fillStyle = theme.proText;
    ctx.font = '900 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRO', proPillX + 66, cursorY);
    ctx.restore();
  }

  // Element 4: Central QR Code Validation Area
  const valCenterY = cardY + 980;

  ctx.save();
  // Validation Header: "✓ VALIDAR CREDENCIAL"
  ctx.fillStyle = theme.qrHeaderText;
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3.5px';
  ctx.textAlign = 'center';
  
  // Draw green checkmark before text
  const valText = 'VALIDAR CREDENCIAL';
  const valTextW = ctx.measureText(valText).width;
  ctx.fillText(valText, width / 2 + 10, valCenterY);

  ctx.fillStyle = theme.qrHeaderCheck;
  ctx.font = '900 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('✓', width / 2 - valTextW / 2 - 12, valCenterY);

  // QR Code
  const qrBoxSize = 270;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = valCenterY + 28;

  // Draw QR Image directly
  if (qrImg && qrImg.naturalWidth > 0) {
    ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
  } else {
    ctx.fillStyle = theme.isLightMode ? '#64748b' : '#94a3b8';
    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('QR CODE', width / 2, qrBoxY + qrBoxSize / 2);
  }

  // ID DA CREDENCIAL
  ctx.fillStyle = theme.qrIdColor;
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '1.8px';
  ctx.textAlign = 'center';
  ctx.fillText(`ID DA CREDENCIAL - ${credentialCode}`, width / 2, qrBoxY + qrBoxSize + 36);

  // Instruction subtitle
  ctx.fillStyle = theme.qrSubColor;
  ctx.font = '600 17px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0.6px';
  ctx.fillText('Escanear para verificar este perfil', width / 2, qrBoxY + qrBoxSize + 66);
  ctx.restore();

  // --- Layer 6: Footer 3-Column Bar with High Precision Vector Icons ---
  const footerDividerY = cardY + cardH - 145;

  // Divider Line
  ctx.save();
  ctx.strokeStyle = theme.footerBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, footerDividerY);
  ctx.lineTo(cardX + cardW - 60, footerDividerY);
  ctx.stroke();

  // 3 Columns: Service, Location, Issued Date
  const col1X = cardX + 160;
  const col2X = width / 2;
  const col3X = cardX + cardW - 160;
  const iconY = footerDividerY + 40;
  const textY = footerDividerY + 80;
  const iconColor = theme.id === 'blue' ? '#38bdf8' : theme.brandColor;

  ctx.textAlign = 'center';

  // Column 1: Services (Lucide Home Vector Icon)
  drawHomeIcon(ctx, col1X, iconY, 26, iconColor);
  ctx.fillStyle = theme.footerTextColor;
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(serviceLabel || 'Serviços Domiciliares', col1X, textY);

  // Column 2: Location (Lucide MapPin Vector Icon)
  drawMapPinIcon(ctx, col2X, iconY, 26, iconColor);
  ctx.fillStyle = theme.footerCenterColor;
  ctx.font = '800 19px system-ui, -apple-system, sans-serif';
  ctx.fillText(city, col2X, textY);

  // Column 3: Issued Date (Lucide Calendar Vector Icon)
  drawCalendarIcon(ctx, col3X, iconY, 26, iconColor);
  ctx.fillStyle = theme.footerTextColor;
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Emissão: ${issuedAt}`, col3X, textY);
  ctx.restore();

  // --- Layer 7: Outer Card Border ---
  ctx.restore(); // Restore card clipping
  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  // Convert Canvas to Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 5000) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao exportar imagem do Canvas.'));
        }
      },
      'image/png',
      1.0
    );
  });
}
