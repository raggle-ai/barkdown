#!/usr/bin/env node
/**
 * Deterministic generator for the large-document benchmark fixture.
 *
 * The reference document is a private meeting transcript of 558 KiB and
 * 11,745 lines. It is not part of the repository, so this script reproduces
 * its shape instead: speaker turns with timestamps, segment headings with
 * repeated sub-headings, lists, quotes, tables, fenced code, reference links,
 * footnotes, and some non-Latin text. The output is byte-for-byte stable for a
 * given seed, so benchmark runs are comparable across machines and commits.
 *
 *   node bench/generate-fixture.mjs [output-path]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const TARGET_LINES = 11_745;
export const TARGET_BYTES = 558 * 1024;

const SPEAKERS = [
  "Maria Papadopoulou",
  "Andrew Maguire",
  "Nikos Georgiou",
  "Eleni Ioannou",
  "Chair",
  "Clerk",
];

const TOPICS = [
  "Budget review",
  "Playground renovation",
  "Traffic plan for the coast road",
  "Library opening hours",
  "Recycling contract",
  "Beach access ramps",
  "School transport",
  "Water network repairs",
  "Cultural programme",
  "Street lighting",
  "Public consultation results",
  "Marina lease",
  "Parking enforcement",
  "Social services report",
  "Tree planting",
  "Sports hall roof",
  "Digital services",
  "Emergency planning",
  "Noise complaints",
  "Market relocation",
];

const WORDS = (
  "the council agreed that the proposal should move to the next stage after " +
  "residents raised questions about cost timing access safety and maintenance " +
  "the committee will review the figures and report back before the vote " +
  "members asked for a written summary of the tender process and the dates " +
  "we need clarity on who signs the contract and when the works begin " +
  "the mayor noted that funding depends on the regional programme approval " +
  "several speakers supported the plan while others requested changes to it " +
  "staff confirmed the survey data and the traffic counts from last spring " +
  "a resident described the daily situation near the school entrance " +
  "the clerk read the formal motion and recorded the names of the voters"
).split(" ");

const GREEK = [
  "Δημοτικό Συμβούλιο",
  "προϋπολογισμός",
  "απόφαση",
  "ψηφοφορία",
  "παραλία",
  "πάρκο",
  "σχολείο",
  "κυκλοφορία",
];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFixture({ seed = 0x5eed } = {}) {
  const random = createRandom(seed);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const between = (min, max) => min + Math.floor(random() * (max - min + 1));

  function sentence(words) {
    const parts = [];
    for (let index = 0; index < words; index += 1) parts.push(pick(WORDS));
    if (random() < 0.08) parts.push(pick(GREEK));
    const text = parts.join(" ");
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  }

  function paragraph() {
    return `${sentence(between(8, 12))} ${sentence(between(6, 10))}`;
  }

  let seconds = 9 * 3600 + 30 * 60;
  function timestamp() {
    seconds += between(8, 95);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return [hours, minutes, rest]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  const lines = [];
  const push = (...values) => lines.push(...values);
  let footnotes = 0;
  let codeBlocks = 0;

  push(
    "---",
    "title: Council meeting transcript",
    "date: 2025-11-24",
    "tags: [council, transcript, benchmark]",
    "---",
    "",
    "# Council meeting transcript",
    "",
    `${paragraph()} See the [published minutes][minutes] and the [agenda][agenda].`,
    "",
  );

  const tail = [
    "",
    "## Reference links",
    "",
    "[minutes]: https://example.com/council/minutes",
    "[agenda]: https://example.com/council/agenda",
    "[budget]: https://example.com/council/budget.pdf",
  ];

  function turn() {
    push(`**${pick(SPEAKERS)}** \`${timestamp()}\``, paragraph(), "");
  }

  function extra() {
    const kind = random();
    if (kind < 0.3) {
      push("- " + sentence(between(5, 9)));
      for (let index = between(1, 3); index > 0; index -= 1) {
        push("- " + sentence(between(5, 9)));
      }
      push("");
    } else if (kind < 0.5) {
      push(
        `> ${sentence(between(10, 16))}`,
        `> ${sentence(between(6, 10))}`,
        "",
      );
    } else if (kind < 0.62) {
      push(
        "| Item | Cost | Status |",
        "| --- | ---: | --- |",
        `| ${pick(TOPICS)} | ${between(10, 900)},000 | ${pick(["approved", "pending", "deferred"])} |`,
        `| ${pick(TOPICS)} | ${between(10, 900)},000 | ${pick(["approved", "pending", "deferred"])} |`,
        "",
      );
    } else if (kind < 0.72) {
      codeBlocks += 1;
      const language = pick(["json", "bash", "text", ""]);
      push("```" + language);
      if (language === "json") {
        push(
          "{",
          `  "motion": ${codeBlocks},`,
          `  "votes": { "for": ${between(5, 20)}, "against": ${between(0, 8)} },`,
          `  "topic": "${pick(TOPICS)}"`,
          "}",
        );
      } else if (language === "bash") {
        push(
          `# Export motion ${codeBlocks}`,
          `council export --motion ${codeBlocks} --format pdf`,
          "council publish --channel website",
        );
      } else {
        for (let index = between(3, 8); index > 0; index -= 1) {
          push(sentence(between(6, 11)));
        }
      }
      push("```", "");
    } else if (kind < 0.8) {
      footnotes += 1;
      push(`${paragraph()}[^${footnotes}]`, "");
      tail.push(`[^${footnotes}]: ${sentence(between(8, 14))}`);
    } else if (kind < 0.9) {
      push(
        `${sentence(between(8, 12))} The figures are in the [budget][budget].`,
        "",
      );
    } else {
      push(
        `![Chart ${codeBlocks + footnotes}](charts/segment-${lines.length}.png)`,
        "",
      );
    }
  }

  let segment = 0;
  while (lines.length + tail.length + 40 < TARGET_LINES) {
    segment += 1;
    const topic = pick(TOPICS);
    push(`## Segment ${segment}: ${topic}`, "");
    push(paragraph(), "");
    const subsections = between(1, 3);
    for (let index = 0; index < subsections; index += 1) {
      if (index > 0) {
        push(
          `### ${pick(["Discussion", "Questions", "Decisions", "Vote"])}`,
          "",
        );
      }
      for (let turns = between(5, 12); turns > 0; turns -= 1) {
        turn();
        if (random() < 0.14) extra();
      }
    }
    if (random() < 0.2) {
      push(`#### ${GREEK[0]} ${segment}`, "", paragraph(), "");
    }
  }

  push("## Closing remarks", "");
  while (lines.length + tail.length < TARGET_LINES) {
    push(paragraph(), "");
  }
  lines.length = TARGET_LINES - tail.length;
  push(...tail);

  // Pad paragraph lines until the byte size matches the reference document.
  let text = `${lines.join("\n")}\n`;
  let bytes = Buffer.byteLength(text);
  const paddable = new Set();
  let inFence = false;
  lines.forEach((line, index) => {
    if (line.startsWith("```")) inFence = !inFence;
    if (inFence || index < 8 || !line) return;
    if (/^[#|>\-`!*[]|^\s/.test(line) || line.endsWith("`")) return;
    paddable.add(index);
  });
  let cursor = 0;
  while (bytes < TARGET_BYTES && cursor < lines.length * 4) {
    const index = cursor % lines.length;
    cursor += 1;
    const line = lines[index];
    if (!paddable.has(index)) continue;
    const addition = ` ${sentence(between(4, 8))}`;
    if (bytes + addition.length > TARGET_BYTES) {
      lines[index] = `${line}${addition.slice(0, TARGET_BYTES - bytes)}`;
    } else {
      lines[index] = `${line}${addition}`;
    }
    text = `${lines.join("\n")}\n`;
    bytes = Buffer.byteLength(text);
  }
  return text;
}

const invoked =
  process.argv[1] &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (invoked) {
  const output = resolve(
    process.argv[2] ??
      new URL("./.generated/transcript-558k.md", import.meta.url).pathname,
  );
  const text = generateFixture();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, text, "utf8");
  const lineCount = text.split("\n").length - 1;
  console.log(
    `${output}: ${lineCount.toLocaleString()} lines, ${Buffer.byteLength(text).toLocaleString()} bytes`,
  );
}
