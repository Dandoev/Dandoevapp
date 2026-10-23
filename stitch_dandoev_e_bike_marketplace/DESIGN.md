---
name: Electric Mobility System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#454651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767682'
  outline-variant: '#c6c5d3'
  surface-tint: '#4c58a6'
  primary: '#021064'
  on-primary: '#ffffff'
  primary-container: '#1e2a78'
  on-primary-container: '#8a95e9'
  inverse-primary: '#bcc3ff'
  secondary: '#006b5b'
  on-secondary: '#ffffff'
  secondary-container: '#26fedc'
  on-secondary-container: '#007261'
  tertiary: '#002315'
  on-tertiary: '#ffffff'
  tertiary-container: '#003b26'
  on-tertiary-container: '#00b17a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc3ff'
  on-primary-fixed: '#000d60'
  on-primary-fixed-variant: '#343f8d'
  secondary-fixed: '#26fedc'
  secondary-fixed-dim: '#00dfc1'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005144'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 80px
---

## Brand & Style

This design system is built to establish DandoEv as the premier, high-trust gateway to electric mobility in Nigeria. The brand personality is **Innovative yet Grounded**, bridging the gap between cutting-edge green technology and accessible financial empowerment through BNPL.

The visual style follows a **Modern Corporate** aesthetic. It prioritizes clarity and security to reassure users during financial transactions, while using vibrant accents to signal the energy and excitement of the EV revolution. The interface is clean, utilizing ample whitespace to reduce cognitive load, paired with high-fidelity photography that anchors the digital experience in the physical world.

## Colors

The palette is anchored by **Deep Navy (#1E2A78)**, a color that commands authority and stability, essential for a marketplace involving significant investments and credit. 

The primary action color is **Electric Teal (#00F5D4)**, used strategically for "Buy Now" and "Apply for Credit" actions to signify energy, sustainability, and progress. A deeper **Emerald Green (#10B981)** is used for success states and eco-friendly badges. The background uses a very light cool-gray to prevent eye strain, while text levels utilize a range of slates to maintain high contrast and legibility.

## Typography

This design system utilizes **Inter** across all touchpoints. Chosen for its exceptional legibility and systematic geometric structure, it conveys the "tech-forward" nature of the product while remaining highly readable on mobile devices.

Headlines use a bold weight with slightly tight letter spacing to create a sense of confidence and impact. Body text maintains a generous line height to ensure clarity, especially during the BNPL application process where legal and financial details are critical. Small labels are occasionally uppercase with increased tracking to differentiate UI metadata from primary content.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. A strict 8px base-unit system ensures vertical rhythm across all components.

Spacing is used to group related information—for example, tighter spacing (8px-12px) between bike specs and wider spacing (40px+) between sections of the marketplace. For the BNPL checkout flow, a centered, single-column layout is preferred to keep the user focused on one task at a time.

## Elevation & Depth

This design system employs **Ambient Shadows** to create a sense of hierarchy without clutter. Shadows are extra-diffused with low opacity (between 4% and 8%), often tinted with the primary Navy color to keep them feeling integrated rather than "dirty."

- **Level 1 (Product Cards):** Slight elevation to make bikes feel tactile and interactive.
- **Level 2 (Dropdowns/Modals):** Medium elevation for elements that require immediate attention.
- **Level 3 (BNPL Calculation Tool):** Highest elevation, often paired with a subtle 1px border (#E2E8F0) to define the tool as a primary workspace on the page.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This strikes the perfect balance between the approachability of a consumer marketplace and the professional precision of a fintech platform. 

Buttons and input fields share this radius for consistency. Larger containers, such as promotional hero cards or BNPL summary modules, use `rounded-xl` (24px) to create a softer, more modern aesthetic that feels "tech-forward" and friendly.

## Components

### Buttons
- **Primary Action:** Solid Electric Teal (#00F5D4) with Navy text. Used for "Buy Now" or "Apply for Credit."
- **Secondary Action:** Solid Navy (#1E2A78) with White text. Used for "View Details" or "Compare Models."
- **Ghost:** Navy outline with transparent background for less critical actions like "Save to Wishlist."

### Input Fields
Inputs use a white background with a 1px slate-200 border. On focus, the border transitions to Primary Navy with a subtle glow. Error states use a soft red tint with 1px red borders.

### BNPL Progress Tracker
A custom horizontal stepper component that uses the Electric Teal to show completion. This visualizes the multi-step credit application process, making it feel manageable and transparent.

### Product Cards
Cards feature a "Green Energy" badge in the top corner (Emerald Green). They include the primary bike photo, a clear price-per-month (BNPL) callout, and a subtle hover lift effect.

### Trust Badges
Standardized icons representing "Secure Payment," "Verified Seller," and "Zero Emissions" are used throughout the checkout and product pages to reinforce the brand's core values.