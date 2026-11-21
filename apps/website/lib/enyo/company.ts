/**
 * What Enyo may say about the organisation: only what the database and the
 * website's own configuration hold. Nothing is invented — a missing fact
 * (opening hours, prices) is reported as missing.
 */
import { prisma } from '@ejo/database';
import { BUSINESSES, COMPANIES, GROUP_OFFICE, MILESTONES, PLANT } from '@/lib/content/group';
import { siteConfig } from '@/lib/site-config';
import { SEARCH_INDEX } from '@/lib/search-index';
import { DPHOENIX } from '@/lib/content/dphoenix';
import { PUBLIC_WEBSITE } from '@/lib/edition';

export type CompanyInfo = {
  organisation: string;
  headOffice: { address: string | null; phones: string[]; email: string | null; website: string | null };
  branches: { name: string; area: string | null; address: string | null; phones: string[]; email: string | null }[];
  openingHours: string | null;
  businesses: string[];
  /** The organisation's leadership and other people it publishes (name, title, area, short biography, public profile link). */
  people: { name: string; title: string; area: string | null; about: string | null; profile: string | null }[];
  /**
   * The group's own published background (About and Businesses pages): group, offices, plant, businesses, companies, milestones.
   * Without the public website (lib/edition.ts) it is D'Phoenix Autocare's own published facts instead.
   */
  about:
    | { group: string; groupOffice: string; plant: string; businesses: { name: string; summary: string }[]; companies: { name: string; does: string; business: string; where?: string }[]; milestones: string[] }
    | { company: string; tagline: string; whatWeDo: string; address: string; services: string[]; phones: string[]; email: string; openingHours: string; website: string };
  websitePages: { title: string; link: string }[];
  howToBook: string[];
  customerPortal: string;
  notes: string[];
};

const unique = (xs: (string | null | undefined)[]) => [...new Set(xs.map((x) => (x ?? '').trim()).filter(Boolean))];

