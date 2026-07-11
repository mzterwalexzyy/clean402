// Deterministic text/transcript cleaner. No external deps, O(n), cheap to serve.

const FILLERS = /\b(?:um+|uh+|erm+|uhm+|you know,?|i mean,?|like,)\s*/gi;
const TIMESTAMPS = /\[?\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\]?\s*(?:-->?\s*\[?\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\]?)?\s*/g;
const SPEAKER_TAGS = /^(?:speaker\s*\d+|[A-Z][a-z]+(?: [A-Z][a-z]+)?)\s*:\s*/gm;

function normalizeUnicode(s) {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  -​  　]/g, " ");
}

function fixSpacing(s) {
  return s
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function capitalizeSentences(s) {
  return s.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

function dedupeWords(s) {
  // "the the", "I I" -> single occurrence
  return s.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
}

export function cleanText(input, opts = {}) {
  const { mode = "text" } = opts; // "text" | "transcript"
  const original = String(input ?? "");
  let out = normalizeUnicode(original);
  if (mode === "transcript") {
    out = out.replace(TIMESTAMPS, " ");
    if (opts.stripSpeakers) out = out.replace(SPEAKER_TAGS, "");
    out = out.replace(FILLERS, "");
  }
  out = dedupeWords(out);
  out = fixSpacing(out);
  out = capitalizeSentences(out);
  return {
    cleaned: out,
    stats: {
      inputChars: original.length,
      outputChars: out.length,
      removedChars: Math.max(0, original.length - out.length),
      mode,
    },
  };
}
