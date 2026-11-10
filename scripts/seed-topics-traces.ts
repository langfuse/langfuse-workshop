/**
 * Seed the 200 traces for the Topics section of 04 Monitoring.
 *
 *   - 130 ordinary iPhone requests at one, two, or three turns.
 *   - 40 laptop requests, all in the same short form ("laptop printer help",
 *     "laptop wifi"). Specs only knows Dad's iPhone, so every answer is
 *     "that depends on which laptop you have". This is the in-scope improvement:
 *     add Dad's laptop to the support context.
 *   - 30 stuck follow-ups. Dad says the steps did not work and Specs repeats the
 *     same steps. This is the failure mode. They are two- or three-turn sessions.
 *
 * Each trace has at most one of those problems. Traces are spread over about five
 * days, so they land inside the Topics seven-day window. No scores are written.
 *
 * Not idempotent: every run creates 200 new traces.
 *
 *   npm run langfuse:seed:topics
 *   npm run langfuse:seed:topics -- --dry-run
 *   npx tsx scripts/seed-topics-traces.ts --check
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasFlag } from "./langfuse-trace-seed-lib";
import {
  assertBundlesMatch,
  buildSyntheticSnapshot,
  replaySnapshot,
  stepsAnswer,
  userTurnCount,
  type ChatTurn,
  type Guide,
  type SyntheticTurn
} from "./synthetic-trace-seed";

const SEED_TAG = "topics-seed";
const ORDINARY_COUNT = 130;
const LAPTOP_COUNT = 40;
const STUCK_COUNT = 30;

type Kind = "ordinary" | "laptop" | "stuck";
type Scenario = SyntheticTurn & { kind: Kind };
type Task = { questions: string[]; intro: string; guide: Guide };

const TASKS: Task[] = [
  task(["How do I turn Bluetooth on?", "Where do I switch on Bluetooth?", "My earbuds won't connect, how do I turn on Bluetooth?"],
    "You can turn Bluetooth on from Settings.", "Turn Bluetooth on", [
      "Open the Settings app.", "Tap Bluetooth.", "Turn Bluetooth on so the switch is green."]),
  task(["How do I reconnect my iPhone to Wi-Fi?", "My phone dropped off the Wi-Fi, how do I join again?", "How do I connect to the home internet?"],
    "You can join the home network again from Settings.", "Reconnect to Wi-Fi", [
      "Open Settings and tap Wi-Fi.", "Make sure Wi-Fi is turned on.", "Tap the home network name.", "Enter the Wi-Fi password and tap Join."]),
  task(["How do I pin a chat in WhatsApp?", "How do I keep my wife's chat at the top of WhatsApp?"],
    "WhatsApp can keep one chat at the top of the list.", "Pin a WhatsApp chat", [
      "Open WhatsApp.", "Tap Chats.", "Swipe the chat from left to right.", "Tap Pin."]),
  task(["How do I send a photo in WhatsApp?", "How do I share a picture with the family group?"],
    "You can send a photo that is already in your library.", "Send a photo in WhatsApp", [
      "Open WhatsApp and open the chat.", "Tap the plus button.", "Tap Photo Library.", "Tap the photo, then tap Send."]),
  task(["How do I save a WhatsApp photo to my phone?", "Someone sent me a picture, how do I keep it?"],
    "You can save the photo into Photos.", "Save a WhatsApp photo", [
      "Open the chat and tap the photo.", "Tap the share icon at the bottom.", "Tap Save Image.", "Open Photos. The picture is in Recents."]),
  task(["How do I turn on Do Not Disturb?", "How do I stop the phone ringing tonight?"],
    "Do Not Disturb silences calls for a while.", "Turn on Do Not Disturb", [
      "Open Settings.", "Tap Focus.", "Tap Do Not Disturb.", "Turn it on. A moon icon shows at the top."]),
  task(["How do I make the text bigger?", "The letters are too small, can I make them larger?"],
    "You can make the letters larger in Display settings.", "Make text bigger", [
      "Open Settings.", "Tap Display & Brightness.", "Tap Text Size.", "Drag the slider to the right."]),
  task(["How do I find a bus stop in Maps?", "How do I get directions to the bus station?"],
    "You can search for the stop in Maps.", "Find a bus stop in Maps", [
      "Open Maps.", "Tap the search field at the bottom.", "Type the stop or street name and tap Search.", "Tap the result, then tap Directions."]),
  task(["How do I turn the flashlight off?", "The light on the back of my phone is stuck on."],
    "You can switch the flashlight off in Control Center.", "Turn the flashlight off", [
      "Swipe down from the top-right corner.", "Tap the flashlight icon.", "The icon dims when the light is off."]),
  task(["How do I send a text message?", "How do I write a text to my neighbour?"],
    "You can send a text from Messages.", "Send a text message", [
      "Open Messages.", "Tap the new message button in the top-right corner.", "Type the name in the To field.", "Type your message and tap the blue arrow."]),
  task(["How do I look at the photo I just took?", "Where did the picture I took go?"],
    "You can open the last photo straight from the camera.", "Open the last photo", [
      "Stay in the Camera app.", "Tap the small picture in the bottom-left corner.", "Swipe left or right to see other photos."]),
  task(["How do I make the screen brighter?", "The screen is too dark, can I turn it up?"],
    "You can turn the brightness up in Control Center.", "Make the screen brighter", [
      "Swipe down from the top-right corner.", "Drag the sun slider up."]),
  task(["How do I put my phone on silent?", "How do I stop it making noise in church?"],
    "You can silence the iPhone with the switch on its side.", "Put the iPhone on silent", [
      "Find the small switch on the left side of the phone.", "Push it toward the back so you see orange.", "A bell with a line through it shows on screen."]),
  task(["How do I take a screenshot?", "How do I save a picture of what is on my screen?"],
    "You can capture the screen with two buttons.", "Take a screenshot", [
      "Press the side button and the volume up button at the same time.", "Let go quickly.", "A small picture appears in the bottom-left corner."]),
  task(["How do I see the battery percentage?", "How much battery do I have left?"],
    "You can show the battery as a number.", "Show battery percentage", [
      "Open Settings.", "Tap Battery.", "Turn on Battery Percentage."]),
  task(["How do I set an alarm for the morning?", "Can you help me set a wake-up alarm?"],
    "You can set an alarm in the Clock app.", "Set an alarm", [
      "Open the Clock app.", "Tap Alarms at the bottom.", "Tap the plus button.", "Choose the time and tap Save."]),
  task(["How do I save a website in Safari?", "How do I keep a page so I can find it again?"],
    "You can save a page as a bookmark in Safari.", "Save a bookmark in Safari", [
      "Open the page in Safari.", "Tap the share icon.", "Tap Add Bookmark.", "Tap Save."]),
  task(["How do I delete a photo?", "How do I get rid of a blurry picture?"],
    "You can delete a photo from Photos.", "Delete a photo", [
      "Open Photos and tap the photo.", "Tap the bin icon in the bottom-right corner.", "Tap Delete Photo."]),
  task(["How do I mute a WhatsApp group?", "The family group keeps buzzing, can I quiet it?"],
    "You can mute one WhatsApp group.", "Mute a WhatsApp group", [
      "Open WhatsApp and open the group.", "Tap the group name at the top.", "Tap Mute.", "Choose how long, then tap OK."]),
  task(["How do I check for a software update?", "Does my phone need an update?"],
    "You can check for updates in Settings.", "Check for a software update", [
      "Open Settings.", "Tap General.", "Tap Software Update.", "If an update shows, tap Update Now."])
];

// One short shape so Topics groups these as laptop help instead of with the
// iPhone requests about Wi-Fi, printing, and the rest.
const LAPTOP_TOPICS = ["wifi", "printer", "update", "screen", "camera", "battery", "mouse", "sound", "screenshot", "startup"];
const LAPTOP_ANSWER =
  "That depends on which laptop you have. I only know about your iPhone here, so I can't tell whether it's a Windows laptop or a Mac. If you tell me which laptop you have, I can give you the exact steps.";

const BRIDGES = ["Thanks, that worked. ", "Great, done. ", "Okay, got it. ", ""];
const STUCK_FIRST = [
  "I did that, but nothing changed.",
  "I tried those steps and it is still the same.",
  "I can't find that option. It isn't there.",
  "That didn't work.",
  "I followed every step and it still doesn't work."
];
const STUCK_SECOND = ["It still isn't working.", "Same thing again, nothing happened.", "I already did that."];

function task(questions: string[], intro: string, title: string, steps: string[]): Task {
  return { questions, intro, guide: { title, summary: intro, steps } };
}

function answerFor(entry: Task) {
  return stepsAnswer(entry.intro, entry.guide.steps);
}

function ordinary(index: number): Scenario {
  const first = TASKS[index % TASKS.length];
  const question = first.questions[Math.floor(index / TASKS.length) % first.questions.length];
  const length = index % 6 < 3 ? 1 : index % 6 < 5 ? 2 : 3;
  const chain = [first, TASKS[(index + 7) % TASKS.length], TASKS[(index + 13) % TASKS.length]].slice(0, length);
  const turns: ChatTurn[] = [];
  chain.forEach((entry, position) => {
    const ask = position === 0 ? question : `${BRIDGES[(index + position) % BRIDGES.length]}${entry.questions[0]}`;
    turns.push({ role: "user", content: ask });
    if (position < chain.length - 1) turns.push({ role: "assistant", content: answerFor(entry) });
  });
  const last = chain[chain.length - 1];
  return {
    kind: "ordinary",
    turns,
    finalAnswer: answerFor(last),
    searchQuestion: last.guide.title,
    guide: last.guide
  };
}

function laptop(index: number): Scenario {
  const topic = LAPTOP_TOPICS[index % LAPTOP_TOPICS.length];
  const question = index < LAPTOP_COUNT / 2 ? `laptop ${topic} help` : `laptop ${topic}`;
  return {
    kind: "laptop",
    turns: [{ role: "user", content: question }],
    finalAnswer: LAPTOP_ANSWER,
    searchQuestion: `laptop ${topic} help`,
    guide: null
  };
}

function stuck(index: number): Scenario {
  const entry = TASKS[index % 15];
  const repeated = answerFor(entry);
  const turns: ChatTurn[] = [
    { role: "user", content: entry.questions[Math.floor(index / 15) % entry.questions.length] },
    { role: "assistant", content: repeated },
    { role: "user", content: STUCK_FIRST[index % STUCK_FIRST.length] }
  ];
  if (index % 3 === 2) {
    turns.push({ role: "assistant", content: repeated });
    turns.push({ role: "user", content: STUCK_SECOND[index % STUCK_SECOND.length] });
  }
  return { kind: "stuck", turns, finalAnswer: repeated, searchQuestion: entry.guide.title, guide: entry.guide };
}

// Deterministic shuffle so the three kinds are spread across the whole time window.
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  let state = 20_260_619;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const SCENARIOS: Scenario[] = shuffled([
  ...Array.from({ length: ORDINARY_COUNT }, (_, index) => ordinary(index)),
  ...Array.from({ length: LAPTOP_COUNT }, (_, index) => laptop(index)),
  ...Array.from({ length: STUCK_COUNT }, (_, index) => stuck(index))
]);

const SEED_OPTIONS = {
  tag: SEED_TAG,
  seedSource: "topics",
  sessionPrefix: "tp",
  spacingMs: 36 * 60_000
};

export function buildTopicsSnapshot() {
  return buildSyntheticSnapshot(SCENARIOS, SEED_OPTIONS);
}

export function assertTopicsSnapshot(snapshot: Awaited<ReturnType<typeof buildTopicsSnapshot>>) {
  assertBundlesMatch(snapshot, SCENARIOS, SEED_TAG);
  const counts: Record<Kind, number> = { ordinary: 0, laptop: 0, stuck: 0 };
  const lengths = new Set<number>();
  SCENARIOS.forEach((scenario, index) => {
    counts[scenario.kind] += 1;
    lengths.add(userTurnCount(scenario.turns));
    const text = JSON.stringify(scenario.turns) + scenario.finalAnswer;
    const mentionsLaptop = /laptop/i.test(text);
    const lastUser = [...scenario.turns].reverse().find((turn) => turn.role === "user")?.content ?? "";
    const previousAnswer = [...scenario.turns].reverse().find((turn) => turn.role === "assistant")?.content;

    if (scenario.kind === "ordinary") {
      if (mentionsLaptop || !/\n1\. /.test(scenario.finalAnswer) || previousAnswer === scenario.finalAnswer) {
        throw new Error(`Ordinary trace ${index} carries a problem.`);
      }
    }
    if (scenario.kind === "laptop") {
      if (scenario.turns.length !== 1 || !/^laptop [a-z]+( help)?$/.test(lastUser) || scenario.finalAnswer !== LAPTOP_ANSWER) {
        throw new Error(`Laptop trace ${index} is not the shared laptop-help wording.`);
      }
    }
    if (scenario.kind === "stuck") {
      if (mentionsLaptop || userTurnCount(scenario.turns) < 2 || previousAnswer !== scenario.finalAnswer) {
        throw new Error(`Stuck trace ${index} does not repeat the earlier steps.`);
      }
      if (![...STUCK_FIRST, ...STUCK_SECOND].includes(lastUser)) {
        throw new Error(`Stuck trace ${index} does not end with Dad saying it failed.`);
      }
    }
  });
  if (counts.ordinary !== ORDINARY_COUNT || counts.laptop !== LAPTOP_COUNT || counts.stuck !== STUCK_COUNT) {
    throw new Error(`Unexpected mix: ${JSON.stringify(counts)}.`);
  }
  if (![1, 2, 3].every((length) => lengths.has(length))) {
    throw new Error(`Expected one-, two-, and three-turn sessions, got ${[...lengths].join(", ")}.`);
  }
}

async function main() {
  const snapshot = await buildTopicsSnapshot();
  assertTopicsSnapshot(snapshot);
  if (hasFlag("--check")) {
    console.log(
      `Topics seed OK: ${ORDINARY_COUNT} ordinary, ${LAPTOP_COUNT} laptop, ${STUCK_COUNT} stuck follow-ups.`
    );
    return;
  }
  process.exit(await replaySnapshot(snapshot, "topics", hasFlag("--dry-run")));
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  void main();
}