export async function loadCompanyInfo(organisationId: string): Promise<CompanyInfo> {
  const [org, branches, units] = await Promise.all([
    prisma.organisation.findUnique({ where: { id: organisationId }, select: { name: true, hotlines: true, email: true, hqAddress: true, website: true } }),
    prisma.branch.findMany({
      where: { isActive: true, businessUnit: { organisationId, isActive: true } },
      orderBy: { name: 'asc' },
      take: 30,
      select: { name: true, address: true, hotlines: true, email: true, city: { select: { name: true, state: { select: { name: true } } } } },
    }),
    prisma.businessUnit.findMany({ where: { organisationId, isActive: true }, orderBy: { name: 'asc' }, take: 20, select: { name: true } }),
  ]);
  // v36: opening hours from the Support centre's set-up, when an administrator has saved them.
  // v38: the people the organisation publishes (Organisation → People we publish); public ones only.
  const [setting, people] = await Promise.all([
    prisma.supportSetting.findUnique({ where: { organisationId }, select: { hours: true } }).catch(() => null),
    prisma.publicProfile.findMany({ where: { organisationId, isPublic: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], take: 40, select: { name: true, title: true, area: true, bio: true, profileUrl: true } }).catch(() => []),
  ]);
  // Without the public website, D'Phoenix Autocare's published contacts fill what the records leave empty.
  const recorded = unique([...(org?.hotlines ?? []), siteConfig.contact.phone]);
  const phones = recorded.length || PUBLIC_WEBSITE ? recorded : [...DPHOENIX.phones];
  const email = org?.email?.trim() || siteConfig.contact.email || (PUBLIC_WEBSITE ? null : DPHOENIX.email);
  return {
    organisation: org?.name || siteConfig.organisationName,
    headOffice: { address: org?.hqAddress?.trim() || siteConfig.contact.address || (PUBLIC_WEBSITE ? null : DPHOENIX.address), phones, email, website: org?.website?.trim() || (PUBLIC_WEBSITE ? null : DPHOENIX.website) },
    branches: branches.map((b) => ({
      name: b.name,
      area: [b.city?.name, b.city?.state?.name].filter(Boolean).join(', ') || null,
      address: b.address?.trim() || null,
      phones: unique(b.hotlines),
      email: b.email?.trim() || null,
    })),
    openingHours: setting?.hours ? hoursText(setting.hours) : PUBLIC_WEBSITE ? null : DPHOENIX.hours,
    businesses: unique(units.map((u) => u.name)),
    people: people.map((p) => ({ name: p.name, title: p.title, area: p.area, about: p.bio, profile: p.profileUrl })),
    // v42: the group's own published background (the About and Businesses pages), so the group, its brands,
    // its plant and its history are answered without the web — the same words the website shows.
    // Without the public website (lib/edition.ts): D'Phoenix Autocare's own facts (lib/content/dphoenix.ts).
    about: !PUBLIC_WEBSITE ? {
      company: `${DPHOENIX.legalName} (${DPHOENIX.name})`,
      tagline: DPHOENIX.tagline,
      whatWeDo: DPHOENIX.summary,
      address: DPHOENIX.address,
      services: [...DPHOENIX.services],
      phones: [...DPHOENIX.phones],
      email: DPHOENIX.email,
      openingHours: DPHOENIX.hours,
      website: DPHOENIX.website,
    } : {
      group: 'Kewalram Chanrai Group: a family-owned diversified business group founded in 1860, with group management in Singapore and its largest presence in Nigeria, where it has operated for over 70 years.',
      groupOffice: GROUP_OFFICE.address,
      plant: `${PLANT.name}, ${PLANT.address}`,
      businesses: BUSINESSES.map((b) => ({ name: b.name, summary: b.summary })),
      companies: COMPANIES.map((c) => ({ name: c.name, does: c.does, business: c.business, ...(c.where ? { where: c.where } : {}) })),
      milestones: MILESTONES.map((m) => `${m.year}: ${m.title}`),
    },
    // Without the public website only the support page and the customer portal are left to link to.
    websitePages: !PUBLIC_WEBSITE ? [{ title: 'Customer support', link: '/support' }, { title: 'Customer portal', link: '/customer-portal' }] : SEARCH_INDEX.filter((e) => e.category === 'Business' || ['/contact', '/support', '/about'].includes(e.href)).map((e) => ({ title: e.title, link: e.href })),
    howToBook: [
      PUBLIC_WEBSITE ? 'Call or email the branch nearest to you to book a service or repair; the team arranges the time with you.' : 'Call or email the workshop to book a service or repair; the team arranges the time with you.',
      'Existing customers can follow their vehicles, estimates and payments in the customer portal.',
    ],
    customerPortal: '/customer-portal',
    notes: [
      ...(setting?.hours ? ['Closed on public holidays.'] : !PUBLIC_WEBSITE ? [] : ['Opening hours are not listed. Suggest calling the branch to confirm before visiting.']),
      PUBLIC_WEBSITE ? 'Vehicles, tyres and parts have indicative prices in the store (search_website); workshop repairs are estimated after the vehicle is inspected.' : 'Prices are not published. Repairs are estimated after the vehicle is inspected.',
      people.length
        ? 'For "who is …" questions about someone in "people", answer from their entry (title, area, about) and mention their public profile link. Never give out anyone\'s personal phone number, email or address.'
        : 'No leadership list is published here. For "who is …" about a named person, try the web look-up with the name and the organisation, and say if nothing clearly matches.',
    ],
  };
}

/** {"1":["08:00","17:00"],…} → "Monday 08:00–17:00; …; Sunday closed" (Lagos time). */
function hoursText(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const parts = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const v = (json as Record<string, unknown>)[String(d)];
    return Array.isArray(v) && typeof v[0] === 'string' && typeof v[1] === 'string' ? `${names[d]} ${v[0]}–${v[1]}` : `${names[d]} closed`;
  });
  return `${parts.join('; ')} (Lagos time)`;
}
