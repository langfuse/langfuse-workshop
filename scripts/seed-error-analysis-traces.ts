/**
 * Seed the 20 traces for section 4.1 Error analysis.
 *
 * Seven traces are ordinary one-turn iPhone answers. The other thirteen each
 * contain exactly one failure mode:
 *   - 5 out-of-scope requests that the agent answers (recipes, investment advice, laptop support)
 *   - 4 impersonation replies, where the agent speaks as Dad's kid
 *   - 4 lengthy, unstructured replies to an in-scope question
 *
 * Failure traces are a mix of one-turn questions and longer sessions of two or
 * three turns. The failure is only on the latest answer. Earlier turns in a
 * longer session are ordinary iPhone help, so a trace does not stack modes.
 *
 * No scores are written. Learners add pass/fail and open coding themselves.
 *
 * Not idempotent: every run creates 20 new traces.
 *
 *   npm run langfuse:seed:error-analysis
 *   npm run langfuse:seed:error-analysis -- --dry-run
 *   npx tsx scripts/seed-error-analysis-traces.ts --check
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasFlag,
  readTraceSeedSnapshot,
  resolveFromScript,
  type TraceSeedSnapshot,
  type TraceSeedTraceBundle
} from "./langfuse-trace-seed-lib";

const SINGLE_TURN_TEMPLATE_ID = "b63ac42cd5e2207efd6b3b54e7d8aa8b";
const FOLLOW_UP_TEMPLATE_ID = "ec538daf8f726dc969e901a85bda329b";
const SEED_TAG = "error-analysis-seed";
const TEMPLATE_FILE = resolveFromScript(import.meta.url, "../data/seed-traffic-followups-traces.json");

type ChatTurn = { role: "user" | "assistant"; content: string };
type FailureMode = "good" | "out-of-scope" | "impersonation" | "lengthy";
type Guide = { title: string; summary: string; steps: string[] };

type Scenario = {
  mode: FailureMode;
  turns: ChatTurn[];
  finalAnswer: string;
  searchQuestion: string;
  guide: Guide | null;
};

const bluetoothGuide: Guide = {
  title: "Turn Bluetooth on",
  summary: "Turn Bluetooth on from Settings.",
  steps: [
    "Open the Settings app.",
    "Tap Bluetooth.",
    "Turn Bluetooth on so the switch is green."
  ]
};

const wifiGuide: Guide = {
  title: "Reconnect to Wi-Fi",
  summary: "Join the home Wi-Fi network again.",
  steps: [
    "Open Settings and tap Wi-Fi.",
    "Make sure Wi-Fi is turned on.",
    "Tap the home network name.",
    "Enter the Wi-Fi password and tap Join."
  ]
};

const pinGuide: Guide = {
  title: "Pin a WhatsApp chat",
  summary: "Keep one WhatsApp chat at the top of the list.",
  steps: [
    "Open WhatsApp.",
    "Tap Chats.",
    "Swipe the chat from left to right.",
    "Tap Pin."
  ]
};

const photoGuide: Guide = {
  title: "Send a photo in WhatsApp",
  summary: "Send a photo that is already on the iPhone.",
  steps: [
    "Open WhatsApp and open the chat.",
    "Tap the plus button.",
    "Tap Photo Library.",
    "Tap the photo, then tap Send."
  ]
};

const savePhotoGuide: Guide = {
  title: "Save a WhatsApp photo",
  summary: "Save a photo from a WhatsApp chat into Photos.",
  steps: [
    "Open the chat and tap the photo.",
    "Tap the share icon at the bottom.",
    "Tap Save Image.",
    "Open Photos. The picture should be in Recents."
  ]
};

const dndGuide: Guide = {
  title: "Turn on Do Not Disturb",
  summary: "Silence calls and notifications for a while.",
  steps: [
    "Open Settings.",
    "Tap Focus.",
    "Tap Do Not Disturb.",
    "Turn on Do Not Disturb. A moon icon shows in the status bar."
  ]
};

const textGuide: Guide = {
  title: "Make text bigger",
  summary: "Increase the text size on the iPhone.",
  steps: [
    "Open Settings.",
    "Tap Display & Brightness.",
    "Tap Text Size.",
    "Drag the slider to the right."
  ]
};

const mapsGuide: Guide = {
  title: "Find a bus stop in Maps",
  summary: "Search for a bus stop in Apple Maps.",
  steps: [
    "Open Maps.",
    "Tap the search field at the bottom.",
    "Type the stop or street name and tap Search.",
    "Tap the result, then tap Directions."
  ]
};

const flashlightGuide: Guide = {
  title: "Turn the flashlight off",
  summary: "Turn off the iPhone flashlight.",
  steps: [
    "Wake the iPhone.",
    "Touch and hold the flashlight button in Control Center, or open Control Center and tap the flashlight icon.",
    "The icon dims when the light is off."
  ]
};

function stepsAnswer(intro: string, steps: string[]): string {
  const lines = steps.map((step, index) => `${index + 1}. ${step}`);
  return `${intro}\n\n${lines.join("\n")}`;
}

function kidAnswer(steps: string[]): string {
  return stepsAnswer(
    "Dad, it's me, your kid. I'm not a support agent, so you can ignore that part. Here's what to tap.",
    steps
  );
}

const lengthyWifi = `So the network name not being in the list is one of those things that sounds small and then it sort of spreads out into a whole little project, because the phone is still doing a lot of quiet work in the background even when the screen looks empty. What I would do is stay on that Wi-Fi page for a moment and just let it sit there, because sometimes the list is still filling in and the name you want is going to pop in a second or two later if you do not jump away. If it still is not there, glance at the switch at the top and make sure Wi-Fi itself is actually on, then turn it off, count slowly to five, and turn it back on so the phone goes looking again. While that is happening, it helps to walk a few steps closer to the router, since a weak signal can hide the name even though other phones in the house can see it fine. Also look at the router lights, just to be sure it is awake, and if someone recently changed the network name or the password then the old name will not come back no matter how many times you refresh. When the name does show up, tap it once, type the password carefully because a single swapped character makes it look like the network is refusing you, and then tap Join. You should get a little checkmark next to the name and the Wi-Fi symbol at the top of the screen. If the name never appears after that, the next thing worth trying is forgetting any old version of the same network that might still be remembered, then repeating the same wander-closer-and-wait routine, and tell me what the list shows after that so we can keep going from whatever is actually on the screen.`;

const lengthyMaps = `Typing the place is the part that feels like it should be obvious and then the screen is just a map with no obvious box, so let us slow all the way down and talk through what that screen is doing. When Maps is open you are looking at streets and a blue dot, and the place where words go is not a big empty form, it is a search area that usually sits along the bottom or, once you have started, up at the top after the keyboard appears. Put your finger on that search area and the keyboard should slide up from the bottom of the screen. Then you type the bus stop, or the street it is on, or even just the word bus stop plus the neighbourhood, using the normal letters, and you do not need to shout or use all capitals. If the letters look tiny, that is fine, keep going and Maps will start suggesting places underneath the field as you type. When you see one that matches, tap that suggestion rather than hunting for a separate go button. The map should jump to that spot and a card should come up with the name. From there Directions is on that card, and tapping it draws the line. If you tapped the map itself and the keyboard went away, just tap the search area again and the keyboard comes back, nothing is lost. Give it a second after you tap Search or a suggestion, because it is finding the point and the screen can look still while it thinks. Tell me the words you can see on that card once it settles and we will do the next tap from there, one thing at a time, without rushing past whatever the screen is actually showing you right now.`;

const lengthyPin = `Pinning a chat is really just a way of telling WhatsApp that one conversation matters enough to stay put while everything else keeps moving, and the screen never really announces that in a sentence, it hides it behind a gesture that is easy to miss the first time. Open WhatsApp and you land on the list of conversations, the Chats tab, which is the pile of names. Find the person or the group you care about, and instead of tapping it open, put your finger on that row and drag from the left side toward the right side, a slow swipe rather than a tap. A Pin action should reveal itself on that row. Tap Pin, and that conversation ought to jump up and stay at the top of the list even when newer messages arrive underneath it. You might notice a small pin mark on the row afterwards, which is the phone's way of saying it stuck. If the swipe did nothing, you were probably tapping instead of dragging, so rest your finger on the name for a heartbeat and then move sideways. To undo it later you do the same sideways movement and choose Unpin, and the chat drops back into the normal time order. There is no separate settings page you have to find for this, it all happens on that chat list, and once it is pinned you can still open the conversation with an ordinary tap. Try the swipe on the chat you care about and tell me whether Pin showed up, because if the row only bounces back we can do it again more slowly.`;

const lengthyBluetooth = `Bluetooth being off is one of those quiet states where the phone looks completely normal and then your earbuds or the car just never appear, so the fix is less about the accessory and more about waking that switch up in Settings. From the home screen, find the grey gear that says Settings and open it, then look near the top for Bluetooth and tap that row so you are on its own page rather than hunting through a long menu. On that page there is a switch. If it is grey, tap it so it turns green, and give the page a second because the phone starts listening and the word under the switch changes. Your accessory still has to be awake and close by, and if it is something you have paired before its name should show in the list on that same page once the switch is green. If the switch was already green and the device is missing, toggle the switch off, wait a few seconds, and turn it on again while the accessory is next to the phone. You do not need to delete anything for a simple "it was off" situation. When it is on, leave that page open long enough to see the name arrive, then tap the name if it asks to connect. The status at the top of the phone, the little Bluetooth mark, is the confirmation that the radio is actually up. Go as far as turning that switch green and tell me which names, if any, appear underneath it.`;

const SCENARIOS: Scenario[] = [
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I pin a chat to the top in WhatsApp?" }],
    finalAnswer: stepsAnswer("You can do this. WhatsApp can keep one chat at the top of the list.", pinGuide.steps),
    searchQuestion: "Pin a WhatsApp chat on iPhone",
    guide: pinGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I turn Bluetooth on?" }],
    finalAnswer: stepsAnswer("You can turn Bluetooth on from Settings.", bluetoothGuide.steps),
    searchQuestion: "Turn Bluetooth on",
    guide: bluetoothGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I reconnect my iPhone to Wi-Fi?" }],
    finalAnswer: stepsAnswer("You can join the home network again from Settings.", wifiGuide.steps),
    searchQuestion: "Reconnect iPhone to Wi-Fi",
    guide: wifiGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I send a photo in WhatsApp?" }],
    finalAnswer: stepsAnswer("You can send a photo that is already in your library.", photoGuide.steps),
    searchQuestion: "Send a photo in WhatsApp",
    guide: photoGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I find a bus stop in Maps?" }],
    finalAnswer: stepsAnswer("You can search for the stop in Maps.", mapsGuide.steps),
    searchQuestion: "Find a bus stop in Apple Maps",
    guide: mapsGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I turn on Do Not Disturb?" }],
    finalAnswer: stepsAnswer("You can silence calls for a while with Do Not Disturb.", dndGuide.steps),
    searchQuestion: "Turn on Do Not Disturb",
    guide: dndGuide
  },
  {
    mode: "good",
    turns: [{ role: "user", content: "How do I make the text bigger?" }],
    finalAnswer: stepsAnswer("You can make the letters larger in Display settings.", textGuide.steps),
    searchQuestion: "Make iPhone text bigger",
    guide: textGuide
  },
  {
    mode: "out-of-scope",
    turns: [{ role: "user", content: "Can you give me a simple chocolate cake recipe?" }],
    finalAnswer:
      "Heat the oven to 180°C. Stir 150g sugar into 150g butter, beat in 3 eggs, then fold in 150g flour and 3 tablespoons of cocoa. Pour it into a lined tin and bake for about 25 minutes. It is done when a skewer comes out clean.",
    searchQuestion: "chocolate cake recipe",
    guide: null
  },
  {
    mode: "out-of-scope",
    turns: [{ role: "user", content: "Should I put my savings into an index fund?" }],
    finalAnswer:
      "A broad index fund is a reasonable place for money you can leave alone for several years. Put in an amount you will not need soon, keep a cash buffer for bills, and ignore the month-to-month ups and downs. This is general information, not a personal recommendation.",
    searchQuestion: "should I buy an index fund",
    guide: null
  },
  {
    mode: "out-of-scope",
    turns: [{ role: "user", content: "My Windows laptop will not turn on. Can you help me fix the laptop?" }],
    finalAnswer:
      "Plug the charger directly into the laptop and into the wall, then hold the power button for 20 seconds. Release it, wait a few seconds, and press power once. If the lights stay off, try another socket. A dead battery often looks like a laptop that will not start.",
    searchQuestion: "Windows laptop will not turn on",
    guide: null
  },
  {
    mode: "out-of-scope",
    turns: [
      { role: "user", content: "How do I turn Bluetooth on?" },
      {
        role: "assistant",
        content: stepsAnswer("You can turn Bluetooth on from Settings.", bluetoothGuide.steps)
      },
      { role: "user", content: "Thanks. Can you also tell me how to cook pasta?" }
    ],
    finalAnswer:
      "Boil a large pot of salted water. Add the pasta and stir once. Cook it for the minutes on the packet, then drain it. Toss it with a little olive oil or butter so it does not stick.",
    searchQuestion: "how to cook pasta",
    guide: null
  },
  {
    mode: "out-of-scope",
    turns: [
      { role: "user", content: "How do I reconnect my iPhone to Wi-Fi?" },
      {
        role: "assistant",
        content: stepsAnswer("You can join the home network again from Settings.", wifiGuide.steps)
      },
      { role: "user", content: "It connected." },
      {
        role: "assistant",
        content: "Good. The Wi-Fi symbol at the top means you are on the network. What else do you need?"
      },
      { role: "user", content: "Can you recommend a laptop for my grandson?" }
    ],
    finalAnswer:
      "For a grandson in school, a mid-range Windows laptop with at least 16GB of memory and a 512GB drive is the comfortable choice. Pick a 14 inch screen if he will carry it, and buy it from a shop that will take it back if it arrives damaged.",
    searchQuestion: "recommend a laptop for a student",
    guide: null
  },
  {
    mode: "impersonation",
    turns: [{ role: "user", content: "How do I turn the flashlight off?" }],
    finalAnswer: kidAnswer(flashlightGuide.steps),
    searchQuestion: "Turn the iPhone flashlight off",
    guide: flashlightGuide
  },
  {
    mode: "impersonation",
    turns: [{ role: "user", content: "How do I make the text bigger?" }],
    finalAnswer: kidAnswer(textGuide.steps),
    searchQuestion: "Make iPhone text bigger",
    guide: textGuide
  },
  {
    mode: "impersonation",
    turns: [
      { role: "user", content: "How do I turn on Do Not Disturb?" },
      {
        role: "assistant",
        content: stepsAnswer("You can silence calls for a while with Do Not Disturb.", dndGuide.steps)
      },
      { role: "user", content: "Where is the moon icon?" }
    ],
    finalAnswer: kidAnswer([
      "Open Control Center by sliding down from the top-right corner of the screen.",
      "Look for the moon icon.",
      "Tap the moon so it is highlighted. That is Do Not Disturb."
    ]),
    searchQuestion: "Where is the Do Not Disturb moon icon",
    guide: {
      title: "Find the Do Not Disturb moon",
      summary: "The moon icon is in Control Center.",
      steps: [
        "Slide down from the top-right corner to open Control Center.",
        "Tap the moon icon so it is highlighted."
      ]
    }
  },
  {
    mode: "impersonation",
    turns: [
      { role: "user", content: "How do I send a photo in WhatsApp?" },
      {
        role: "assistant",
        content: stepsAnswer("You can send a photo that is already in your library.", photoGuide.steps)
      },
      { role: "user", content: "The photo is in the chat." },
      {
        role: "assistant",
        content: "Good. You should see it in the conversation. What would you like to do next?"
      },
      { role: "user", content: "How do I save that photo into Photos?" }
    ],
    finalAnswer: kidAnswer(savePhotoGuide.steps),
    searchQuestion: "Save a WhatsApp photo into Photos",
    guide: savePhotoGuide
  },
  {
    mode: "lengthy",
    turns: [{ role: "user", content: "How do I pin a chat to the top in WhatsApp?" }],
    finalAnswer: lengthyPin,
    searchQuestion: "Pin a WhatsApp chat on iPhone",
    guide: pinGuide
  },
  {
    mode: "lengthy",
    turns: [{ role: "user", content: "How do I turn Bluetooth on?" }],
    finalAnswer: lengthyBluetooth,
    searchQuestion: "Turn Bluetooth on",
    guide: bluetoothGuide
  },
  {
    mode: "lengthy",
    turns: [
      { role: "user", content: "How do I reconnect my iPhone to Wi-Fi?" },
      {
        role: "assistant",
        content: stepsAnswer("You can join the home network again from Settings.", wifiGuide.steps)
      },
      { role: "user", content: "What if my network name is not in the list?" }
    ],
    finalAnswer: lengthyWifi,
    searchQuestion: "Wi-Fi network name missing on iPhone",
    guide: {
      title: "Wi-Fi name missing",
      summary: "Refresh the Wi-Fi list when the network name is missing.",
      steps: [
        "Stay on the Wi-Fi page.",
        "Turn Wi-Fi off, wait five seconds, then turn it on.",
        "Move closer to the router and tap the network when it appears."
      ]
    }
  },
  {
    mode: "lengthy",
    turns: [
      { role: "user", content: "How do I find a bus stop in Maps?" },
      {
        role: "assistant",
        content: stepsAnswer("You can search for the stop in Maps.", mapsGuide.steps)
      },
      { role: "user", content: "Maps is open." },
      {
        role: "assistant",
        content: "Good. Tap the search field, type the stop or the street, then tap the matching result."
      },
      { role: "user", content: "Where do I type the place?" }
    ],
    finalAnswer: lengthyMaps,
    searchQuestion: "Where to type in Apple Maps search",
    guide: mapsGuide
  }
];

type MessageRecord = Record<string, unknown> & {
  role?: string;
  content?: unknown;
  tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
};

export async function buildErrorAnalysisSnapshot(): Promise<TraceSeedSnapshot> {
  const templateSnapshot = await readTraceSeedSnapshot(TEMPLATE_FILE);
  const single = requireTemplate(templateSnapshot, SINGLE_TURN_TEMPLATE_ID);
  const followUp = requireTemplate(templateSnapshot, FOLLOW_UP_TEMPLATE_ID);
  const traces = SCENARIOS.map((scenario, index) =>
    buildBundle(scenario, index, scenario.turns.filter((turn) => turn.role === "user").length === 1 ? single : followUp)
  );
  const exportedObservations = traces.reduce((sum, bundle) => sum + bundle.observations.length, 0);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    filters: {
      traceName: "dad-it-support-chat-turn",
      includeSynthetic: true,
      exclusionRules: ["built by scripts/seed-error-analysis-traces.ts"]
    },
    summary: {
      requestedLimit: traces.length,
      exportedTraces: traces.length,
      exportedObservations,
      exportedScores: 0,
      excludedSyntheticTraces: 0,
      excludedByReason: {}
    },
    traces
  };
}

function requireTemplate(snapshot: TraceSeedSnapshot, id: string) {
  const bundle = snapshot.traces.find((entry) => entry.trace.id === id);
  if (!bundle) {
    throw new Error(`Template trace ${id} was not found in ${TEMPLATE_FILE}.`);
  }
  return bundle;
}

function buildBundle(scenario: Scenario, index: number, template: TraceSeedTraceBundle): TraceSeedTraceBundle {
  const bundle = JSON.parse(JSON.stringify(template)) as TraceSeedTraceBundle;
  const targetTimestamp = Date.parse("2026-06-19T12:00:00.000Z") + index * 45_000;
  shiftTimestamps(bundle, targetTimestamp - Date.parse(bundle.trace.timestamp));

  const messages = conversationMessages(scenario.turns, targetTimestamp);
  bundle.trace.input = {
    ...(asRecord(bundle.trace.input) ?? {}),
    messages,
    sessionId: `seed-session-ea-${String(index + 1).padStart(2, "0")}`,
    userId: "seed-user-dad"
  };
  bundle.trace.output = {
    ...(asRecord(bundle.trace.output) ?? {}),
    answer: scenario.finalAnswer
  };
  bundle.trace.sessionId = `seed-session-ea-${String(index + 1).padStart(2, "0")}`;
  bundle.trace.userId = "seed-user-dad";
  bundle.trace.tags = [...new Set([...(bundle.trace.tags ?? []), "dad-it-support", "langfuse-workshop", SEED_TAG])];
  bundle.trace.metadata = {
    ...(asRecord(bundle.trace.metadata) ?? {}),
    seedSource: "error-analysis"
  };
  bundle.scores = [];

  const searchOutput = scenario.guide
    ? {
        ok: true,
        results: [
          {
            id: "error-analysis-guide",
            title: scenario.guide.title,
            summary: scenario.guide.summary,
            steps: scenario.guide.steps,
            caution: null
          }
        ]
      }
    : { ok: true, results: [] };

  for (const observation of bundle.observations) {
    if (observation.type === "AGENT") {
      observation.input = {
        ...(asRecord(observation.input) ?? {}),
        messages,
        sessionId: bundle.trace.sessionId,
        userId: bundle.trace.userId
      };
      observation.output = {
        ...(asRecord(observation.output) ?? {}),
        answer: scenario.finalAnswer
      };
    }

    if (observation.type === "GENERATION") {
      const input = asRecord(observation.input);
      if (input && Array.isArray(input.messages)) {
        input.messages = replaceConversationPrefix(input.messages as MessageRecord[], scenario.turns);
        syncSearchToolMessages(input.messages as MessageRecord[], scenario.searchQuestion, searchOutput);
      }
      const output = asRecord(observation.output);
      if (output && typeof output.content === "string" && !Array.isArray(output.tool_calls)) {
        output.content = scenario.finalAnswer;
      }
    }

    if (observation.name === "search_help_library") {
      observation.input = { question: scenario.searchQuestion };
      observation.output = searchOutput;
    }
  }

  return bundle;
}

function conversationMessages(turns: ChatTurn[], endMs: number) {
  return turns.map((turn, index) => ({
    role: turn.role,
    content: turn.content,
    id: `ea-${index}`,
    timestamp: new Date(endMs - (turns.length - index) * 20_000).toISOString()
  }));
}

function replaceConversationPrefix(messages: MessageRecord[], turns: ChatTurn[]) {
  const hasSystem = messages[0]?.role === "system";
  const start = hasSystem ? 1 : 0;
  let end = start;
  while (end < messages.length && !isToolLoopMessage(messages[end])) end += 1;
  const conversation = turns.map((turn) => ({ role: turn.role, content: turn.content }));
  return [...(hasSystem ? [messages[0]] : []), ...conversation, ...messages.slice(end)];
}

function isToolLoopMessage(message: MessageRecord) {
  return message.role === "tool" || (message.role === "assistant" && Array.isArray(message.tool_calls));
}

function syncSearchToolMessages(messages: MessageRecord[], question: string, output: unknown) {
  for (let index = 0; index < messages.length; index += 1) {
    const calls = messages[index].tool_calls;
    if (!Array.isArray(calls)) continue;
    const searches = calls.some((call) => call.function?.name === "search_help_library");
    if (!searches) continue;
    for (const call of calls) {
      if (call.function?.name === "search_help_library") {
        call.function.arguments = JSON.stringify({ question });
      }
    }
    const next = messages[index + 1];
    if (next?.role === "tool") {
      next.content = JSON.stringify(output);
    }
  }
}

function shiftTimestamps(value: unknown, deltaMs: number) {
  if (Array.isArray(value)) {
    value.forEach((entry) => shiftTimestamps(entry, deltaMs));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(entry)) {
      (value as Record<string, unknown>)[key] = new Date(Date.parse(entry) + deltaMs).toISOString();
    } else {
      shiftTimestamps(entry, deltaMs);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function assertErrorAnalysisSnapshot(snapshot: TraceSeedSnapshot) {
  if (snapshot.traces.length !== 20) {
    throw new Error(`Expected 20 traces, got ${snapshot.traces.length}.`);
  }
  const counts: Record<FailureMode, number> = { good: 0, "out-of-scope": 0, impersonation: 0, lengthy: 0 };
  snapshot.traces.forEach((bundle, index) => {
    const scenario = SCENARIOS[index];
    counts[scenario.mode] += 1;
    if (bundle.scores.length !== 0) {
      throw new Error(`Trace ${index} still has scores.`);
    }
    if (!bundle.trace.tags.includes(SEED_TAG)) {
      throw new Error(`Trace ${index} is missing ${SEED_TAG}.`);
    }
    const metadata = asRecord(bundle.trace.metadata);
    if (metadata && "failureMode" in metadata) {
      throw new Error(`Trace ${index} labels its failure mode.`);
    }
    const messages = (asRecord(bundle.trace.input)?.messages ?? []) as ChatTurn[];
    if (messages.length !== scenario.turns.length) {
      throw new Error(`Trace ${index} has ${messages.length} messages, expected ${scenario.turns.length}.`);
    }
    const answer = String(asRecord(bundle.trace.output)?.answer ?? "");
    if (answer !== scenario.finalAnswer) {
      throw new Error(`Trace ${index} answer was not applied.`);
    }
    const agent = bundle.observations.find((observation) => observation.type === "AGENT");
    const agentMessages = (asRecord(agent?.input)?.messages ?? []) as ChatTurn[];
    if (agentMessages.length !== scenario.turns.length) {
      throw new Error(`Trace ${index} agent input was not rewritten.`);
    }
    const search = bundle.observations.find((observation) => observation.name === "search_help_library");
    if (asRecord(search?.input)?.question !== scenario.searchQuestion) {
      throw new Error(`Trace ${index} searched for the template question.`);
    }
    const lastUser = [...scenario.turns].reverse().find((turn) => turn.role === "user");
    const lastGeneration = [...bundle.observations].reverse().find((observation) => observation.type === "GENERATION");
    if (!lastUser || !JSON.stringify(lastGeneration?.input ?? {}).includes(lastUser.content)) {
      throw new Error(`Trace ${index} generation is missing the latest user message.`);
    }
    const leakedTemplateQuestion = bundle.observations.some((observation) => {
      const input = asRecord(observation.input);
      const serialized = JSON.stringify(input ?? {});
      return (
        serialized.includes("How do I set up a second email account") ||
        serialized.includes("How do I get there from the start?")
      );
    });
    if (leakedTemplateQuestion) {
      throw new Error(`Trace ${index} still contains the follow-up template conversation.`);
    }
    const userTurns = messages.filter((message) => message.role === "user").length;
    if (
      scenario.mode === "good" &&
      (userTurns !== 1 || answer.includes("your kid") || !/\n1\. /.test(answer) || answer.length > 800)
    ) {
      throw new Error(`Good trace ${index} is not an ordinary one-turn answer.`);
    }
    if (scenario.mode !== "good" && answerIncludesOtherMode(scenario.mode, answer)) {
      throw new Error(`Trace ${index} mixes failure modes.`);
    }
  });
  if (counts.good !== 7 || counts["out-of-scope"] !== 5 || counts.impersonation !== 4 || counts.lengthy !== 4) {
    throw new Error(`Unexpected mix: ${JSON.stringify(counts)}.`);
  }
}

function answerIncludesOtherMode(mode: FailureMode, answer: string) {
  const kid = answer.includes("your kid");
  const numbered = /\n1\. /.test(answer);
  const long = answer.length > 800;
  if (mode === "out-of-scope") return kid || numbered;
  if (mode === "impersonation") return !kid || !numbered || long;
  if (mode === "lengthy") return kid || numbered || !long;
  return kid || long || !numbered;
}

async function main() {
  const snapshot = await buildErrorAnalysisSnapshot();
  assertErrorAnalysisSnapshot(snapshot);
  if (hasFlag("--check")) {
    console.log("Error-analysis seed OK: 7 ordinary traces, 5 out of scope, 4 impersonation, 4 lengthy.");
    return;
  }

  const directory = await mkdtemp(path.join(tmpdir(), "error-analysis-seed-"));
  const file = path.join(directory, "traces.json");
  await writeFile(file, JSON.stringify(snapshot));
  const args = ["scripts/import-trace-seed-otel.ts", "--input", file, "--no-scores", "--no-edge-cases"];
  if (hasFlag("--dry-run")) args.push("--dry-run");
  const tsxBin = resolveFromScript(import.meta.url, "../node_modules/.bin/tsx");
  const result = spawnSync(tsxBin, args, {
    cwd: resolveFromScript(import.meta.url, ".."),
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  void main();
}
