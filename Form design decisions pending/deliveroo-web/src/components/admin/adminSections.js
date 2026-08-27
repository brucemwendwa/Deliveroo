// §27 — the portal's map. One table drives the sidebar, the page heading and the
// route guard, so a section cannot appear in the navigation while being closed to
// the person looking at it, and its heading cannot drift from its link.

import { PERMISSION } from '../../lib/roles';

export const ADMIN_ROOT = '/admin';

export const SECTIONS = [
  {
    id: 'overview',
    path: '',
    to: ADMIN_ROOT,
    label: 'Overview',
    icon: 'insights',
    title: 'Operations at a glance',
    blurb: 'What is happening across the network right now, and what needs a person.',
    permission: PERMISSION.VIEW_PORTAL
  },
  {
    id: 'deliveries',
    path: 'deliveries',
    to: `${ADMIN_ROOT}/deliveries`,
    label: 'Deliveries',
    icon: 'inventory_2',
    title: 'Dispatch console',
    blurb: 'Every delivery in the system: move it along, weigh it, say where it is.',
    permission: PERMISSION.VIEW_PORTAL
  },
  {
    id: 'couriers',
    path: 'couriers',
    to: `${ADMIN_ROOT}/couriers`,
    label: 'Couriers',
    icon: 'two_wheeler',
    title: 'Courier roster',
    blurb: 'Who is on shift, what they are carrying, and how much they have moved.',
    permission: PERMISSION.MANAGE_COURIERS
  },
  {
    id: 'capacity',
    path: 'capacity',
    to: `${ADMIN_ROOT}/capacity`,
    label: 'Capacity',
    icon: 'conversion_path',
    title: 'Transport capacity',
    blurb: 'Which modes dispatch can book into today — and what customers are offered.',
    permission: PERMISSION.SET_CAPACITY
  },
  {
    id: 'accounts',
    path: 'accounts',
    to: `${ADMIN_ROOT}/accounts`,
    label: 'Accounts',
    icon: 'group',
    title: 'People and access',
    blurb: 'Customers, colleagues, and what each of them is allowed to do.',
    permission: PERMISSION.VIEW_ACCOUNTS
  },
  {
    id: 'reports',
    path: 'reports',
    to: `${ADMIN_ROOT}/reports`,
    label: 'Reports',
    icon: 'monitoring',
    title: 'Reports',
    blurb: 'Volume, revenue and reliability — and the board as a spreadsheet.',
    permission: PERMISSION.VIEW_REPORTS
  },
  {
    id: 'notifications',
    path: 'notifications',
    to: `${ADMIN_ROOT}/notifications`,
    label: 'Notifications',
    icon: 'mail',
    title: 'Customer notifications',
    blurb: 'Every message the platform has sent about a delivery.',
    permission: PERMISSION.VIEW_NOTIFICATIONS
  },
  {
    id: 'audit',
    path: 'audit',
    to: `${ADMIN_ROOT}/audit`,
    label: 'Audit trail',
    icon: 'history',
    title: 'Audit trail',
    blurb: 'Who did what, to whose delivery, and when.',
    permission: PERMISSION.VIEW_AUDIT
  },
  {
    id: 'settings',
    path: 'settings',
    to: `${ADMIN_ROOT}/settings`,
    label: 'Settings',
    icon: 'settings',
    title: 'Platform settings',
    blurb: 'Bookings, the notice every colleague sees, and the data behind the demo.',
    permission: PERMISSION.MANAGE_SETTINGS
  }
];

/** The section a URL is on. Longest match wins, so /admin never shadows /admin/x. */
export const sectionForPath = (pathname) =>
  [...SECTIONS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((section) => pathname === section.to || pathname.startsWith(`${section.to}/`)) || SECTIONS[0];
