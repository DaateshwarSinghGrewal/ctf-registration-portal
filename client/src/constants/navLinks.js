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
    label: 'Demo',
    type: 'anchor',
    sectionId: 'demo'
  },
  {
    label: 'FAQ',
    type: 'anchor',
    sectionId: 'faq'
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
export const footerTickerItems = ['COMPETE', 'LEARN', 'CONQUER', 'COLLABORATE']

/**
 * Outbound social/contact links rendered on the Contact Us section (Page 5).
 * These are external links, not internal routes.
 */
export const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com/ccs_tiet' },
  { label: 'Facebook', href: 'https://facebook.com/ccstu' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/ccs-tiet' }
]