export interface CategoryPalette {
    bg: string;     // fondo de la tarjeta
    border: string; // borde
    text: string;   // texto
    solid: string;  // fondo del icono
}

// Colores con nombre que usan las categorías del seed
const NAMED_PALETTES: Record<string, CategoryPalette> = {
    rose: { bg: '#fff1f2', border: '#fda4af', text: '#881337', solid: '#e11d48' },
    amber: { bg: '#fffbeb', border: '#fcd34d', text: '#78350f', solid: '#d97706' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', solid: '#64748b' },
    pink: { bg: '#fdf2f8', border: '#f9a8d4', text: '#831843', solid: '#db2777' },
    emerald: { bg: '#ecfdf5', border: '#6ee7b7', text: '#064e3b', solid: '#059669' },
    sand: { bg: '#faf5ee', border: '#e2cdb0', text: '#5b4128', solid: '#a47e52' },
    teal: { bg: '#f0fdfa', border: '#5eead4', text: '#134e4a', solid: '#0d9488' },
    cyan: { bg: '#ecfeff', border: '#67e8f9', text: '#164e63', solid: '#0891b2' },
    red: { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', solid: '#dc2626' },
    indigo: { bg: '#eef2ff', border: '#a5b4fc', text: '#312e81', solid: '#4f46e5' },
    blue: { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', solid: '#2563eb' },
};

export const DEFAULT_PALETTE = NAMED_PALETTES['blue'];
export const CANCELLED_PALETTE: CategoryPalette = { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', solid: '#94a3b8' };

/** Paleta de una categoría: admite nombres del seed ('rose', 'amber'...) y colores hex del modal ('#E9D9F7') */
export function getCategoryPalette(color: string | undefined): CategoryPalette {
    if (!color) return DEFAULT_PALETTE;

    const named = NAMED_PALETTES[color.toLowerCase()];
    if (named) return named;

    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return {
            bg: mix(color, '#ffffff', 0.5),
            border: mix(color, '#000000', 0.15),
            text: mix(color, '#000000', 0.75),
            solid: mix(color, '#000000', 0.45),
        };
    }
    return DEFAULT_PALETTE;
}

/** Mezcla dos colores hex; amount = 0 devuelve `hex`, 1 devuelve `target` */
function mix(hex: string, target: string, amount: number): string {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(target.slice(1), 16);
    const channel = (shift: number) =>
        Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
    return '#' + [16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('');
}
