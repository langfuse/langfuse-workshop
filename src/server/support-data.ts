import type { SupportProfile } from "../shared/types";

export type GuideArticle = {
  id: string;
  platform: "ios" | "android" | "windows";
  title: string;
  searchableTerms: string[];
  summary: string;
  steps: string[];
  caution?: string;
};

export const SUPPORT_PROFILES: SupportProfile[] = [
  {
    id: "rita-iphone",
    label: "Rita",
    relationship: "Mum's everyday phone, used mostly for family chat and photos.",
    primaryDevice: "iPhone 15 on iOS 18",
    deviceSummary:
      "Uses WhatsApp, Camera, Maps, and Bluetooth earbuds. Gets nervous when a setting looks different from last week.",
    responseStyle: "Use calm, short numbered steps and avoid jargon.",
    notableApps: ["WhatsApp", "Photos", "Maps", "Settings"],
    scopeHighlights: [
      "Simple iPhone settings",
      "Photos and sharing",
      "Bluetooth and Wi-Fi",
      "Maps basics"
    ],
    starterQuestions: [
      "How do I turn Bluetooth on?",
      "How do I take a photo and send it on WhatsApp?",
      "How do I connect to the home Wi-Fi again?"
    ]
  },
  {
    id: "klaus-windows",
    label: "Klaus",
    relationship: "Dad's home office laptop, mostly email, printing, and PDFs.",
    primaryDevice: "Windows 11 laptop with an HP printer",
    deviceSummary:
      "Uses Outlook, Chrome, File Explorer, and a wireless printer. Likes exact button names and reassurance before clicking.",
    responseStyle: "Be explicit, practical, and call out what screen he should see next.",
    notableApps: ["Outlook", "Chrome", "File Explorer", "HP Smart"],
    scopeHighlights: [
      "Wi-Fi and Bluetooth on Windows",
      "Printing and PDF basics",
      "Simple file tasks",
      "Browser troubleshooting"
    ],
    starterQuestions: [
      "How do I print a PDF?",
      "How do I reconnect the laptop to Wi-Fi?",
      "How do I pair Bluetooth headphones?"
    ]
  },
  {
    id: "maya-android",
    label: "Maya",
    relationship: "Auntie's Android phone for travel, bus times, and family calls.",
    primaryDevice: "Samsung Galaxy S23",
    deviceSummary:
      "Uses Google Maps, Camera, Messages, and Bluetooth in the car. Comfortable tapping around if the instructions are concrete.",
    responseStyle: "Keep the tone encouraging and practical with short checkpoints.",
    notableApps: ["Google Maps", "Messages", "Camera", "Settings"],
    scopeHighlights: [
      "Android settings",
      "Photos and navigation basics",
      "Bluetooth and Wi-Fi",
      "Simple app help"
    ],
    starterQuestions: [
      "How do I get directions to the next bus stop?",
      "How do I turn Wi-Fi back on?",
      "How do I pair the phone with the car?"
    ]
  }
];

