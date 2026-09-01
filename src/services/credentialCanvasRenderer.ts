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
    try {
      finalQrDataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 600,
        color: {
          dark: theme.qrDarkColor || '#020617',
          light: '#ffffff',
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

  // --- Layer 2: Subtle Cyber Grid ---
  ctx.save();
  ctx.strokeStyle = theme.isLightMode ? '#c084fc' : theme.id === 'blue' ? '#38bdf8' : theme.brandColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = theme.isLightMode ? 0.12 : 0.18;
  const gridSize = 45;
  for (let x = cardX; x <= cardX + cardW; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, cardY);
    ctx.lineTo(x, cardY + cardH);
    ctx.stroke();
  }
  for (let y = cardY; y <= cardY + cardH; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(cardX, y);
    ctx.lineTo(cardX + cardW, y);
    ctx.stroke();
  }
  // Cyber Dots
  ctx.fillStyle = theme.isLightMode ? '#9333ea' : theme.id === 'blue' ? '#38bdf8' : theme.brandColor;
  ctx.globalAlpha = theme.isLightMode ? 0.25 : 0.35;
  for (let x = cardX; x <= cardX + cardW; x += gridSize * 2) {
    for (let y = cardY; y <= cardY + cardH; y += gridSize * 2) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // --- Layer 3: 3D Decorative Spheres & Shapes ---
  // Top-Right Sphere
  ctx.save();
  const sphereTopGrad = ctx.createRadialGradient(cardX + cardW - 60, cardY + 80, 20, cardX + cardW - 80, cardY + 120, 220);
  theme.sphereTopStops.forEach((s) => {
    sphereTopGrad.addColorStop(parseFloat(s.offset) / 100, s.color);
  });
  ctx.fillStyle = sphereTopGrad;
  ctx.beginPath();
  ctx.arc(cardX + cardW - 80, cardY + 120, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Left Torus Ring
  ctx.save();
  ctx.strokeStyle = theme.torusStroke;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(cardX + 40, cardY + 540, 140, 140, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Bottom-Right Sphere
  ctx.save();
  const sphereBottomGrad = ctx.createRadialGradient(cardX + cardW - 140, cardY + cardH - 120, 15, cardX + cardW - 160, cardY + cardH - 100, 160);
  theme.sphereBottomStops.forEach((s) => {
    sphereBottomGrad.addColorStop(parseFloat(s.offset) / 100, s.color);
  });
  ctx.fillStyle = sphereBottomGrad;
  ctx.beginPath();
  ctx.arc(cardX + cardW - 160, cardY + cardH - 100, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Layer 4: Header ---
  const headerLeftX = cardX + 70;
  const headerTopY = cardY + 110;

  // Brand Tag
  ctx.fillStyle = theme.brandColor;
  ctx.font = '900 24px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('FISIOCAREHUB', headerLeftX, headerTopY);

  // Main Title
  ctx.fillStyle = theme.titleColor;
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '-0.5px';
  ctx.fillText('Credencial Profissional', headerLeftX, headerTopY + 58);

  // Subtitle
  ctx.fillStyle = theme.subtitleColor;
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('IDENTIFICAÇÃO DIGITAL', headerLeftX, headerTopY + 98);

  // Top Right: Verified Status Pill
  const pillW = 220;
  const pillH = 46;
  const pillX = cardX + cardW - 70 - pillW;
  const pillY = headerTopY - 10;

  ctx.save();
  ctx.fillStyle = theme.verifiedBg;
  ctx.strokeStyle = theme.verifiedBorder;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 23);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.verifiedText;
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.textAlign = 'center';
  ctx.fillText('Status Verificado', pillX + pillW / 2, pillY + 30);
  ctx.restore();

  // Top Right: Rosette Seal Medal
  const sealCenterX = cardX + cardW - 70 - 45;
  const sealCenterY = pillY + 95;
  const sealRadius = 36;

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
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-3, 8);
  ctx.lineTo(12, -8);
  ctx.stroke();
  ctx.restore();

  // --- Layer 5: Avatar (Photo or Fallback) ---
  const avatarSize = 250;
  const avatarRadius = 60;
  const avatarCenterX = width / 2;
  const avatarCenterY = cardY + 490;
  const avatarX = avatarCenterX - avatarSize / 2;
  const avatarY = avatarCenterY - avatarSize / 2;

  // Avatar Shadow & Background
  ctx.save();
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
  ctx.fillStyle = theme.avatarBg;
  ctx.fill();
  ctx.strokeStyle = theme.avatarBorder;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  // Draw Avatar Image or Fallback
  ctx.save();
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
  ctx.clip();

  if (avatarImg && avatarImg.naturalWidth > 0) {
    // Object-fit Cover calculations
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

    // Decorative circle rings inside fallback
    ctx.fillStyle = theme.brandColor;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize - 40, avatarY + 40, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avatarX + 40, avatarY + avatarSize - 40, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Initials Text
    ctx.fillStyle = theme.isLightMode ? '#6b21a8' : '#ffffff';
    ctx.font = '900 80px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, avatarCenterX, avatarCenterY - 10);

    // Bottom Small Tag
    ctx.fillStyle = theme.isLightMode ? '#7c3aed' : '#c4b5fd';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('FISIOCAREHUB', avatarCenterX, avatarCenterY + 50);
  }
  ctx.restore();

  // Avatar Checkmark Badge (Bottom Right of Photo)
  const badgeSize = 44;
  const badgeX = avatarX + avatarSize - badgeSize / 2 - 8;
  const badgeY = avatarY + avatarSize - badgeSize / 2 - 8;

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

  // --- Layer 6: Name & Specialization ---
  let cursorY = avatarY + avatarSize + 55;

  // Role: FISIOTERAPEUTA
  ctx.fillStyle = theme.roleColor;
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5px';
  ctx.fillText('FISIOTERAPEUTA', width / 2, cursorY);

  // Professional Name
  cursorY += 52;
  ctx.fillStyle = theme.nameColor;
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '-0.5px';
  ctx.textAlign = 'center';

  // Truncate name if too long
  let displayName = professionalName;
  if (ctx.measureText(displayName).width > cardW - 120) {
    while (displayName.length > 5 && ctx.measureText(displayName + '...').width > cardW - 120) {
      displayName = displayName.slice(0, -1).trim();
    }
    displayName += '...';
  }
  ctx.fillText(displayName, width / 2, cursorY);

  // Specialty
  cursorY += 38;
  ctx.fillStyle = theme.specialtyColor;
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(specialty.toUpperCase(), width / 2, cursorY);

  // Registration Pills (CREFITO + PRO)
  cursorY += 45;
  const crefitoLabel = crefito.toUpperCase().startsWith('CREFITO')
    ? crefito
    : `CREFITO-3: ${crefito.replace(/^CREFITO-?\d*:\s*/i, '')}`;

  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  const crefTextW = ctx.measureText(crefitoLabel).width;
  const crefPillW = crefTextW + 56;
  const crefPillH = 46;
  const totalPillsW = isPro ? crefPillW + 130 : crefPillW;
  const startPillsX = (width - totalPillsW) / 2;

  // CREFITO Pill
  ctx.save();
  ctx.fillStyle = theme.crefitoBg;
  ctx.strokeStyle = theme.crefitoBorder;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, startPillsX, cursorY - 32, crefPillW, crefPillH, 23);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.crefitoText;
  ctx.textAlign = 'center';
  ctx.fillText(crefitoLabel, startPillsX + crefPillW / 2, cursorY);
  ctx.restore();

  // PRO Badge Pill (if enabled)
  if (isPro) {
    const proPillX = startPillsX + crefPillW + 16;
    const proPillW = 114;
    ctx.save();
    ctx.fillStyle = theme.proBg;
    ctx.strokeStyle = theme.proBorder;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, proPillX, cursorY - 32, proPillW, crefPillH, 23);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.proText;
    ctx.textAlign = 'center';
    ctx.fillText('★ PRO', proPillX + proPillW / 2, cursorY);
    ctx.restore();
  }

  // --- Layer 7: Central Validation Card (Glassmorphism + QR Code) ---
  const valCardW = 680;
  const valCardH = 470;
  const valCardX = (width - valCardW) / 2;
  const valCardY = cardY + 1040;

  ctx.save();
  drawRoundedRect(ctx, valCardX, valCardY, valCardW, valCardH, 44);
  ctx.fillStyle = theme.qrCardBg;
  ctx.fill();
  ctx.strokeStyle = theme.qrCardBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Validation Card Header: "✓ VALIDAR CREDENCIAL"
  ctx.fillStyle = theme.qrHeaderCheck;
  ctx.font = '900 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ VALIDAR CREDENCIAL', width / 2, valCardY + 46);

  // QR Code Box (White rounded background)
  const qrBoxSize = 250;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = valCardY + 68;

  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
  ctx.fillStyle = theme.qrBoxBg || '#ffffff';
  ctx.fill();

  // Draw QR Image inside QR Box
  if (qrImg && qrImg.naturalWidth > 0) {
    const qrPad = 16;
    ctx.drawImage(qrImg, qrBoxX + qrPad, qrBoxY + qrPad, qrBoxSize - qrPad * 2, qrBoxSize - qrPad * 2);
  } else {
    // Fallback QR icon/text
    ctx.fillStyle = '#64748b';
    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('QR CODE', width / 2, qrBoxY + qrBoxSize / 2);
  }

  // ID DA CREDENCIAL
  ctx.fillStyle = theme.qrIdColor;
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(`ID DA CREDENCIAL - ${credentialCode}`, width / 2, valCardY + 360);

  // Instruction subtitle
  ctx.fillStyle = theme.qrSubColor;
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('Escanear para verificar este perfil', width / 2, valCardY + 395);
  ctx.restore();

  // --- Layer 8: Footer 3-Column Bar ---
  const footerY = cardY + cardH - 120;

  // Divider Line
  ctx.save();
  ctx.strokeStyle = theme.footerBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, footerY - 45);
  ctx.lineTo(cardX + cardW - 60, footerY - 45);
  ctx.stroke();

  // 3 Columns: Service, Location, Issued Date
  const col1X = cardX + 160;
  const col2X = width / 2;
  const col3X = cardX + cardW - 160;

  ctx.textAlign = 'center';

  // Column 1: Services
  ctx.fillStyle = theme.id === 'blue' ? '#38bdf8' : theme.brandColor;
  ctx.font = '800 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('🏠', col1X, footerY - 8);
  ctx.fillStyle = theme.footerTextColor;
  ctx.font = '600 19px system-ui, -apple-system, sans-serif';
  ctx.fillText(serviceLabel || 'Atendimento', col1X, footerY + 22);

  // Column 2: Location
  ctx.fillStyle = theme.id === 'blue' ? '#38bdf8' : theme.brandColor;
  ctx.font = '800 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('📍', col2X, footerY - 8);
  ctx.fillStyle = theme.footerCenterColor;
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(city, col2X, footerY + 22);

  // Column 3: Issued Date
  ctx.fillStyle = theme.id === 'blue' ? '#38bdf8' : theme.brandColor;
  ctx.font = '800 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('📅', col3X, footerY - 8);
  ctx.fillStyle = theme.footerTextColor;
  ctx.font = '600 19px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Emissão: ${issuedAt}`, col3X, footerY + 22);
  ctx.restore();

  // --- Layer 9: Outer Card Border ---
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
