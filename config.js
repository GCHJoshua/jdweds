/* ============================================================
   J & D — Wedding site configuration
   Edit anything here; the prototype reads from this object.
   ============================================================ */
window.WEDDING = {
  couple: { short: "Joshua & Dorcas", line: "Joshua & Dorcas" }, // change to full names anytime
  tagline: "are getting married",
  // ISO date/time of the ceremony (Singapore, GMT+8) — drives the countdown
  dateISO: "2027-01-30T10:30:00+08:00",
  dateLabel: "Saturday, 30 January 2027",
  timeLabel: "10:30 in the morning",
  cityLabel: "Singapore",
   sheetEndpoint: "https://script.google.com/macros/s/AKfycbzVDpmahsE9fhj3UovTEhtHHgQ3wG6vxAL7mIuXtLGy8zPE5d1wR5jN683TIMyRepvvMA/exec",

  // --- DEMO passwords (shown on the locked screen for testing; remove before going live) ---
  passwords: {
    tier1: "ceremony",   // Church + Lunch Reception
    tier2: "banquet",    // + Dinner Banquet
    admin: "admin27"
  },

  tiers: {
    1: { name: "Ceremony + Lunch", blurb: "Church ceremony & lunch reception" },
    2: { name: "Ceremony + Lunch + Dinner", blurb: "Everything, plus the evening banquet" }
  },

  // --- Schedule (placeholder timings — edit freely) ---
  schedule: [
    { time: "10:30 AM", title: "Wedding Ceremony", place: "The Bible Church (Level 3, Sanctuary)", minTier: 1, icon: "❧" },
    { time: "12:30 PM", title: "Lunch Reception", place: "The Bible Church (Level 1, Grace Hall)", minTier: 1, icon: "✦" },
    { time: "5:30 PM", title: "Tea Ceremony", place: "Min Jiang at Dempsey", minTier: 2, icon: "❀", tag: "Family only" },
    { time: "7:00 PM",  title: "Dinner Banquet", place: "Min Jiang at Dempsey", minTier: 2, icon: "❦" }
  ],

  venues: [
    {
      key: "church", name: "The Bible Church", address: "Clementi, Singapore",
      map: "https://maps.app.goo.gl/3AxWkECD9rcAqNjf6",
      parkingNote: "Parking is not available on-site — see the Parking FAQ below for nearby options.",
      events: [
        { label: "The Wedding Ceremony", time: "10:30 AM", detail: "Level 3, Sanctuary — please be seated by 10:15 AM.", dress: "Dress code: Smart casual.", minTier: 1 },
        { label: "The Lunch Reception", time: "12:30 PM", detail: "Level 1, Grace Hall — follows straight after the ceremony.", dress: "Dress code: Smart casual.", minTier: 1 }
      ]
    },
    {
      key: "dempsey", name: "Min Jiang at Dempsey", address: "Dempsey Road, Singapore",
      map: "https://maps.app.goo.gl/TvRLp9MGiHSezWNG6",
      parkingNote: "Free parking available on site (~40 lots) — see the Parking FAQ below for more details.",
      events: [
        { label: "The Tea Ceremony", time: "5:30 PM", detail: "An intimate tea ceremony for family.", dress: "Dress code: Cocktail attire or traditional wear.", tag: "Family only", minTier: 2 },
        { label: "The Dinner Banquet", time: "7:00 PM", detail: "Doors open 6:30 PM, dinner at 7:00 PM.", dress: "Dress code: Cocktail attire or traditional wear.", minTier: 2 }
      ]
    }
  ],

  ourStory: {
    photos: ["ourstory/IMG_5247.JPG", "ourstory/IMG_5704.jpg", "ourstory/IMG_5901.JPG"],
    body: "Our story is a modern city romance — we met on a dating app (shoutout to Hinge)! Josh says he waited patiently for me to swipe back on his profile for two whole weeks. In Dorcas' defence, she needed time to seek the wise counsel of her sister, which yielded informal background checks and character approvals from mutual friends before she swiped right!",
    funFacts: [
      { q: "First date", a: "Hopscotch @ Capitol and then ice cream at Venchi afterwards hehe" },
      { q: "Song that's \"ours\"", a: "Definitely \"Die with a Smile\" by Bruno Mars. Joshua recorded himself singing and playing a guitar for Dorcas (very very very rare for Joshua to do that)" },
      { q: "Bonding over", a: "Hide & Seek in supermarkets and long walks after rolling out of a big meal" }
    ]
  },

  dressCode: {
    title: "Garden Party · Smart Casual",
    body: "Think bright and breezy. Florals, pastels and light linens are perfect. Gentlemen in light suits or a smart shirt; ladies in day dresses. Comfortable shoes are a kind idea for the lawn.",
    swatches: ["#e9d9c3", "#c9b896", "#8a9a7b", "#2f7d7a", "#d8b9a6"]
  },

  faq: [
    { q: "By when do I have to finalise my RSVP?", a: "Kindly send your response by 30 September 2026 so we can finalise numbers with the venues." },
    { q: "Can I bring a plus-one?", a: "As our venues can only support a limited number of guests, we regret to inform you that your invitation only covers yourself. We would love to catch up with you some other time instead!" },
    { q: "Is parking available?", html: true, a: "<strong>The Bible Church</strong> (No parking available on-site, sorry!)<br>Kindly park at the nearby Block 601 carpark (4 min walk away).<br><a class=\"btn small\" href=\"https://maps.app.goo.gl/NfkqMq8qLsRzDLph8\" target=\"_blank\" rel=\"noopener\">Open in Maps</a><br><br><strong>Min Jiang at Dempsey</strong> (Free parking available on-site)<br>There are about 40 lots available just beside the venue.<br><a class=\"btn small\" href=\"https://maps.app.goo.gl/V6kPP3bqTzR6ADqT6\" target=\"_blank\" rel=\"noopener\">Open in Maps</a>" }
  ],

  // --- Seeded RSVPs so the admin view looks alive (mock data) ---
  seedResponses: [
    { name: "Ana & Rui Martins", tier: 2, attending: true,  count: 2, events: "both",    dietary: "1 vegetarian", note: "We can't wait — congratulations!!", ts: "2026-11-02" },
    { name: "Tomás Lim",          tier: 1, attending: true,  count: 1, events: "church",  dietary: "",            note: "", ts: "2026-11-04" },
    { name: "Sofia & family",     tier: 2, attending: true,  count: 4, events: "both",    dietary: "2 gluten-free", note: "So happy for you both!", ts: "2026-11-05" },
    { name: "Pedro Vaz",          tier: 1, attending: false, count: 0, events: "",        dietary: "",            note: "So sorry to miss it — sending love.", ts: "2026-11-06" },
    { name: "Marta Reis",         tier: 2, attending: true,  count: 2, events: "dinner",  dietary: "no shellfish", note: "", ts: "2026-11-08" },
    { name: "The Costa family",   tier: 2, attending: true,  count: 3, events: "both",    dietary: "", note: "", ts: "2026-11-09" },
    { name: "João Ferreira",      tier: 1, attending: true,  count: 2, events: "church",  dietary: "", note: "See you at church!", ts: "2026-11-10" },
    { name: "Inês Barros",        tier: 2, attending: false, count: 0, events: "",        dietary: "", note: "Out of town, sadly.", ts: "2026-11-11" }
  ]
};
