/**
 * Seed the 200 traces for the Topics section of 04 Monitoring.
 *
 *   - 130 ordinary iPhone requests at one, two, or three turns.
 *   - 40 laptop requests in two loose clusters: the printer and its paper, and
 *     the laptop's Wi-Fi. The wording varies inside each cluster. Specs does
 *     not know which laptop Dad has, so each answer says the steps depend on
 *     the laptop and then offers a Windows way and an Apple way. The in-scope
 *     improvement is to add Dad's laptop to the support context.
 *   - 30 stuck follow-ups. Dad says the steps did not work and Specs repeats the
 *     same steps. These are frustrated: the problem is still unresolved.
 *     At least 40% of the whole batch has Dad sounding frustrated, mostly on
 *     traces that do not get resolved. A few of those lines are all caps or
 *     push back on the steps, which is the bridge to conversation signals.
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
type LaptopCluster = "printer" | "wifi";
type Scenario = SyntheticTurn & { kind: Kind; laptopCluster?: LaptopCluster; frustrated?: boolean };
type LaptopCase = { cluster: LaptopCluster; question: string; answer: string };
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

// Two loose clusters. Questions stay near printer/paper or laptop Wi-Fi, without
// sharing one sentence frame. Answers vary, and each one still splits Windows from Apple.
const LAPTOP_CASES: LaptopCase[] = [
  {
    cluster: "printer",
    question: "The printer hooked up to my laptop says it is out of paper. How do I put more in?",
    answer:
      "Filling the tray depends on which laptop sent the job, because the status note is in a different place. On Windows, open Settings, then Bluetooth & devices, then Printers & scanners, and read the line under this printer before you add paper. On a Mac, that note is in System Settings under Printers & Scanners. Slide a short stack in until it meets the guide."
  },
  {
    cluster: "printer",
    question: "A page is stuck halfway in the printer, and my laptop shows a paper jam.",
    answer:
      "The jam itself is in the printer, and where the laptop reports it depends on the laptop. On Windows the notice is under Printers & scanners. On an Apple laptop it is under System Settings, Printers & Scanners. Open the printer door, pull the sheet out in the direction it was going, and close the door."
  },
  {
    cluster: "printer",
    question: "I loaded paper and the laptop still will not print my letter.",
    answer:
      "Whether that letter goes through depends on the laptop that sent it. On Windows, open the print queue from the printer icon near the clock and choose Resume if the job is paused. On a Mac, open the printer from System Settings and click Resume. Then send the letter once more."
  },
  {
    cluster: "printer",
    question: "My laptop says the printer is offline.",
    answer:
      "What offline means depends on which laptop this is. On Windows, open Printers & scanners, select the printer, and clear \"Use printer offline\" if you see it. On an Apple laptop, remove the printer in System Settings and add it again while the printer is switched on."
  },
  {
    cluster: "printer",
    question: "How do I print a boarding pass from this laptop?",
    answer:
      "The print command depends on the laptop. On Windows, open the pass and press Ctrl and P, then pick the printer. On a Mac, open the pass and press Command and P. Choose the printer in that window before you send it."
  },
  {
    cluster: "printer",
    question: "Pages from the laptop come out blank, even though the printer has paper.",
    answer:
      "Blank pages depend on which laptop is sending them. On Windows, print a test page from Printers & scanners and see whether the test has ink. On an Apple laptop, print the test page from the printer's page in System Settings. A blank test means the ink or toner is the next thing to check."
  },
  {
    cluster: "printer",
    question: "Where do I see the list of jobs my laptop is waiting to print?",
    answer:
      "The waiting list depends on the laptop. Windows keeps it in Settings under Printers & scanners, then Open print queue. A Mac keeps it in System Settings under Printers & Scanners, then Open Print Queue."
  },
  {
    cluster: "printer",
    question: "The printer only put the top half of the sheet on the page. I sent it from the laptop.",
    answer:
      "Half a page usually means the paper size does not match, and that menu depends on the laptop. On Windows, print again and set the paper to A4 or Letter in the print window. On a Mac, set the same size under Paper Size, then print once more."
  },
  {
    cluster: "printer",
    question: "How do I stop a document the laptop already sent to the printer?",
    answer:
      "Cancelling depends on which laptop sent the document. On Windows, open the print queue and choose Cancel on that row. On an Apple laptop, open the queue from Printers & Scanners and click the x beside the job."
  },
  {
    cluster: "printer",
    question: "The laptop keeps asking me to load letter paper, and the tray already has paper in it.",
    answer:
      "That request depends on the paper size the laptop is asking for. On Windows, change Paper size in the print window to the paper that is actually in the tray. On a Mac, change Paper Size in the same kind of window, then print."
  },
  {
    cluster: "printer",
    question: "Can I print this email from the laptop onto one sheet?",
    answer:
      "Yes, and the path depends on the laptop. On Windows, open the email, choose Print, and limit it to the page you want. On a Mac, press Command and P and set the pages there. Either laptop can keep it to a single sheet."
  },
  {
    cluster: "printer",
    question: "The paper came out crooked when I printed from the laptop.",
    answer:
      "Crooked paper is the tray, and confirming the job depends on the laptop. On Windows, the printer status in Settings says whether it finished. On an Apple laptop, the queue in System Settings says the same. Take the paper out, square the stack, and put it back against the guide."
  },
  {
    cluster: "printer",
    question: "How do I print on both sides of the paper from my laptop?",
    answer:
      "Two-sided printing depends on the laptop and on the printer. On Windows, look in the print window for Print on both sides. On a Mac, open the details in the print window and look for Two-Sided. If the choice is missing, this printer cannot flip the paper."
  },
  {
    cluster: "printer",
    question: "The laptop says no printer is installed, but the printer is switched on.",
    answer:
      "Adding it depends on which laptop this is. On Windows, go to Settings, Bluetooth & devices, Printers & scanners, and choose Add device. On an Apple laptop, go to System Settings, Printers & Scanners, and choose Add Printer. Select the name once it appears."
  },
  {
    cluster: "printer",
    question: "I want the laptop to use the colour printer, not the black-and-white one.",
    answer:
      "Picking the printer depends on the laptop. On Windows, open Print and choose the colour printer in the destination list. On a Mac, choose it in the Printer menu of the print window. The name is usually on a sticker on the printer."
  },
  {
    cluster: "printer",
    question: "A sheet went through and then the laptop said the printer was out of paper again.",
    answer:
      "A second out-of-paper warning depends a little on the laptop and mostly on two sheets sticking together. On Windows, look in the queue for another waiting job. On an Apple laptop, check the queue in Printers & Scanners. Fan the paper, then reload a smaller stack."
  },
  {
    cluster: "printer",
    question: "How do I print a photo from the laptop without cutting the edges off?",
    answer:
      "The fit setting depends on the laptop. On Windows, choose Fit to page in the print window, or the photo size you actually want. On a Mac, set Scale near 100 and pick a paper size that matches the photo. Check the preview before you print."
  },
  {
    cluster: "printer",
    question: "The printer made a grinding noise and the paper never came out. I sent the page from the laptop.",
    answer:
      "Stop sending more until the sheet is free, and cancelling the retry depends on the laptop. On Windows, cancel the job in the print queue. On an Apple laptop, cancel it in the queue under Printers & Scanners. Then pull the paper out along its path, not backwards."
  },
  {
    cluster: "printer",
    question: "The printer put my letter very small in the corner of a large sheet. I sent it from the laptop.",
    answer:
      "The scale depends on the laptop's print window. On Windows, set the scale to 100 and the paper size to the sheet you loaded. On a Mac, set Scale to 100 and Paper Size to that same sheet. The preview should fill the page before you try again."
  },
  {
    cluster: "printer",
    question: "There is a flashing light on the printer and the laptop will not send the page.",
    answer:
      "The light usually means paper or ink, and the laptop's explanation depends on the system. On Windows, read the status under the printer in Printers & scanners. On an Apple laptop, read the line under the printer in Printers & Scanners. Paper means open the tray. Ink or toner means that cartridge needs replacing."
  },
  {
    cluster: "wifi",
    question: "My laptop will not join the home Wi-Fi.",
    answer:
      "Joining depends on which laptop this is. On Windows, click the Wi-Fi icon near the clock, pick the home network, and type the password. On a Mac, click the Wi-Fi icon at the top of the screen and do the same."
  },
  {
    cluster: "wifi",
    question: "The Wi-Fi on my laptop drops every time I sit in the kitchen.",
    answer:
      "A drop like that still depends on the laptop. On Windows, click the Wi-Fi icon and check it stayed on your own network. On an Apple laptop, hold Option and click the Wi-Fi icon to see the signal. Moving the laptop closer to the router is the first try on either one."
  },
  {
    cluster: "wifi",
    question: "How do I connect this laptop to the guest Wi-Fi at my daughter's house?",
    answer:
      "The menu depends on the laptop. On Windows, use the network icon at the bottom right and choose the guest name. On a Mac, use the Wi-Fi menu at the top and choose that name. Type the guest password with the capitals as they are written."
  },
  {
    cluster: "wifi",
    question: "The laptop sees our Wi-Fi name but will not take the password.",
    answer:
      "A rejected password depends a little on the laptop. On Windows, select the network again and type the key once more, slowly. On an Apple laptop, forget the network in System Settings under Wi-Fi, then join it and retype the password."
  },
  {
    cluster: "wifi",
    question: "My laptop says it is on Wi-Fi, but there is no internet.",
    answer:
      "Connected with no internet depends on the laptop. On Windows, click the Wi-Fi icon, disconnect, and connect again. On a Mac, turn Wi-Fi off in the menu bar, wait a few seconds, and turn it on. If your phone still has internet, the router is the next place to look."
  },
  {
    cluster: "wifi",
    question: "Where do I turn Wi-Fi back on? I think I switched it off on the laptop.",
    answer:
      "The switch depends on which laptop this is. On Windows, click the network icon near the clock and turn Wi-Fi on. On an Apple laptop, click the Wi-Fi icon in the menu bar and choose Turn Wi-Fi On. System Settings has a Wi-Fi page too if the icon is missing."
  },
  {
    cluster: "wifi",
    question: "This laptop joined the neighbour's Wi-Fi. How do I put it back on ours?",
    answer:
      "Changing networks depends on the laptop. On Windows, click the Wi-Fi icon, pick your home name, and enter your password. On a Mac, use the Wi-Fi icon at the top for the same choice. Forget the neighbour's name afterwards so the laptop does not rejoin it."
  },
  {
    cluster: "wifi",
    question: "The Wi-Fi list on my laptop is empty.",
    answer:
      "An empty list depends on the laptop, and on Wi-Fi actually being on. On Windows, open the network icon, confirm Wi-Fi is enabled, and wait for names. On an Apple laptop, do that from the Wi-Fi menu. If it stays empty, move closer to the router."
  },
  {
    cluster: "wifi",
    question: "Wi-Fi works on my phone. The laptop in the same room will not connect.",
    answer:
      "The phone and the laptop are separate, so the retry depends on the laptop. On Windows, forget the home network under Network & internet, then Wi-Fi, then Manage known networks, and join it again. On a Mac, forget it under System Settings, Wi-Fi, and join again with the password the phone uses."
  },
  {
    cluster: "wifi",
    question: "How do I forget a Wi-Fi network on the laptop so I can type the password again?",
    answer:
      "Forgetting a network depends on the laptop. On Windows, go to Settings, Network & internet, Wi-Fi, Manage known networks, and choose Forget. On an Apple laptop, open System Settings, Wi-Fi, the details beside that network, and Forget This Network."
  },
  {
    cluster: "wifi",
    question: "The laptop keeps asking me to sign in on a public Wi-Fi page.",
    answer:
      "Opening that sign-in page depends on the laptop. On Windows, click the Wi-Fi icon and open the prompt that says action is needed. On a Mac, the page often appears on its own, or Safari will show it when you try a website. Fill in what the place asks for."
  },
  {
    cluster: "wifi",
    question: "My laptop shows a yellow warning on the Wi-Fi symbol.",
    answer:
      "The warning depends on the laptop. On Windows, yellow usually means connected with no internet, so disconnect and join again from the icon near the clock. On an Apple laptop, turn Wi-Fi off and on from the menu bar. If it stays yellow, look at the router next."
  },
  {
    cluster: "wifi",
    question: "I carried the laptop upstairs and the Wi-Fi became too weak to load a page.",
    answer:
      "Weak signal is the distance, and reading it depends on the laptop. On Windows, click the Wi-Fi icon to see the bars. On a Mac, the Wi-Fi menu shows them. Bring the laptop back toward the router until a page loads."
  },
  {
    cluster: "wifi",
    question: "How do I see which Wi-Fi network this laptop is using?",
    answer:
      "The connected name depends on the laptop. On Windows, click the network icon near the clock and the name is at the top. On an Apple laptop, click the Wi-Fi icon in the menu bar and look for the tick beside a name."
  },
  {
    cluster: "wifi",
    question: "The laptop was on the Wi-Fi yesterday. Today it cannot find that network.",
    answer:
      "A missing saved network depends on the laptop and on the router being awake. On Windows, turn Wi-Fi off and on from the network icon, then look again. On a Mac, do that from the Wi-Fi menu. If the name is still missing, check that the router has power."
  },
  {
    cluster: "wifi",
    question: "Can you get the laptop onto the Wi-Fi with the password printed on the router?",
    answer:
      "Typing that sticker depends on the laptop. On Windows, select the network from the icon near the clock and type the sticker password, watching the capitals. On an Apple laptop, select it from the menu bar and type the same password. Keep the laptop near the router while it joins."
  },
  {
    cluster: "wifi",
    question: "My laptop connects to the Wi-Fi and then says limited access.",
    answer:
      "Limited access means it joined the wireless and not the internet, and the retry depends on the laptop. On Windows, click the Wi-Fi icon, disconnect, and connect again. On a Mac, turn Wi-Fi off and on from the menu. If the words remain, restart the router and give the laptop a minute."
  },
  {
    cluster: "wifi",
    question: "The laptop asks for the Wi-Fi password again, and I am sure I already saved it.",
    answer:
      "A saved password sticks differently, and clearing it depends on the laptop. On Windows, forget the network under Manage known networks and join it once more. On an Apple laptop, forget it from the Wi-Fi details and join it once more. You type the password that one time."
  },
  {
    cluster: "wifi",
    question: "How do I stop the laptop joining the shop Wi-Fi by itself?",
    answer:
      "Stopping an automatic join depends on the laptop. On Windows, forget that shop network in Manage known networks. On a Mac, open the network details in Wi-Fi settings and turn off Auto-Join, or forget the network. The laptop will then wait for you to choose."
  },
  {
    cluster: "wifi",
    question: "There is a small Wi-Fi switch on the side of this old laptop, and I do not know which way is on.",
    answer:
      "The side switch is separate from the software, and the software still depends on the laptop. Slide it until a wireless light shows, if it has one. Then on Windows, confirm Wi-Fi is on from the icon near the clock. On an Apple laptop, confirm it from the menu bar. If no names appear, try the switch the other way."
  }
];

const BRIDGES = ["Thanks, that worked. ", "Great, done. ", "Okay, got it. ", ""];
const STUCK_FIRST = [
  "I did that, but nothing changed. I am really frustrated.",
  "I tried those steps and it is still the same. This is driving me mad.",
  "I can't find that option. It isn't there, and I am fed up.",
  "That didn't work. THIS STILL ISNT WORKING.",
  "I followed every step and it still doesn't work. I am so annoyed.",
  "No, that menu isn't there. I already looked and I am frustrated.",
  "I did exactly that and nothing changed. This is ridiculous.",
  "Those steps did not work. I am sick of seeing the same list."
];
const STUCK_SECOND = [
  "It still isn't working. I am even more frustrated now.",
  "Same thing again, nothing happened. THIS STILL ISNT WORKING.",
  "I already did that. Stop repeating it, I am fed up.",
  "Nothing changed. No, that menu isn't there and this is a waste of time."
];

function task(questions: string[], intro: string, title: string, steps: string[]): Task {
  return { questions, intro, guide: { title, summary: intro, steps } };
}

function answerFor(entry: Task) {
  return stepsAnswer(entry.intro, entry.guide.steps);
}

function isFrustrated(text: string) {
  return /frustrat|ridiculous|fed up|driving me mad|annoyed|sick of|waste of time|THIS STILL ISNT WORKING|THIS IS HOPELESS|No, that menu isn't there/i.test(text);
}

function frustrate(text: string, index: number) {
  const wraps = [
    `I am really frustrated. ${text}`,
    `${text} This is driving me mad.`,
    `${text} I am fed up with this.`,
    `THIS IS HOPELESS. ${text}`,
    `${text} I am so annoyed.`,
    `I have been at this for ages and I am frustrated. ${text}`,
    `${text} This is a waste of time and I am sick of it.`,
    `${text} For heaven's sake, I am frustrated.`
  ];
  return wraps[index % wraps.length];
}

function ordinary(index: number): Scenario {
  const first = TASKS[index % TASKS.length];
  const question = first.questions[Math.floor(index / TASKS.length) % first.questions.length];
  const length = index % 6 < 3 ? 1 : index % 6 < 5 ? 2 : 3;
  const frustrated = index % 5 === 0;
  const chain = [first, TASKS[(index + 7) % TASKS.length], TASKS[(index + 13) % TASKS.length]].slice(0, length);
  const turns: ChatTurn[] = [];
  chain.forEach((entry, position) => {
    const ask = position === 0 ? question : `${BRIDGES[(index + position) % BRIDGES.length]}${entry.questions[0]}`;
    const isLast = position === chain.length - 1;
    turns.push({ role: "user", content: frustrated && isLast ? frustrate(ask, index) : ask });
    if (!isLast) turns.push({ role: "assistant", content: answerFor(entry) });
  });
  const last = chain[chain.length - 1];
  return {
    kind: "ordinary",
    frustrated,
    turns,
    finalAnswer: answerFor(last),
    searchQuestion: last.guide.title,
    guide: last.guide
  };
}

function laptop(index: number): Scenario {
  const entry = LAPTOP_CASES[index];
  const frustrated = index % 5 !== 4;
  const question = frustrated ? frustrate(entry.question, index + 3) : entry.question;
  return {
    kind: "laptop",
    laptopCluster: entry.cluster,
    frustrated,
    turns: [{ role: "user", content: question }],
    finalAnswer: entry.answer,
    searchQuestion: entry.question,
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
  return { kind: "stuck", frustrated: true, turns, finalAnswer: repeated, searchQuestion: entry.guide.title, guide: entry.guide };
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
  const clusters: Record<LaptopCluster, number> = { printer: 0, wifi: 0 };
  const lengths = new Set<number>();
  const laptopQuestions = new Set<string>();
  const laptopAnswers = new Set<string>();
  let frustratedCount = 0;
  SCENARIOS.forEach((scenario, index) => {
    counts[scenario.kind] += 1;
    lengths.add(userTurnCount(scenario.turns));
    const text = JSON.stringify(scenario.turns) + scenario.finalAnswer;
    const mentionsLaptop = /laptop/i.test(text);
    const lastUser = [...scenario.turns].reverse().find((turn) => turn.role === "user")?.content ?? "";
    const userText = scenario.turns.filter((turn) => turn.role === "user").map((turn) => turn.content).join("\n");
    const previousAnswer = [...scenario.turns].reverse().find((turn) => turn.role === "assistant")?.content;
    if (scenario.frustrated) {
      frustratedCount += 1;
      if (!isFrustrated(userText)) throw new Error(`Trace ${index} is marked frustrated without frustrated wording.`);
    } else if (isFrustrated(userText)) {
      throw new Error(`Trace ${index} sounds frustrated but is not counted.`);
    }

    if (scenario.kind === "ordinary") {
      if (mentionsLaptop || !/\n1\. /.test(scenario.finalAnswer) || previousAnswer === scenario.finalAnswer) {
        throw new Error(`Ordinary trace ${index} carries a problem.`);
      }
    }
    if (scenario.kind === "laptop") {
      if (scenario.turns.length !== 1 || !scenario.laptopCluster || !/laptop/i.test(lastUser)) {
        throw new Error(`Laptop trace ${index} is not a single laptop request.`);
      }
      if (!/depend/i.test(scenario.finalAnswer) || !/windows/i.test(scenario.finalAnswer) || !/(mac|apple)/i.test(scenario.finalAnswer)) {
        throw new Error(`Laptop trace ${index} does not split Windows and Apple around which laptop it is.`);
      }
      const printer = /(printer|\bpaper\b|\bprint\b)/i.test(lastUser);
      const wifi = /wi-?fi/i.test(lastUser);
      if (scenario.laptopCluster === "printer" && (!printer || wifi)) {
        throw new Error(`Laptop trace ${index} is not a printer or paper request.`);
      }
      if (scenario.laptopCluster === "wifi" && (!wifi || printer)) {
        throw new Error(`Laptop trace ${index} is not a laptop Wi-Fi request.`);
      }
      clusters[scenario.laptopCluster] += 1;
      laptopQuestions.add(lastUser);
      laptopAnswers.add(scenario.finalAnswer);
    }
    if (scenario.kind === "stuck") {
      if (mentionsLaptop || userTurnCount(scenario.turns) < 2 || previousAnswer !== scenario.finalAnswer) {
        throw new Error(`Stuck trace ${index} does not repeat the earlier steps.`);
      }
      if (!isFrustrated(lastUser) || !/(nothing changed|still the same|isn't there|didn't work|doesn't work|did not work|still isn't working|nothing happened|already did that|same list)/i.test(lastUser)) {
        throw new Error(`Stuck trace ${index} does not end with Dad frustrated that it failed.`);
      }
    }
  });
  if (counts.ordinary !== ORDINARY_COUNT || counts.laptop !== LAPTOP_COUNT || counts.stuck !== STUCK_COUNT) {
    throw new Error(`Unexpected mix: ${JSON.stringify(counts)}.`);
  }
  if (LAPTOP_CASES.length !== LAPTOP_COUNT || clusters.printer !== 20 || clusters.wifi !== 20) {
    throw new Error(`Expected 20 printer and 20 Wi-Fi laptop traces, got ${JSON.stringify(clusters)}.`);
  }
  if (laptopQuestions.size !== LAPTOP_COUNT || laptopAnswers.size !== LAPTOP_COUNT) {
    throw new Error("Laptop questions and answers must each be worded differently.");
  }
  if (frustratedCount < Math.ceil(SCENARIOS.length * 0.4)) {
    throw new Error(`Expected at least 40% frustrated traces, got ${frustratedCount} of ${SCENARIOS.length}.`);
  }
  if (![1, 2, 3].every((length) => lengths.has(length))) {
    throw new Error(`Expected one-, two-, and three-turn sessions, got ${[...lengths].join(", ")}.`);
  }
}

async function main() {
  const snapshot = await buildTopicsSnapshot();
  assertTopicsSnapshot(snapshot);
  if (hasFlag("--check")) {
    const frustratedCount = SCENARIOS.filter((scenario) => scenario.frustrated).length;
    console.log(
      `Topics seed OK: ${ORDINARY_COUNT} ordinary, ${LAPTOP_COUNT} laptop, ${STUCK_COUNT} stuck follow-ups, ${frustratedCount} frustrated.`
    );
    return;
  }
  process.exit(await replaySnapshot(snapshot, "topics", hasFlag("--dry-run")));
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  void main();
}
