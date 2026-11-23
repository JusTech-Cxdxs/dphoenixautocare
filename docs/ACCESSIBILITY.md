# Accessibility

The staff portal and the customer portal aim at **WCAG 2.2 level AA**. They
are checked with [axe-core](https://github.com/dequelabs/axe-core) (the WCAG 2.0,
2.1 and 2.2 A/AA rules plus axe's best practices) for every demo role, in light
and dark, at desktop and phone widths.

## The rules this edition keeps

**Every field has a name.** A visible `<label>` is tied to its field with
`htmlFor` and `id`, or wraps the field. A field with no visible label (a filter
dropdown, a note box in a row of buttons) gets an `aria-label` that says what it
is. Placeholder text is a hint, not a label.

**Text reads at 4.5:1 or better.** Colours come from the tokens in each app's
`app/globals.css`, never from hard-coded hex values in components.

| Used as text | Light screen | Dark screen |
|---|---|---|
| Orange (`text-[var(--ejo-primary)]`) | `--ejo-primary-text` #965509 | #f09e2c |
| Grey (`--ejo-text-muted`) | #5b6779 | #94a3b8 (portal), #9aa4b2 (customer site) |
| Green (`text-[var(--ejo-success)]`) | `--ejo-success-text` #166534 | #4ade80 |
| Blue (`text-[var(--ejo-info)]`) | `--ejo-info-text` #1e40af | #60a5fa |
| Red (`text-[var(--ejo-error)]`) | `--ejo-error-text` #991b1b | #f87171 |
| Amber (`text-[var(--ejo-warning)]`, `--ejo-warning-text`) | #92400e | #fbbf24 |

These shades hold even on the colour's own pale tint (a chip such as
`bg-[var(--ejo-success)]/15`). The brand layer at the end of `globals.css` maps
the text classes to them, so components keep using the ordinary tokens.
Anything written on orange or amber is navy (`--ejo-on-primary`), never white.
Avatar colours all carry white initials at 4.5:1.

**Lists and tables are real structure.** A `<dl>` holds only `<div>` rows of
`<dt>` and `<dd>`. Every `<th>` has text (`<span className="sr-only">Actions</span>`
for a button column). A box that can scroll sideways can take keyboard focus
(`tabIndex={0}`, `role="region"`, an `aria-label`); `ResponsiveTable` does this
for you.

**Every page has one `<h1>`** (`PageHeader` / `PageTitle`), and headings go
down one level at a time. Everything on screen sits in a landmark: the header,
the sidebar (`aside` "Sidebar" with `nav` "Main"), the branch bar and news
ticker (labelled regions) and `main`.

**Links in a sentence are underlined**, not told apart by colour alone.

**Pop-up lists** (`ComboBox`, `FilterSelect`, `SearchableSelect`, the global
search) point `aria-controls` at their list only while it is open.

## Checking a change

Sign in as the demo roles in [DPHOENIX_DEMO.md](DPHOENIX_DEMO.md), then run axe
on the pages you changed: the axe DevTools browser extension, or
`@axe-core/playwright` in a test. Check light and dark, and a phone width
(390 px). Use the keyboard alone at least once: Tab through the page, open and
close any menu, and submit the form.
