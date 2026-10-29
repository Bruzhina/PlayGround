import { STARTER_MAP } from "./data.js";

const TAU = Math.PI * 2;

function rgb(hex, alpha = 1) {
  if (!hex || hex[0] !== "#") return `rgba(255,255,255,${alpha})`;
  const value = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const number = parseInt(value.slice(1), 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function shade(hex, amount) {
  if (!hex || hex[0] !== "#") return hex;
  const value = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const number = parseInt(value.slice(1), 16);
  let r = (number >> 16) & 255;
  let g = (number >> 8) & 255;
  let b = number & 255;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const k = 1 + amount;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  }
  return `rgb(${r},${g},${b})`;
}

function radial(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

function rrect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function spike(ctx, x, y, w, h, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.restore();
}

function halo(ctx, x, y, rx, ry, color, width = 1.4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawAura(ctx, color, radius, time, strength = 1) {
  const pulse = 0.82 + Math.sin(time * 3.2) * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = radial(ctx, 0, 0, radius * 0.1, 0, 0, radius * pulse, [
    [0, rgb(color, 0.22 * strength)],
    [0.55, rgb(color, 0.07 * strength)],
    [1, rgb(color, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * pulse, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgb(color, 0.2 * strength);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 9, radius * 0.72, radius * 0.3, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawAgumon(ctx, data, stage, time, attack) {
  const body = stage === 2 ? "#dbe9f5" : data.color;
  const dark = stage === 2 ? "#5f7894" : data.dark;
  const light = stage === 2 ? "#ffffff" : data.light;
  const accent = stage === 2 ? "#ff5e78" : data.accent;
  const step = Math.sin(time * 5.4) * 1.4;
  const arm = Math.sin(time * 5.4 + 1) * 2;

  ctx.save();
  ctx.rotate(-0.04 + Math.sin(time * 2.4) * 0.02);

  ctx.strokeStyle = shade(body, -0.34);
  ctx.lineWidth = 5.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 5);
  ctx.quadraticCurveTo(-25, 11, -27, -2);
  ctx.stroke();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-27, -2);
  ctx.quadraticCurveTo(-33, -8, -29, -11);
  ctx.quadraticCurveTo(-24, -10, -22, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(body, -0.22);
  rrect(ctx, -13, 10, 11, 6, 3);
  ctx.fill();
  ctx.fillStyle = shade(body, -0.1);
  rrect(ctx, 5, 11 - step * 0.5, 11, 6, 3);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(13, 15);
  ctx.lineTo(16, 12);
  ctx.lineTo(17, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = radial(ctx, -5, -7, 2, 3, 4, 26, [
    [0, shade(body, 0.2)],
    [0.55, body],
    [1, shade(body, -0.28)]
  ]);
  ellipse(ctx, 2, 4, 15, 15.5);
  ctx.fill();

  ctx.fillStyle = rgb(light, 0.9);
  ellipse(ctx, 5, 8, 8.5, 8);
  ctx.fill();
  ctx.strokeStyle = rgb(dark, 0.32);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, 7);
  ctx.quadraticCurveTo(5, 10, 11, 7);
  ctx.stroke();

  ctx.strokeStyle = shade(body, -0.25);
  ctx.lineWidth = 4.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.quadraticCurveTo(19, 3 + arm, 17, 8 + arm);
  ctx.stroke();
  ctx.fillStyle = stage === 2 ? accent : light;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(15 + i * 2, 7 + arm);
    ctx.lineTo(19 + i * 2, 9 + arm);
    ctx.lineTo(17 + i * 2, 10.5 + arm);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = radial(ctx, 2, -20, 2, 4, -13, 18, [
    [0, shade(body, 0.28)],
    [0.6, body],
    [1, shade(body, -0.24)]
  ]);
  ellipse(ctx, 4, -12, 14.5, 12.5);
  ctx.fill();

  ctx.fillStyle = shade(body, 0.08);
  ellipse(ctx, 13, -8, 8, 5.5);
  ctx.fill();
  ctx.fillStyle = rgb(light, 0.55);
  ellipse(ctx, 15, -6.5, 5, 2.4);
  ctx.fill();
  ctx.strokeStyle = rgb(dark, 0.7);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(10, -5.2);
  ctx.quadraticCurveTo(14, -3.6, 18, -5.5);
  ctx.stroke();

  ctx.fillStyle = "#15202b";
  ellipse(ctx, 5, -15, 2.7, 3.5);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ellipse(ctx, 5.8, -16.4, 0.9, 1.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ellipse(ctx, 2, -17, 3.2, 2.2);
  ctx.fill();

  ctx.fillStyle = rgb(dark, 0.5);
  for (let i = 0; i < 3; i += 1) {
    rrect(ctx, -3 + i * 5, -10 + i * 1.5, 1.2, 4.2, 0.6);
    ctx.fill();
  }

  if (stage >= 1) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-8, -21);
    ctx.lineTo(-3, -30);
    ctx.lineTo(0, -20);
    ctx.lineTo(5, -31);
    ctx.lineTo(8, -20);
    ctx.lineTo(14, -27);
    ctx.lineTo(12, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(accent, 0.28);
    ctx.beginPath();
    ctx.moveTo(-3, -21);
    ctx.lineTo(0, -27);
    ctx.lineTo(3, -20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(body, -0.35);
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-6 + i * 7, 2);
      ctx.lineTo(-4 + i * 7, 8);
      ctx.lineTo(-2 + i * 7, 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(19, -11);
    ctx.lineTo(27, -15);
    ctx.lineTo(24, -8);
    ctx.closePath();
    ctx.fill();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#c7d8e8";
    ctx.strokeStyle = "#7f9ab5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.lineTo(0, -26);
    ctx.lineTo(13, -20);
    ctx.lineTo(8, -13);
    ctx.lineTo(-6, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = radial(ctx, -20, -10, 1, -18, -6, 16, [
      [0, "#f4fbff"],
      [1, "#8fa9c4"]
    ]);
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(-24, -22);
    ctx.lineTo(-20, -4);
    ctx.lineTo(-28, 2);
    ctx.lineTo(-14, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7f9ab5";
    ctx.stroke();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(19, -20);
    ctx.lineTo(27, -26);
    ctx.lineTo(24, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#58f0ff";
    ellipse(ctx, 5, -15, 2.4, 2.6);
    ctx.fill();
  }

  if (attack > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = radial(ctx, 20, -8, 0, 20, -8, 12 * attack, [
      [0, "rgba(255,240,190,0.9)"],
      [0.4, rgb(accent, 0.55 * attack)],
      [1, rgb(accent, 0)]
    ]);
    ctx.beginPath();
    ctx.arc(20, -8, 12 * attack, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

function drawGabumon(ctx, data, stage, time, attack) {
  const metal = stage === 2;
  const wolf = stage >= 1;
  const body = metal ? "#c6d7e6" : wolf ? "#dff4ff" : data.color;
  const dark = metal ? "#506b85" : wolf ? "#3e7ca3" : data.dark;
  const light = metal ? "#f4fbff" : wolf ? "#ffffff" : data.light;
  const accent = metal ? "#58f0ff" : data.accent;
  const step = Math.sin(time * 5.8) * 1.6;

  ctx.save();
  ctx.rotate(0.03 + Math.sin(time * 2.2) * 0.015);

  ctx.strokeStyle = shade(body, -0.3);
  ctx.lineWidth = 4.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.quadraticCurveTo(-26, 2, -28, -6);
  ctx.stroke();

  ctx.fillStyle = shade(body, -0.18);
  rrect(ctx, -13, 9, 10, 6, 3);
  ctx.fill();
  ctx.fillStyle = shade(body, -0.06);
  rrect(ctx, 4, 10 - step * 0.5, 10, 6, 3);
  ctx.fill();
  ctx.fillStyle = light;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 2.4, 14);
    ctx.lineTo(12 + i * 2.4, 16.5);
    ctx.lineTo(13.6 + i * 2.4, 14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = radial(ctx, -4, -6, 2, 2, 4, 25, [
    [0, shade(body, 0.2)],
    [0.58, body],
    [1, shade(body, -0.28)]
  ]);
  ellipse(ctx, 1, 5, 16, 13);
  ctx.fill();

  ctx.fillStyle = light;
  ellipse(ctx, 5, 9, 8.5, 6.5);
  ctx.fill();

  if (wolf) {
    ctx.strokeStyle = rgb(dark, 0.55);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-8 + i * 5, -1 + i * 0.8);
      ctx.quadraticCurveTo(-4 + i * 5, 2, -1 + i * 5, 4 + i * 0.4);
      ctx.stroke();
    }
  }

  const headY = -12;
  ctx.fillStyle = radial(ctx, 2, headY - 6, 1, 5, headY, 18, [
    [0, shade(body, 0.3)],
    [0.62, body],
    [1, shade(body, -0.22)]
  ]);
  ellipse(ctx, 5, headY, 13.5, 11.5);
  ctx.fill();

  ctx.fillStyle = shade(body, -0.02);
  ctx.beginPath();
  ctx.moveTo(10, headY - 2);
  ctx.quadraticCurveTo(23, headY - 2, 22, headY + 3);
  ctx.quadraticCurveTo(19, headY + 7, 11, headY + 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#17222e";
  ellipse(ctx, 16, headY + 1.5, 2.4, 1.8);
  ctx.fill();
  ctx.strokeStyle = rgb(dark, 0.75);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(13, headY + 5);
  ctx.quadraticCurveTo(17, headY + 6.6, 20, headY + 4.4);
  ctx.stroke();

  ctx.fillStyle = "#13202c";
  ellipse(ctx, 5, headY - 5, 2.5, 3.2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ellipse(ctx, 5.8, headY - 6.4, 0.9, 1.1);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, headY - 10);
  ctx.lineTo(-2.5, headY - 22);
  ctx.lineTo(5, headY - 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(accent, 0.35);
  ctx.beginPath();
  ctx.moveTo(0.4, headY - 11);
  ctx.lineTo(-1, headY - 19);
  ctx.lineTo(3, headY - 13.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.moveTo(-8, headY + 1);
  ctx.quadraticCurveTo(-14, headY + 8, -7, headY + 10);
  ctx.quadraticCurveTo(-1, headY + 9, -2, headY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8b63c";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 2.2, headY + 2.5);
    ctx.lineTo(-10 + i * 2.2, headY + 6);
    ctx.lineTo(-6 + i * 2.2, headY + 5);
    ctx.closePath();
    ctx.fill();
  }

  if (stage >= 1) {
    ctx.fillStyle = shade(accent, 0.2);
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 3.6, -16);
      ctx.lineTo(-7 + i * 3.6, -24 - (i % 2) * 3);
      ctx.lineTo(-3 + i * 3.6, -15.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = shade(accent, -0.1);
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.quadraticCurveTo(-20, -18, -22, -30);
    ctx.quadraticCurveTo(-13, -25, -8, -22);
    ctx.closePath();
    ctx.fill();
  }

  if (metal) {
    ctx.fillStyle = "#8fa9c4";
    rrect(ctx, -9, -24, 6, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#ffb02e";
    rrect(ctx, 6, -25, 5, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = "#58f0ff";
    ellipse(ctx, 5, headY - 5, 2.5, 2.8);
    ctx.fill();
    ctx.strokeStyle = "#58f0ff";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(9, -20);
    ctx.lineTo(15, -24);
    ctx.lineTo(17, -20);
    ctx.stroke();
    ctx.fillStyle = "#7f9ab5";
    rrect(ctx, -18, 3, 7, 12, 2);
    ctx.fill();
    ctx.fillStyle = "#ffb02e";
    rrect(ctx, -17, 5, 5, 8, 1);
    ctx.fill();
  }

  if (attack > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = radial(ctx, 22, headY + 1, 0, 22, headY + 1, 11 * attack, [
      [0, "rgba(230,252,255,0.9)"],
      [0.45, rgb(accent, 0.55 * attack)],
      [1, rgb(accent, 0)]
    ]);
    ctx.beginPath();
    ctx.arc(22, headY + 1, 11 * attack, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

function drawWings(ctx, x, y, size, color, time, spread = 1) {
  const flap = 0.85 + Math.sin(time * 4.2) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flap * spread, 1);
  ctx.fillStyle = radial(ctx, 0, 0, 1, -size * 0.6, 0, size, [
    [0, rgb(color, 0.95)],
    [1, rgb(color, 0.45)]
  ]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.55, -size * 0.7, -size, -size * 0.22);
  ctx.quadraticCurveTo(-size * 0.72, size * 0.16, -size * 0.32, size * 0.08);
  ctx.quadraticCurveTo(-size * 0.74, size * 0.48, -size * 0.2, size * 0.42);
  ctx.quadraticCurveTo(-size * 0.3, size * 0.7, 0, size * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPatamon(ctx, data, stage, time, attack) {
  const gold = stage === 2;
  const angel = stage >= 1;
  const body = gold ? "#ffe08a" : angel ? "#f4f8ff" : data.color;
  const dark = gold ? "#a87918" : angel ? "#8aa2c4" : data.dark;
  const light = gold ? "#fff8d6" : angel ? "#ffffff" : data.light;
  const accent = data.accent;
  const bob = Math.sin(time * 4.6) * 2;

  ctx.save();
  ctx.translate(0, bob);

  if (stage === 2) {
    drawWings(ctx, -7, -6, 20, "#fff4c4", time, 1.15);
    drawWings(ctx, 7, -6, 18, "#ffffff", time + 0.2, 1);
  } else if (stage === 1) {
    drawWings(ctx, -6, -4, 16, "#f2f8ff", time, 1);
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = radial(ctx, 0, 0, 2, 0, 0, 28, [
    [0, rgb(accent, 0.2)],
    [1, rgb(accent, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  if (angel) {
    ctx.fillStyle = linear(ctx, -12, -4, 12, 22, [
      [0, light],
      [0.55, "#dfe9ff"],
      [1, "#9fb6dc"]
    ]);
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(0, -10, 9, -2);
    ctx.lineTo(13, 18);
    ctx.quadraticCurveTo(0, 23, -13, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgb(gold ? "#ffd166" : "#c9d8f5", 0.9);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(0, 2, 9, -2);
    ctx.stroke();
    ctx.fillStyle = gold ? "#ffd166" : "#dbe7ff";
    rrect(ctx, -7, 4, 14, 2.4, 1);
    ctx.fill();
    ctx.fillStyle = gold ? "#b8860b" : "#6f8cb8";
    rrect(ctx, -8, 8, 16, 1.8, 1);
    ctx.fill();

    ctx.fillStyle = radial(ctx, -4, -16, 1, 0, -12, 13, [
      [0, light],
      [1, shade(body, -0.08)]
    ]);
    ellipse(ctx, 0, -12, 10, 10.5);
    ctx.fill();
    ctx.fillStyle = "#15202b";
    ellipse(ctx, -3.4, -13, 1.9, 2.6);
    ctx.fill();
    ellipse(ctx, 3.4, -13, 1.9, 2.6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ellipse(ctx, -2.8, -14, 0.6, 0.8);
    ctx.fill();
    ellipse(ctx, 4, -14, 0.6, 0.8);
    ctx.fill();
    ctx.strokeStyle = rgb(dark, 0.65);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.quadraticCurveTo(0, -6.7, 2, -8);
    ctx.stroke();

    ctx.fillStyle = gold ? "#ffd166" : "#c9d8f5";
    ctx.beginPath();
    ctx.moveTo(-10, -15);
    ctx.lineTo(-14, -21);
    ctx.lineTo(-6, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -15);
    ctx.lineTo(14, -21);
    ctx.lineTo(6, -18);
    ctx.closePath();
    ctx.fill();
    if (gold) {
      halo(ctx, 0, -26, 9, 2.6, "rgba(255,225,120,0.9)", 1.6);
    }
    if (stage === 2) {
      ctx.fillStyle = "#ffd166";
      for (let i = 0; i < 3; i += 1) {
        rrect(ctx, -7 + i * 5.5, 13, 1.4, 6, 0.7);
        ctx.fill();
      }
    }
  } else {
    drawWings(ctx, -8, -9, 11, accent, time, 0.9);
    drawWings(ctx, 8, -9, 11, accent, time + 0.4, 0.9);

    ctx.fillStyle = radial(ctx, -5, -14, 2, 1, -2, 20, [
      [0, light],
      [0.55, body],
      [1, shade(body, -0.14)]
    ]);
    ellipse(ctx, 0, -2, 13.5, 14);
    ctx.fill();

    ctx.fillStyle = rgb(light, 0.75);
    ellipse(ctx, 3, 2, 8, 9);
    ctx.fill();

    ctx.fillStyle = "#15202b";
    ellipse(ctx, -5, -5, 2.3, 3);
    ctx.fill();
    ellipse(ctx, 5, -5, 2.3, 3);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ellipse(ctx, -4.3, -6.2, 0.8, 1);
    ctx.fill();
    ellipse(ctx, 5.7, -6.2, 0.8, 1);
    ctx.fill();
    ctx.strokeStyle = rgb(dark, 0.8);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2, 1);
    ctx.quadraticCurveTo(0, 2.4, 2, 1);
    ctx.stroke();

    ctx.fillStyle = shade(body, -0.2);
    rrect(ctx, -8, 11, 6, 4, 2);
    ctx.fill();
    rrect(ctx, 2, 11, 6, 4, 2);
    ctx.fill();
  }

  if (attack > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = radial(ctx, 18, -2, 0, 18, -2, 10 * attack, [
      [0, "rgba(255,255,230,0.95)"],
      [0.4, rgb(accent, 0.6 * attack)],
      [1, rgb(accent, 0)]
    ]);
    ctx.beginPath();
    ctx.arc(18, -2, 10 * attack, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

export function drawCreature(ctx, starterId, stage, time, options = {}) {
  const data = STARTER_MAP[starterId];
  if (!data) return;
  const attack = options.attack || 0;
  const aura = stage === 2 ? 1.25 : stage === 1 ? 0.7 : 0.36;
  drawAura(ctx, stage === 2 ? "#ffd166" : data.accent, 30 + stage * 5, time, aura);
  if (stage >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4 + stage * 2; i += 1) {
      const angle = time * 0.6 + i * 1.7;
      const distance = 24 + stage * 6 + Math.sin(time * 1.8 + i) * 3;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.6 - 6;
      ctx.fillStyle = rgb(stage === 2 ? "#ffd166" : data.accent, 0.35 + Math.sin(time * 3 + i) * 0.15);
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  if (starterId === "agumon") drawAgumon(ctx, data, stage, time, attack);
  else if (starterId === "gabumon") drawGabumon(ctx, data, stage, time, attack);
  else drawPatamon(ctx, data, stage, time, attack);
}

export function drawEnemyCreature(ctx, type, time, phase, flash = 0, color = "#a78bfa") {
  if (type === "crawler") drawCrawler(ctx, time, phase, color);
  else if (type === "bat" || type === "charger") drawBat(ctx, time, phase, color, type === "charger");
  else if (type === "spitter") drawSpitter(ctx, time, phase, color);
  else if (type === "tank") drawTank(ctx, time, phase, color);
  else if (type === "boss") drawBoss(ctx, time, color);
  else if (type === "boss2") drawBoss2(ctx, time, color);
  if (flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, flash * 4)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawCrawler(ctx, time, phase, color) {
  const walk = Math.sin(time * 9 + phase) * 2.2;
  ctx.save();
  ctx.strokeStyle = shade(color, -0.45);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i += 1) {
    const y = -5 + i * 5;
    ctx.beginPath();
    ctx.moveTo(-8, y);
    ctx.lineTo(-14 - i, y + 3 + walk * (i % 2 === 0 ? 1 : -1));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.lineTo(14 + i, y + 3 - walk * (i % 2 === 0 ? 1 : -1));
    ctx.stroke();
  }
  ctx.fillStyle = radial(ctx, -4, -6, 2, 0, 0, 17, [
    [0, shade(color, 0.32)],
    [0.55, color],
    [1, shade(color, -0.42)]
  ]);
  ellipse(ctx, 0, 0, 12.5, 14);
  ctx.fill();
  ctx.fillStyle = shade(color, -0.5);
  for (let i = 0; i < 4; i += 1) {
    spike(ctx, -10 + i * 6.6, -11, 3.2, 5, 0.2 - i * 0.15);
    ctx.fill();
  }
  ctx.fillStyle = "#180a24";
  ellipse(ctx, 0, -2, 6, 6.4);
  ctx.fill();
  ctx.fillStyle = "#ff4d6d";
  ellipse(ctx, 0, -2, 3.8, 4);
  ctx.fill();
  ctx.fillStyle = "#ffd6de";
  ellipse(ctx, -1, -3.4, 1, 1.2);
  ctx.fill();
  ctx.fillStyle = "#f4e9ff";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-4 + i * 4, 6);
    ctx.lineTo(-2 + i * 4, 10.5);
    ctx.lineTo(0 + i * 4, 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBat(ctx, time, phase, color, charger) {
  const flap = Math.sin(time * 11 + phase);
  const wing = charger ? 19 : 16;
  const membrane = shade(color, -0.22);
  const bone = shade(color, 0.28);
  ctx.save();
  ctx.rotate(Math.sin(time * 2.3 + phase) * 0.08);

  ctx.fillStyle = membrane;
  ctx.strokeStyle = bone;
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.quadraticCurveTo(9, -12 - flap * 6, wing, -3 + flap * 3);
    ctx.quadraticCurveTo(13, 1, 9, 2);
    ctx.quadraticCurveTo(12, 6, 6, 6);
    ctx.quadraticCurveTo(9, 10, 3, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = bone;
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.lineTo(wing * 0.92, -2 + flap * 2);
    ctx.moveTo(4, 2);
    ctx.lineTo(wing * 0.62, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.fillStyle = radial(ctx, -2, -6, 1, 0, 0, 13, [
    [0, shade(color, 0.3)],
    [0.55, color],
    [1, shade(color, -0.42)]
  ]);
  ellipse(ctx, 0, 0, 8.5, 10);
  ctx.fill();

  ctx.fillStyle = "#1c0a20";
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(-3, -15);
  ctx.lineTo(-1, -7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -7);
  ctx.lineTo(3, -15);
  ctx.lineTo(1, -7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffd166";
  ellipse(ctx, -3.2, -2, 2.1, 2.7);
  ctx.fill();
  ellipse(ctx, 3.2, -2, 2.1, 2.7);
  ctx.fill();
  ctx.fillStyle = "#2a0d1d";
  ellipse(ctx, -3.2, -1.8, 0.85, 1.8);
  ctx.fill();
  ellipse(ctx, 3.2, -1.8, 0.85, 1.8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ellipse(ctx, -3.7, -3, 0.6, 0.9);
  ctx.fill();
  ellipse(ctx, 2.7, -3, 0.6, 0.9);
  ctx.fill();

  ctx.fillStyle = "#f8e8ee";
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.lineTo(-2, 8);
  ctx.lineTo(-1, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.lineTo(2, 8);
  ctx.lineTo(1, 4);
  ctx.closePath();
  ctx.fill();

  if (charger) {
    ctx.strokeStyle = "rgba(255,77,109,0.7)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(0, 15);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpitter(ctx, time, phase, color) {
  const leg = Math.sin(time * 6 + phase) * 1.8;
  ctx.save();
  ctx.strokeStyle = shade(color, -0.5);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i += 1) {
    const angle = -1.1 + i * 0.72;
    const x = Math.cos(angle) * 10;
    const y = Math.sin(angle) * 10;
    ctx.beginPath();
    ctx.moveTo(x * 0.6, y * 0.6);
    ctx.lineTo(x * 1.55, y * 1.5 + leg * (i % 2 === 0 ? 0.7 : -0.7));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x * 0.6, y * 0.6);
    ctx.lineTo(-x * 1.55, y * 1.5 - leg * (i % 2 === 0 ? 0.7 : -0.7));
    ctx.stroke();
  }
  ctx.fillStyle = radial(ctx, -4, -6, 1, 0, 0, 16, [
    [0, shade(color, 0.32)],
    [0.6, color],
    [1, shade(color, -0.42)]
  ]);
  ellipse(ctx, 0, 0, 11.5, 10.5);
  ctx.fill();
  ctx.fillStyle = shade(color, -0.3);
  rrect(ctx, -6, -7, 12, 3, 1.5);
  ctx.fill();
  ctx.fillStyle = "#0d2824";
  for (let i = 0; i < 4; i += 1) {
    ellipse(ctx, -4 + i * 2.7, -1 + (i % 2) * 2, 1.5, 1.8);
    ctx.fill();
  }
  ctx.fillStyle = "#b8ff6a";
  for (let i = 0; i < 4; i += 1) {
    ellipse(ctx, -4 + i * 2.7, -1.4 + (i % 2) * 2, 0.7, 0.9);
    ctx.fill();
  }
  ctx.strokeStyle = rgb("#b8ff6a", 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.quadraticCurveTo(-2, 6, 0, 8);
  ctx.stroke();
  ctx.restore();
}

function drawTank(ctx, time, phase, color) {
  const pulse = 0.85 + Math.sin(time * 4 + phase) * 0.15;
  ctx.save();
  ctx.strokeStyle = shade(color, -0.55);
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    const y = -6 + i * 6;
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(-17, y + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(17, y + 2);
    ctx.stroke();
  }
  ctx.fillStyle = radial(ctx, -5, -8, 2, 0, 0, 20, [
    [0, shade(color, 0.42)],
    [0.5, color],
    [1, shade(color, -0.5)]
  ]);
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * TAU + Math.PI / 6;
    const x = Math.cos(angle) * 16;
    const y = Math.sin(angle) * 16;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#24140a";
  ellipse(ctx, 0, 0, 7.5, 7.5);
  ctx.fill();
  ctx.fillStyle = rgb("#ffb02e", pulse);
  ellipse(ctx, 0, 0, 4.4, 4.4);
  ctx.fill();
  ctx.fillStyle = "#fff5c8";
  ellipse(ctx, -1, -1, 1.6, 1.6);
  ctx.fill();
  ctx.fillStyle = shade(color, -0.62);
  spike(ctx, -10, -9, 4, 7, -0.5);
  ctx.fill();
  spike(ctx, 10, -9, 4, 7, 0.5);
  ctx.fill();
  ctx.restore();
}

function drawBoss(ctx, time, color) {
  const pulse = 0.8 + Math.sin(time * 3) * 0.2;
  const flap = Math.sin(time * 3.4) * 0.16;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = radial(ctx, 0, 0, 4, 0, 0, 38, [
    [0, rgb(color, 0.32)],
    [0.6, rgb(color, 0.1)],
    [1, rgb(color, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#1a0a18";
  ctx.save();
  ctx.rotate(-0.12 + flap);
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.quadraticCurveTo(-24, -20, -32, -2);
  ctx.quadraticCurveTo(-22, -4, -18, 8);
  ctx.quadraticCurveTo(-12, 0, -6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(color, 0.65);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.rotate(0.12 - flap);
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(24, -20, 32, -2);
  ctx.quadraticCurveTo(22, -4, 18, 8);
  ctx.quadraticCurveTo(12, 0, 6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(color, 0.65);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = radial(ctx, -6, -10, 2, 0, 0, 26, [
    [0, shade(color, 0.25)],
    [0.42, color],
    [1, "#1a0717"]
  ]);
  ellipse(ctx, 0, 0, 18, 22);
  ctx.fill();

  ctx.fillStyle = "#200a1d";
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(-18, -30);
  ctx.lineTo(-6, -20);
  ctx.lineTo(0, -30);
  ctx.lineTo(6, -20);
  ctx.lineTo(18, -30);
  ctx.lineTo(14, -13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(color, 0.9);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = "#ff2d5e";
  ellipse(ctx, -6, -7, 3.4, 4.4);
  ctx.fill();
  ellipse(ctx, 6, -7, 3.4, 4.4);
  ctx.fill();
  ctx.fillStyle = "#ffe0e6";
  ellipse(ctx, -6.5, -8.4, 1.1, 1.4);
  ctx.fill();
  ellipse(ctx, 5.5, -8.4, 1.1, 1.4);
  ctx.fill();

  ctx.strokeStyle = "#2a0b20";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.quadraticCurveTo(0, 9, 7, 4);
  ctx.stroke();
  ctx.fillStyle = "#f8e8ee";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-5 + i * 3.4, 5);
    ctx.lineTo(-3.3 + i * 3.4, 8.6);
    ctx.lineTo(-1.6 + i * 3.4, 5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-15, -2);
  ctx.lineTo(-25, 10 + pulse * 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.lineTo(25, 10 - pulse * 3);
  ctx.stroke();

  ctx.fillStyle = rgb(color, 0.9);
  ctx.beginPath();
  ctx.moveTo(-8, 12);
  ctx.lineTo(-4, 20);
  ctx.lineTo(0, 13);
  ctx.lineTo(4, 20);
  ctx.lineTo(8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBoss2(ctx, time, color) {
  const pulse = 0.8 + Math.sin(time * 5) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = radial(ctx, 0, 0, 5, 0, 0, 40, [
    [0, rgb(color, 0.34)],
    [0.55, rgb(color, 0.1)],
    [1, rgb(color, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#2b1b10";
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.fillStyle = "#51463d";
    rrect(ctx, 10, -8, 22, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#2a221c";
    rrect(ctx, 24, -6, 12, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0a8";
    rrect(ctx, 34, -4.5, 3, 5, 1);
    ctx.fill();
    ctx.fillStyle = shade(color, -0.2);
    rrect(ctx, 14, 4, 14, 5, 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = radial(ctx, -6, -10, 2, 0, 0, 28, [
    [0, "#a89a8e"],
    [0.42, "#6b6058"],
    [1, "#241c17"]
  ]);
  rrect(ctx, -18, -18, 36, 36, 8);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = "#191410";
  rrect(ctx, -12, -12, 24, 14, 3);
  ctx.fill();
  ctx.fillStyle = rgb("#ff3d5e", pulse);
  rrect(ctx, -9, -9, 18, 5, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.9)";
  rrect(ctx, -8, -8, 5, 2, 1);
  ctx.fill();

  ctx.fillStyle = shade(color, -0.3);
  for (let i = 0; i < 3; i += 1) {
    rrect(ctx, -7 + i * 5, 7, 2, 7, 1);
    ctx.fill();
  }

  ctx.fillStyle = "#4a4038";
  rrect(ctx, -22, -24, 8, 12, 2);
  ctx.fill();
  rrect(ctx, 14, -24, 8, 12, 2);
  ctx.fill();
  ctx.fillStyle = rgb(color, 0.85);
  ellipse(ctx, -18, -25, 3.4, 3.4);
  ctx.fill();
  ellipse(ctx, 18, -25, 3.4, 3.4);
  ctx.fill();

  ctx.fillStyle = "#1b1512";
  ctx.beginPath();
  ctx.moveTo(-18, -17);
  ctx.lineTo(-24, -30);
  ctx.lineTo(-10, -23);
  ctx.lineTo(0, -32);
  ctx.lineTo(10, -23);
  ctx.lineTo(24, -30);
  ctx.lineTo(18, -17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.fillStyle = "#3a3029";
  for (let i = 0; i < 3; i += 1) {
    rrect(ctx, 10, 5 + i * 4, 8, 2.4, 1);
    ctx.fill();
  }
  ctx.restore();
}

export function drawShard(ctx, time, phase, color = "#6dffcf") {
  const bob = Math.sin(time * 5 + phase) * 1.5;
  const spin = time * 2.4 + phase;
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(spin);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = radial(ctx, 0, 0, 0, 0, 0, 10, [
    [0, rgb(color, 0.35)],
    [1, rgb(color, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(3.4, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-3.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(1.2, 0);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPortrait(canvas, starterId, stage = 0, time = 0) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.clientWidth || 120;
  const height = rect.height || canvas.clientHeight || 92;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const data = STARTER_MAP[starterId];
  if (!data) return;
  ctx.save();
  ctx.translate(width / 2, height / 2 + 4);
  const scale = Math.min(width, height) / 68;
  ctx.scale(scale, scale);
  ctx.fillStyle = radial(ctx, 0, 8, 2, 0, 8, 30, [
    [0, rgb(data.color, 0.18)],
    [1, rgb(data.color, 0)]
  ]);
  ctx.beginPath();
  ctx.ellipse(0, 14, 24, 8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 5, 0, 0, TAU);
  ctx.fill();
  drawCreature(ctx, starterId, stage, time, {});
  ctx.restore();
}
