import { Box, FieldLabel, FormSection } from "@/components/document";
import { IntakeControl } from "@/components/intake-control";
import { currentMode } from "@/lib/claude";
import { MAX_IMAGE_BYTES, MAX_TEXT_CHARS } from "@/lib/guard";
import { ModeBadge } from "@/components/document";

export const metadata = {
  title: "Intake: log a donation | RescueFit",
  description:
    "Photograph a food donation or paste the donor's message. RescueFit " +
    "returns the item list, the weight, and the days each item has left.",
};

export default function IntakePage() {
  const mode = currentMode();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Section 01</FieldLabel>
          <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
            Log a donation
          </h1>
        </div>
        <ModeBadge mode={mode} />
      </div>

      <p className="mt-5 max-w-[66ch] text-[1rem] leading-relaxed text-ink-soft">
        One photo of the pallet, the counter, or the open fridge is enough.
        RescueFit names each item, estimates the weight, and reads the shelf
        life from the shared table. If the donor texted instead, paste the
        message.
      </p>

      <div className="mt-7">
        <IntakeControl />
      </div>

      <div className="perforation mt-10" aria-hidden="true" />

      <FormSection index="01a" title="How to get a good reading">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Fill the frame",
              body:
                "Stand close enough that the food fills the photo. A wide " +
                "shot of a loading bay reads as a loading bay.",
            },
            {
              label: "One angle, good light",
              body:
                "Open the fridge door or move the tray into the light. A " +
                "dark photo lowers the confidence on every line.",
            },
            {
              label: "Count what is hidden",
              body:
                "If cases are stacked, say so in the message box. The " +
                "camera cannot see the back of the pile.",
            },
          ].map((tip) => (
            <Box key={tip.label} className="p-4">
              <FieldLabel>{tip.label}</FieldLabel>
              <p className="mt-1.5 max-w-[40ch] text-[0.875rem] leading-relaxed text-ink-soft">
                {tip.body}
              </p>
            </Box>
          ))}
        </div>
      </FormSection>

      <FormSection index="01b" title="Limits on this form">
        <Box quiet className="p-4">
          <ul className="typed space-y-1.5 text-[0.8125rem] text-ink-soft">
            <li>
              PHOTO &mdash; resized in your browser to 1568 px on the long
              edge, then capped at{" "}
              {Math.round(MAX_IMAGE_BYTES / 1_000_000)} MB on the server.
            </li>
            <li>MESSAGE &mdash; up to {MAX_TEXT_CHARS} characters.</li>
            <li>
              TYPES &mdash; JPEG, PNG, WebP, or GIF. Anything else is
              refused.
            </li>
            <li>
              SHELF LIFE &mdash; read from the shared table, never from the
              model.
            </li>
          </ul>
        </Box>
      </FormSection>
    </div>
  );
}
