"""Fixed Dad support context and in-memory guide library."""

import re
from typing import Any

DEFAULT_SUPPORT_CONTEXT: dict[str, Any] = {
    "id": "dad-default",
    "label": "Dad",
    "relationship": "Dad's everyday iPhone setup for calls, photos, travel, and small phone tasks.",
    "devices": ["iPhone 15"],
    "deviceSummary": (
        "Dad mostly uses WhatsApp, Photos, Apple Maps, and Safari on his iPhone. "
        "He likes exact button names and calm reassurance before tapping."
    ),
    "responseStyle": (
        "Talk directly to Dad in second person. "
        "Keep the tone calm, practical, and concrete with short numbered steps."
    ),
    "notableApps": ["WhatsApp", "Photos", "Apple Maps", "Safari", "Messages"],
    "scopeHighlights": [
        "iPhone settings basics",
        "Photos and sharing",
        "Bluetooth and Wi-Fi",
        "Maps basics",
        "Messaging basics",
    ],
    "starterQuestions": [
        "How do I turn Bluetooth on on my iPhone?",
        "How do I take a photo and send it on WhatsApp?",
        "How do I reconnect my iPhone to Wi-Fi?",
        "How do I find directions to a bus stop in Maps?",
    ],
}

GUIDE_LIBRARY: list[dict[str, Any]] = [
    {
        "id": "iphone-bluetooth",
        "title": "Turn Bluetooth on for Dad's iPhone",
        "searchableTerms": ["bluetooth", "airpods", "earbuds", "pair", "headphones", "iphone"],
        "summary": "Simple Bluetooth steps for Dad's iPhone.",
        "steps": [
            "Open the Settings app.",
            "Tap Bluetooth.",
            "Turn Bluetooth on so the switch shows green.",
            "If you are pairing something new, keep that device in pairing mode and wait for its name to appear.",
        ],
        "caution": "If Bluetooth is already on, the accessory usually still needs to be put into pairing mode.",
    },
    {
        "id": "iphone-photo-whatsapp",
        "title": "Take a photo and send it in WhatsApp",
        "searchableTerms": ["photo", "camera", "whatsapp", "send", "picture", "iphone"],
        "summary": "Capture and share a photo from Dad's iPhone.",
        "steps": [
            "Open Camera and tap the white shutter button to take the photo.",
            "Open WhatsApp and choose the chat you want.",
            "Tap the plus button, then Photo Library or Camera.",
            "Choose the photo and tap Send.",
        ],
    },
    {
        "id": "iphone-wifi",
        "title": "Reconnect Dad's iPhone to Wi-Fi",
        "searchableTerms": ["wifi", "wi-fi", "internet", "network", "router", "iphone"],
        "summary": "Reconnect the iPhone to home Wi-Fi.",
        "steps": [
            "Open Settings and tap Wi-Fi.",
            "Make sure Wi-Fi is turned on.",
            "Tap the home network name.",
            "Enter the Wi-Fi password carefully, then tap Join.",
        ],
        "caution": "If the network name is missing, move closer to the router and wait a moment for the list to refresh.",
    },
    {
        "id": "iphone-maps-bus-stop",
        "title": "Find directions to a bus stop in Apple Maps",
        "searchableTerms": ["bus", "bus stop", "maps", "directions", "travel", "iphone"],
        "summary": "Use Apple Maps for nearby bus directions without pretending to see live location.",
        "steps": [
            "Open Maps.",
            "Search for the bus stop name or the nearby street.",
            "Tap Directions.",
            "Choose walking or transit if that option appears on the phone.",
        ],
        "caution": "The workshop demo can explain the taps, but it cannot see Dad's live location.",
    },
    {
        "id": "iphone-photo-preview",
        "title": "Open the photo you just took on the iPhone",
        "searchableTerms": ["photo", "preview", "thumbnail", "open", "iphone", "camera"],
        "summary": "Quickly review the photo you just captured.",
        "steps": [
            "Stay in the Camera app right after taking the photo.",
            "Tap the small thumbnail in the bottom-left corner.",
            "Swipe left or right to see other recent photos.",
            "Tap Done to return to the camera when you are finished.",
        ],
    },
    {
        "id": "iphone-messages-send",
        "title": "Send a text message from the iPhone",
        "searchableTerms": ["message", "messages", "text", "imessage", "send", "iphone"],
        "summary": "Send a text from the Messages app.",
        "steps": [
            "Open the Messages app.",
            "Tap the new message button in the top-right corner.",
            "Type the contact name or phone number in the To field.",
            "Tap the message area, type the message, then tap the blue send arrow.",
        ],
    },
]


def get_support_context() -> dict[str, Any]:
    return DEFAULT_SUPPORT_CONTEXT


def search_guides(question: str) -> list[dict[str, Any]]:
    terms = [term for term in re.split(r"[^a-z0-9]+", question.lower()) if term]

    scored = []
    for guide in GUIDE_LIBRARY:
        guide_text = f"{guide['title']} {guide['summary']} {' '.join(guide['searchableTerms'])}".lower()
        score = sum(1 for term in terms if term in guide_text)
        if score > 0:
            scored.append((guide, score))

    # sorted() is stable, so guides with equal scores keep their library order.
    scored.sort(key=lambda item: item[1], reverse=True)
    return [guide for guide, _ in scored[:3]]
