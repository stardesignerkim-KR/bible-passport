// 완독카드 — 브라우저 canvas 로 PNG 생성 (서버 부담 없음)
export async function makeCard({ bookName, cityNo, chapters, date, siteName, siteUrl }) {
  try { await document.fonts.load('800 80px "Noto Sans KR"'); await document.fonts.load('500 30px "Noto Sans KR"'); } catch {}
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = (w, px) => `${w} ${px}px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#FFE9B0'); bg.addColorStop(1, '#BFE3FF');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // 점선 순례길
  g.strokeStyle = 'rgba(30,42,71,.18)'; g.lineWidth = 6; g.setLineDash([2, 22]); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-20, 1180); g.bezierCurveTo(250, 1000, 450, 1300, 700, 1120); g.bezierCurveTo(900, 990, 1000, 1100, 1120, 1020); g.stroke();
  g.setLineDash([]);

  // 여권 패널
  const px = 70, py = 90, pw = W - 140, ph = 1060, r = 48;
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(30,42,71,.18)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  g.beginPath(); g.roundRect(px, py, pw, ph, r); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = '#1E2A47'; g.beginPath(); g.roundRect(px, py, pw, 150, [r, r, 0, 0]); g.fill();
  g.fillStyle = '#FFC53D'; g.textAlign = 'left'; g.font = font(800, 54); g.fillText(siteName, px + 56, py + 94);
  g.fillStyle = '#fff'; g.textAlign = 'right'; g.font = font(500, 30); g.fillText('말씀의 발자취', px + pw - 56, py + 92);

  g.textAlign = 'center'; g.fillStyle = '#6B7694'; g.font = font(500, 38);
  g.fillText(`${cityNo}번째 말씀`, W / 2, py + 270);

  // 도장
  const cx = W / 2, cy = py + 560, R = 230;
  g.save(); g.translate(cx, cy); g.rotate(-0.12);
  g.strokeStyle = '#E8504F'; g.fillStyle = '#E8504F'; g.lineWidth = 14;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R - 26, 0, Math.PI * 2); g.stroke();
  let size = 112; g.font = font(800, size);
  while (g.measureText(bookName).width > R * 1.55 && size > 40) { size -= 4; g.font = font(800, size); }
  g.textBaseline = 'middle'; g.fillText(bookName, 0, -10);
  g.font = font(800, 46); g.fillText('말씀 완주', 0, 92);
  g.font = font(800, 36); g.fillText('★ ★ ★', 0, -118);
  g.restore();

  g.textBaseline = 'alphabetic'; g.fillStyle = '#1E2A47'; g.font = font(800, 56);
  g.fillText(`${chapters}걸음을 모두 걸었어요`, W / 2, py + 900);
  g.fillStyle = '#6B7694'; g.font = font(500, 36);
  g.fillText(date, W / 2, py + 960);
  g.font = font(500, 32);
  g.fillText('요한계시록에서 창세기까지, 거꾸로 걷는 성경 순례', W / 2, py + 1010);

  g.fillStyle = '#1E2A47'; g.font = font(700, 40);
  g.fillText(siteUrl.replace(/^https?:\/\//, ''), W / 2, 1260);
  g.fillStyle = 'rgba(30,42,71,.6)'; g.font = font(500, 30);
  g.fillText('함께 걸어요', W / 2, 1305);

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
