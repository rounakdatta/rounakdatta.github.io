// Facts about the site that more than one page needs.
export const SITE = {
  name: 'Rounak Datta',
  url: 'https://rounak.taptappers.club',
  description:
    'Rounak Datta, an engineer in Bengaluru working on infrastructure and performance. Notes, projects, photos and a fitness journal.',
  locale: 'en_GB',
  twitter: '@rounakdatta12',
};

export const NAV = [
  { href: '/notes/', label: 'Notes' },
  { href: '/projects/', label: 'Projects' },
  { href: '/photos/', label: 'Photos' },
  { href: '/fitness/', label: 'Fitness' },
] as const;

export const ELSEWHERE = [
  { href: 'https://github.com/rounakdatta', label: 'GitHub' },
  { href: 'https://twitter.com/rounakdatta12', label: 'Twitter' },
  { href: 'https://www.linkedin.com/in/rounakdatta/', label: 'LinkedIn' },
  { href: 'https://www.strava.com/athletes/70322649', label: 'Strava' },
] as const;
