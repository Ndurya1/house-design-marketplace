"""Generate review-only F02 files and a unified diff; never modify application files."""
from pathlib import Path
import difflib
import json

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
CLIENT = ROOT / 'frontend/PlanClient'
patch = []

def propose(relative, transform):
    source = CLIENT / relative
    old = source.read_text(encoding='utf-8')
    new = transform(old)
    target = OUT / 'proposed' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(new, encoding='utf-8')
    patch.extend(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
        fromfile='a/frontend/PlanClient/' + relative,
        tofile='b/frontend/PlanClient/' + relative))

def css(text):
    start = text.index(':root {')
    end = text.index('@layer base {', start)
    text = text[:start] + text[end:]
    # Only change light theme values; retain existing dark theme overrides.
    text = text.replace('--foreground: 222.2 84% 4.9%;', '--foreground: 222.2 47.4% 11.2%;', 1)
    text = text.replace('--primary-foreground: 210 40% 98%;', '--primary-foreground: 0 0% 100%;\n    --primary-hover: 224.3 76.3% 48%;', 1)
    text = text.replace('--muted-foreground: 215.4 16.3% 46.9%;', '--muted-foreground: 215.3 19.3% 34.5%;', 1)
    text = text.replace('--destructive: 0 84.2% 60.2%;', '--destructive: 0 72.2% 50.6%;', 1)
    text = text.replace('--destructive-foreground: 210 40% 98%;', '--destructive-foreground: 0 0% 100%;', 1)
    text = text.replace('--input: 214.3 31.8% 91.4%;', '--input: 215.4 16.3% 46.9%;', 1)
    text = text.replace('--radius: 0.5rem;', '--radius: 0.75rem;\n    --radius-control: 0.5rem;\n    --radius-dialog: 1rem;')
    text = text.replace('  .dark {', '  .dark {\n    --primary-hover: 213.1 93.9% 67.8%;')
    return text + '''
/* Opt-in roles: page-specific typography is migrated in its owning task. */
@layer components {
  .ui-page-title { @apply text-3xl font-semibold leading-tight tracking-tight; }
  .ui-section-title { @apply text-xl font-semibold leading-snug; }
  .ui-label { @apply text-sm font-medium leading-5; }
  .ui-caption { @apply text-xs leading-5 text-muted-foreground; }
  .editorial-title { @apply font-display font-bold text-3xl leading-tight md:text-5xl; }
}
'''

propose('src/index.css', css)
propose('tailwind.config.js', lambda t: t.replace('foreground: "hsl(var(--primary-foreground))",', 'foreground: "hsl(var(--primary-foreground))",\n          hover: "hsl(var(--primary-hover))",').replace('md: `calc(var(--radius) - 2px)`', 'md: "var(--radius-control)"').replace('sm: "calc(var(--radius) - 4px)",', 'sm: "0.375rem",\n        dialog: "var(--radius-dialog)",'))
propose('src/components/ui/button.jsx', lambda t: t.replace('focus-visible:ring-1 focus-visible:ring-ring', 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background').replace('bg-primary text-primary-foreground shadow hover:bg-primary/90', 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover').replace('hover:bg-blue-600/50  hover:text-accent-foreground', 'hover:bg-accent hover:text-accent-foreground').replace('"h-9 px-4 py-2"', '"min-h-11 px-4 py-2"').replace('"h-8 rounded-sm px-3 text-xs"', '"min-h-11 px-3 py-2 text-sm"').replace('"h-10 rounded-sm px-8"', '"min-h-12 px-6 py-3"').replace('"h-9 w-9"', '"h-11 w-11 shrink-0"'))
propose('src/components/ui/input.jsx', lambda t: t.replace('h-9', 'h-11').replace('bg-transparent px-3 py-1 text-sm', 'bg-background px-3 py-2 text-base').replace('focus-visible:ring-1 focus-visible:ring-ring', 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive'))
propose('src/components/ui/card.jsx', lambda t: t.replace('border-gray-300  bg-card text-card-foreground ', 'border-border bg-card text-card-foreground shadow-sm').replace('font-semibold leading-none tracking-tight', 'text-xl font-semibold leading-snug tracking-tight'))
propose('src/components/ui/badge.jsx', lambda t: t.replace(' shadow hover:bg-primary/80', '').replace(' hover:bg-secondary/80', '').replace(' shadow hover:bg-destructive/80', ''))
(OUT / 'f02-foundation.patch').write_text(''.join(patch), encoding='utf-8')

# Contrast checks use the proposed light-theme colors, converted from HSL tokens.
import colorsys
def color(h, s, l):
    return colorsys.hls_to_rgb(h/360, l/100, s/100)
def luminance(rgb):
    linear = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    return sum(c*w for c,w in zip(linear, [.2126,.7152,.0722]))
white = (1,1,1)
pairs = {'primary/white': color(221.2,83.2,53.3), 'primary hover/white':color(224.3,76.3,48), 'secondary text/white':color(215.3,19.3,34.5), 'destructive/white':color(0,72.2,50.6), 'input border/white':color(215.4,16.3,46.9)}
ratios = {name: round((luminance(white)+.05)/(luminance(rgb)+.05), 2) for name,rgb in pairs.items()}
(OUT/'contrast.json').write_text(json.dumps(ratios, indent=2), encoding='utf-8')
print(json.dumps({'changed_files':6, 'contrast':ratios}, indent=2))
