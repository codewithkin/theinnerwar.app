THE INNER WAR — DESIGN DELIVERY
================================

Three self-contained HTML files and the app icon set.
Each HTML file opens in any browser with no internet connection and
no other files. Every screen is live HTML, not a screenshot.


WEBSITE/
  inner-war-website.html
    The marketing site. Landing page (hero, product card, the ledger
    band, the daily loop, path index, pricing, FAQ, footer), the path
    detail page, and the mobile web-app screens.

MOBILE APP/
  inner-war-mobile.html
    The full product on iPhone 17 Pro Max, grouped by flow:
      S1–S15  onboarding, assessment to day one
      A1–A6   the day: lesson, mission, timer, reflection, evidence
      B1–B4   the four tabs
      C1–C3   reminders, account, missed-day recovery
      D1      paywall
      F1–F5   auth
      G1–G3   checkout and billing
      H1–H6   settings and dialogs
      J1–J7   loading, empty, offline, 404 and permission states
      K1–K5   search, dispatches, path detail, day 30, Personal Code

DESKTOP APP/
  inner-war-desktop.html
    The same product at 1440 × 900 in a browser frame, laid out for
    the width rather than scaled up: persistent rail, working header,
    two- and three-column reading, master-detail lists, modals over
    the app. Seventeen screens, D1–D17.

ICON/
  icon-tile-1024.png     Full-bleed square. iOS and Android apply
                         their own corner mask to this one.
  icon-rounded-1024.png  Corners baked in, for anywhere that needs a
                         finished tile (web, favicon source, decks).
  mark-ember-1024.png    The ember alone, transparent background.
  mark-bone-1024.png     The ember in bone, transparent, for dark
                         grounds and single-colour use.
  mark.svg               Vector master. Scale to anything.


PALETTE
  Ember      #e2701f
  Ember light #f2a03d
  Ember deep #b8430f
  Charcoal   #131110
  Bone       #f4efe6
  Muted      #a79c8e

TYPE
  Newsreader   headings, principles, evidence (300 and italic)
  Archivo      interface text and buttons
  JetBrains Mono  labels, counts, metadata
