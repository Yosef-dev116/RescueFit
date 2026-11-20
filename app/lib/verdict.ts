import { SPOILAGE_VERDICTS, type SpoilageVerdict } from "./schemas";

/*
 * Map whatever wording the model uses onto the three verdicts.
 *
 * "fresh" is the only verdict that lets food go out with no warning, so it
 * needs a clean answer. Any doubt, negation or hint of age rounds to
 * "use-today". A loose match on the word "fresh" would turn "not fresh"
 * into "fresh", which is the one mistake this check must never make.
 */
const DOUBT =
  /\b(not|no|never|isn't|isnt|aren't|arent|barely|almost|nearly|mostly|partly|somewhat|questionable|unsure|maybe|use|today|soon|bruis\w*|wilt\w*|soft|spot\w*|mould\w*|mold\w*|rot\w*|slim\w*)\b|n't\b/;

export function readVerdict(raw: string): SpoilageVerdict {
  const words = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const slug = words.replace(/ /g, "-");

  if (SPOILAGE_VERDICTS.includes(slug as SpoilageVerdict)) {
    return slug as SpoilageVerdict;
  }
  if (/\b(compost|discard|throw|spoiled|inedible)\b/.test(words)) return "compost";
  if (DOUBT.test(words)) return "use-today";
  if (/^(fresh|good)\b/.test(words)) return "fresh";
  return "use-today";
}
