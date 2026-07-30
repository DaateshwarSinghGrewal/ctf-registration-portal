/**
 * Primary navigation links for the Website's persistent nav bar.
 * "sectionId" values correspond to the section anchors rendered inside
 * WebsitePage.jsx (About -> WhatIsCTF/AboutGame, Sponsors -> Sponsors,
 * Info -> ContactUs). "Register Now" is the single cross-screen route,
 * routing to /auth rather than scrolling.
 */
export const navLinks = [
  {
    label: 'About',
    type: 'anchor',
    sectionId: 'about'
  },
  {
    label: 'Register Now',
    type: 'route',
    to: '/auth'
  },
  {
    label: 'Sponsors',
    type: 'anchor',
    sectionId: 'sponsors'
  },
  {
    label: 'Info',
    type: 'anchor',
    sectionId: 'contact'
  }
]

/**
 * Footer ticker items (Page 1B). Purely decorative/branding marquee,
 * not functional navigation, repeated to create a seamless scroll loop.
 */
export const footerTickerItems = ['LEARN', 'CODE', 'COLLABORATE']

/**
 * Outbound social/contact links rendered on the Contact Us section (Page 5).
 * These are external links, not internal routes.
 */
export const socialLinks = [
  { label: 'Website', href: 'https://somnium.ccs.example' },
  { label: 'Discord', href: 'https://discord.gg/somnium' },
  { label: 'Instagram', href: 'https://instagram.com/somniumctf' }
]