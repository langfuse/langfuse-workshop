import type { SupportContext } from "../shared/types";

export type GuideArticle = {
  id: string;
  title: string;
  searchableTerms: string[];
  summary: string;
  steps: string[];
  caution?: string;
};

export const DEFAULT_SUPPORT_CONTEXT: SupportContext = {
  id: "dad-default",
  label: "Dad",
  relationship: "Dad's everyday iPhone setup for calls, photos, travel, and small phone tasks.",
  devices: ["iPhone 15"],
  deviceSummary:
    "Dad mostly uses WhatsApp, Photos, Apple Maps, and Safari on his iPhone. He likes exact button names and calm reassurance before tapping.",
  responseStyle:
    "Talk directly to Dad in second person. Keep the tone calm, practical, and concrete with short numbered steps.",
  notableApps: ["WhatsApp", "Photos", "Apple Maps", "Safari", "Messages"],
  scopeHighlights: [
    "iPhone settings basics",
    "Photos and sharing",
    "Bluetooth and Wi-Fi",
    "Maps basics",
    "Messaging basics"
  ],
  starterQuestions: [
    "How do I turn Bluetooth on on my iPhone?",
    "How do I take a photo and send it on WhatsApp?",
    "How do I reconnect my iPhone to Wi-Fi?",
    "How do I find directions to a bus stop in Maps?"
  ]
};

export const GUIDE_LIBRARY: GuideArticle[] = [
  {
    id: "iphone-bluetooth",
    title: "Turn Bluetooth on for Dad's iPhone",
    searchableTerms: ["bluetooth", "airpods", "earbuds", "pair", "headphones", "iphone"],
    summary: "Simple Bluetooth steps for Dad's iPhone.",
    steps: [
      "Open the Settings app.",
      "Tap Bluetooth.",
      "Turn Bluetooth on so the switch shows green.",
      "If you are pairing something new, keep that device in pairing mode and wait for its name to appear."
    ],
    caution: "If Bluetooth is already on, the accessory usually still needs to be put into pairing mode."
  },
  {
    id: "iphone-photo-whatsapp",
    title: "Take a photo and send it in WhatsApp",
    searchableTerms: ["photo", "camera", "whatsapp", "send", "picture", "iphone"],
    summary: "Capture and share a photo from Dad's iPhone.",
    steps: [
      "Open Camera and tap the white shutter button to take the photo.",
      "Open WhatsApp and choose the chat you want.",
      "Tap the plus button, then Photo Library or Camera.",
      "Choose the photo and tap Send."
    ]
  },
  {
    id: "iphone-wifi",
    title: "Reconnect Dad's iPhone to Wi-Fi",
    searchableTerms: ["wifi", "wi-fi", "internet", "network", "router", "iphone"],
    summary: "Reconnect the iPhone to home Wi-Fi.",
    steps: [
      "Open Settings and tap Wi-Fi.",
      "Make sure Wi-Fi is turned on.",
      "Tap the home network name.",
      "Enter the Wi-Fi password carefully, then tap Join."
    ],
    caution: "If the network name is missing, move closer to the router and wait a moment for the list to refresh."
  },
  {
    id: "iphone-maps-bus-stop",
    title: "Find directions to a bus stop in Apple Maps",
    searchableTerms: ["bus", "bus stop", "maps", "directions", "travel", "iphone"],
    summary: "Use Apple Maps for nearby bus directions without pretending to see live location.",
    steps: [
      "Open Maps.",
      "Search for the bus stop name or the nearby street.",
      "Tap Directions.",
      "Choose walking or transit if that option appears on the phone."
    ],
    caution: "The workshop demo can explain the taps, but it cannot see Dad's live location."
  },
  {
    id: "iphone-photo-preview",
    title: "Open the photo you just took on the iPhone",
    searchableTerms: ["photo", "preview", "thumbnail", "open", "iphone", "camera"],
    summary: "Quickly review the photo you just captured.",
    steps: [
      "Stay in the Camera app right after taking the photo.",
      "Tap the small thumbnail in the bottom-left corner.",
      "Swipe left or right to see other recent photos.",
      "Tap Done to return to the camera when you are finished."
    ]
  },
  {
    id: "iphone-messages-send",
    title: "Send a text message from the iPhone",
    searchableTerms: ["message", "messages", "text", "imessage", "send", "iphone"],
    summary: "Send a text from the Messages app.",
    steps: [
      "Open the Messages app.",
      "Tap the new message button in the top-right corner.",
      "Type the contact name or phone number in the To field.",
      "Tap the message area, type the message, then tap the blue send arrow."
    ]
  }
];

export function getSupportContext() {
  return DEFAULT_SUPPORT_CONTEXT;
}

export function searchGuides(question: string) {
  const normalizedQuestion = question.toLowerCase();
  const terms = normalizedQuestion.split(/[^a-z0-9]+/).filter(Boolean);

  return GUIDE_LIBRARY.map((guide) => {
    const guideText = `${guide.title} ${guide.summary} ${guide.searchableTerms.join(" ")}`.toLowerCase();
    const score = terms.reduce((total, term) => {
      return total + (guideText.includes(term) ? 1 : 0);
    }, 0);

    return { guide, score };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ guide }) => guide);
}