export const GUIDE_LIBRARY: GuideArticle[] = [
  {
    id: "ios-bluetooth",
    platform: "ios",
    title: "Turn Bluetooth on for an iPhone",
    searchableTerms: ["bluetooth", "airpods", "earbuds", "pair", "headphones"],
    summary: "Simple Bluetooth steps for Rita's iPhone.",
    steps: [
      "Open the Settings app.",
      "Tap Bluetooth.",
      "Turn Bluetooth on so the switch shows green.",
      "If she is pairing something new, keep that device in pairing mode and wait for its name to appear."
    ],
    caution: "If Bluetooth is already on, the issue is usually the accessory still needing pairing mode."
  },
  {
    id: "ios-photo-whatsapp",
    platform: "ios",
    title: "Take a photo and send it in WhatsApp",
    searchableTerms: ["photo", "camera", "whatsapp", "send", "picture"],
    summary: "Capture and share a photo from the iPhone.",
    steps: [
      "Open Camera and tap the white shutter button to take the photo.",
      "Open WhatsApp and choose the chat she wants.",
      "Tap the plus button, then Photo Library or Camera.",
      "Choose the photo and tap Send."
    ]
  },
  {
    id: "ios-wifi",
    platform: "ios",
    title: "Reconnect an iPhone to Wi-Fi",
    searchableTerms: ["wifi", "wi-fi", "internet", "network", "router"],
    summary: "Reconnect the iPhone to home Wi-Fi.",
    steps: [
      "Open Settings and tap Wi-Fi.",
      "Make sure Wi-Fi is turned on.",
      "Tap the home network name.",
      "Enter the Wi-Fi password carefully, then tap Join."
    ],
    caution: "If the network is missing, ask her to move closer to the router and refresh the page."
  },
  {
    id: "ios-maps-bus-stop",
    platform: "ios",
    title: "Find directions to a bus stop in Apple Maps",
    searchableTerms: ["bus", "bus stop", "maps", "directions", "travel"],
    summary: "Use Maps for nearby bus directions without promising live transit data.",
    steps: [
      "Open Maps.",
      "Search for the bus stop name or search for the nearby street.",
      "Tap Directions.",
      "Choose walking or transit depending on what is available on the phone."
    ],
    caution: "The app can explain the taps, but it cannot see Rita's live location from the workshop demo."
  },
  {
    id: "windows-print-pdf",
    platform: "windows",
    title: "Print a PDF from a Windows laptop",
    searchableTerms: ["print", "pdf", "printer", "hp", "document"],
    summary: "Print a PDF with clear button-by-button guidance.",
    steps: [
      "Open the PDF.",
      "Press Control and P together, or click the Print icon.",
      "Choose the HP printer from the printer list.",
      "Click Print."
    ],
    caution: "If the wrong printer is selected, printing can silently go elsewhere."
  },
  {
    id: "windows-wifi",
    platform: "windows",
    title: "Reconnect a Windows 11 laptop to Wi-Fi",
    searchableTerms: ["wifi", "wi-fi", "internet", "network", "router"],
    summary: "Reconnect to Wi-Fi from the taskbar.",
    steps: [
      "Click the network icon in the bottom-right corner of the taskbar.",
      "Make sure Wi-Fi is turned on.",
      "Choose the home network from the list.",
      "Click Connect and enter the password if asked."
    ]
  },
  {
    id: "windows-bluetooth",
    platform: "windows",
    title: "Pair Bluetooth headphones on Windows 11",
    searchableTerms: ["bluetooth", "headphones", "earbuds", "pair", "audio"],
    summary: "Pair a Bluetooth device from Windows settings.",
    steps: [
      "Open Settings and click Bluetooth and devices.",
      "Turn Bluetooth on if it is off.",
      "Click Add device, then choose Bluetooth.",
      "Select the headphones when they appear."
    ]
  },
  {
    id: "windows-file-downloads",
    platform: "windows",
    title: "Find a downloaded file",
    searchableTerms: ["downloads", "file", "pdf", "save", "document"],
    summary: "Locate downloaded files through File Explorer.",
    steps: [
      "Open File Explorer.",
      "Click Downloads in the left sidebar.",
      "Look for the newest file near the top if the list is sorted by date.",
      "Double-click the file to open it."
    ]
  },
  {
    id: "android-wifi",
    platform: "android",
    title: "Turn Wi-Fi back on for an Android phone",
    searchableTerms: ["wifi", "wi-fi", "internet", "network", "router"],
    summary: "Basic Wi-Fi steps for Maya's Samsung phone.",
    steps: [
      "Swipe down from the top of the screen.",
      "Tap the Wi-Fi icon if it is off.",
      "If needed, press and hold the Wi-Fi icon to open the full Wi-Fi settings page.",
      "Choose the correct network and enter the password."
    ]
  },
  {
    id: "android-bluetooth-car",
    platform: "android",
    title: "Pair an Android phone with the car",
    searchableTerms: ["bluetooth", "car", "pair", "handsfree", "audio"],
    summary: "Bluetooth pairing for the Samsung phone and car.",
    steps: [
      "Swipe down from the top and press and hold Bluetooth.",
      "Turn Bluetooth on.",
      "Put the car system into pairing mode.",
      "Tap the car name when it appears on the phone."
    ]
  },
  {
    id: "android-camera",
    platform: "android",
    title: "Take a photo on the Samsung phone",
    searchableTerms: ["photo", "camera", "picture", "take photo"],
    summary: "Capture a photo and review it.",
    steps: [
      "Open the Camera app.",
      "Point the phone at what she wants to capture.",
      "Tap the large shutter button.",
      "Tap the preview thumbnail to see the photo."
    ]
  },
  {
    id: "android-maps-bus-stop",
    platform: "android",
    title: "Find the next bus stop in Google Maps",
    searchableTerms: ["bus", "bus stop", "maps", "directions", "travel"],
    summary: "Use Google Maps to look up a nearby bus stop.",
    steps: [
      "Open Google Maps.",
      "Search for the bus stop or the nearby street name.",
      "Tap Directions and choose walking or transit if it appears.",
      "Follow the map prompts on screen."
    ],
    caution: "The demo can explain how to use Maps but cannot access the phone's real-time location directly."
  }
];

const PLATFORM_BY_PROFILE: Record<string, GuideArticle["platform"]> = {
  "rita-iphone": "ios",
  "klaus-windows": "windows",
  "maya-android": "android"
};

export function getProfileById(profileId: string) {
  return SUPPORT_PROFILES.find((profile) => profile.id === profileId) ?? null;
}

export function getPlatformForProfile(profileId: string) {
  return PLATFORM_BY_PROFILE[profileId];
}

export function searchGuides(profileId: string, question: string) {
  const platform = getPlatformForProfile(profileId);
  const normalizedQuestion = question.toLowerCase();
  const terms = normalizedQuestion.split(/[^a-z0-9]+/).filter(Boolean);

  return GUIDE_LIBRARY.filter((guide) => guide.platform === platform)
    .map((guide) => {
      const score =
        guide.searchableTerms.reduce((current, term) => {
          return current + (normalizedQuestion.includes(term) ? 2 : 0);
        }, 0) +
        terms.reduce((current, term) => {
          return current + (guide.title.toLowerCase().includes(term) ? 1 : 0);
        }, 0);

      return { guide, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry) => entry.guide);
}

