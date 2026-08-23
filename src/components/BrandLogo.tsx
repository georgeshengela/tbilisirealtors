import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

/** Solid brand palette — no gradients anywhere */
export const BRAND = {
  ink: '#0F172A',
  blue: '#2563EB',
  blueLight: '#2563EB',
  white: '#FFFFFF',
  muted: '#9CA3AF',
  mutedOnDark: '#94A3B8',
} as const;

/** Uppercase caps read larger than mixed case, so `name` sits a touch below the mark height. */
const SIZES = {
  xs: { mark: 32, name: 11, gap: 7, tagline: 9 },
  sm: { mark: 30, name: 12.5, gap: 8, tagline: 9.5 },
  md: { mark: 38, name: 15, gap: 10, tagline: 10.5 },
  lg: { mark: 46, name: 18.5, gap: 12, tagline: 12 },
  xl: { mark: 56, name: 25, gap: 14, tagline: 13 },
  hero: { mark: 64, name: 34, gap: 16, tagline: 14 },
} as const;

/** Heavy caps need only a little tracking — more than this reads as loose. */
const TRACKING = '0.025em';

export type BrandLogoSize = keyof typeof SIZES;
export type BrandLogoVariant = 'light' | 'dark';

/** Lucide `Building2` glyph on a solid brand tile. Geometry scales with `size`. */
export function BrandMark({ size = 38, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: BRAND.blue,
      }}
      aria-hidden="true"
    >
      <Building2 size={size * 0.58} color={BRAND.white} strokeWidth={2.15} />
    </span>
  );
}

export function BrandWordmark({
  variant = 'light',
  size = 'md',
  className = '',
}: {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
}) {
  const s = SIZES[size];
  const nameColor = variant === 'dark' ? BRAND.white : BRAND.ink;
  const tldColor = variant === 'dark' ? BRAND.blueLight : BRAND.blue;
  const fontSize = size === 'hero' ? 'clamp(23px, 3.4vw, 34px)' : s.name;

  return (
    <span
      className={`brand-wordmark inline-flex items-baseline whitespace-nowrap leading-none ${className}`}
      style={{
        fontSize,
        letterSpacing: TRACKING,
        // Tracking adds a trailing gap after the last glyph; pull it back so the
        // lockup stays optically flush on the right.
        marginRight: `-${TRACKING}`,
      }}
    >
      <span style={{ color: nameColor }}>TBILISIREALTOR</span>
      <span style={{ color: tldColor }}>.GE</span>
    </span>
  );
}

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  tagline?: string;
  /** Show a compact wordmark on mobile instead of hiding it. */
  responsiveText?: boolean;
  showText?: boolean;
  className?: string;
  /** Pass `null` to render a non-navigating lockup. */
  href?: string | null;
  badge?: ReactNode;
  style?: CSSProperties;
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  tagline,
  responsiveText = false,
  showText = true,
  className = '',
  href = '/',
  badge,
  style: styleOverride,
}: BrandLogoProps) {
  const s = SIZES[size];
  const mobileSize: BrandLogoSize = responsiveText ? 'xs' : size;
  const taglineColor = variant === 'dark' ? BRAND.mutedOnDark : BRAND.muted;

  const content = (
    <>
      <BrandMark size={s.mark} />
      {showText && (
        <span className="block min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            {responsiveText ? (
              <>
                <span className="sm:hidden">
                  <BrandWordmark variant={variant} size={mobileSize} />
                </span>
                <span className="hidden sm:inline">
                  <BrandWordmark variant={variant} size={size} />
                </span>
              </>
            ) : (
              <BrandWordmark variant={variant} size={size} />
            )}
            {badge}
          </span>
          {tagline && (
            <span
              className={`block truncate ${responsiveText ? 'hidden sm:block' : ''}`}
              style={{
                marginTop: 3,
                fontWeight: 600,
                fontSize: s.tagline,
                color: taglineColor,
                lineHeight: 1.2,
              }}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </>
  );

  const style = { gap: s.gap, textDecoration: 'none' as const, ...styleOverride };
  const classes = `inline-flex items-center flex-shrink-0 ${className}`;

  if (href != null) {
    return (
      <Link to={href} className={classes} style={style} aria-label="TBILISIREALTOR.GE">
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} style={style} aria-label="TBILISIREALTOR.GE">
      {content}
    </span>
  );
}
