// Provided six-IP sheet, randomly shuffled once on module load.
const gallery = Array.from({ length: 6 }, (_, i) => `/assets/ip/ip-${i + 1}.svg`);
for (let i = gallery.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
}
let next = 0;
export function nextIpImage(..._legacy: string[]) {
  void _legacy;
  return gallery[next++ % gallery.length];
}
