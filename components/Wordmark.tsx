/**
 * The business's wordmark (EJO 100's lockup): the original logo, the first
 * word large and heavy, and the rest of the name smaller beneath, set off by a
 * thin rule in the logo's own gold.
 *
 *  size  "sm" (phone header) · "md" (sidebar) · "lg" (sign-in brand panel)
 *  tone  "default" (theme colours) · "onDark" (white text on navy)
 */
export function Wordmark({ name = "D'Phoenix Autocare", size = 'md', tone = 'default' }: { name?: string; size?: 'sm' | 'md' | 'lg'; tone?: 'default' | 'onDark' }) {
  const words = name.trim().split(/\s+/);
  const top = words[0] ?? name;
  const bottom = words.slice(1).join(' ');
  const logo = size === 'lg' ? 56 : size === 'sm' ? 32 : 42;
  const topText = tone === 'onDark' ? 'text-white' : 'text-[var(--ejo-text)]';
  const bottomText = tone === 'onDark' ? 'text-white/75' : 'text-[var(--ejo-text-muted)]';
  return (
    <div className="flex min-w-0 items-center" title={name}>
      {/* The logo exactly as on the website: never redrawn or recoloured. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt={`${name} logo`} width={logo} height={logo} className="mr-1.5 block shrink-0 object-contain" style={{ width: logo, height: logo }} />
      <div className="inline-flex min-w-0 flex-col items-stretch">
        <span className={`truncate font-extrabold leading-none tracking-[0.01em] ${topText} ${size === 'lg' ? 'text-[30px]' : size === 'sm' ? 'text-[17px]' : 'text-[21px]'}`}>
          {top}
          <span className="sr-only"> </span>
        </span>
        {bottom ? (
          <span className={`flex min-w-0 items-center ${size === 'lg' ? 'mt-1.5' : size === 'sm' ? 'mt-[3px]' : 'mt-1'}`}>
            <span className={`${size === 'sm' ? 'mr-1 min-w-[8px]' : 'mr-1.5 min-w-[12px]'} flex-1`} style={{ borderBottom: `${size === 'lg' ? 1.5 : size === 'sm' ? 1 : 1.25}px solid var(--ejo-brand)` }} />
            <span className={`truncate font-semibold leading-none ${bottomText} ${size === 'lg' ? 'text-sm' : size === 'sm' ? 'text-[9px]' : 'text-[11px]'}`}>{bottom}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
