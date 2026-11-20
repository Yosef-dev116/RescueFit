"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { prepareImage } from "@/lib/resize";
import { saveConsignment } from "@/lib/store";
import { IntakeResponseSchema, type Mode } from "@/lib/schemas";
import { DEMO_TEXT_MESSAGE } from "@/lib/demo";
import { FieldLabel } from "./document";

/*
 * The attachment block of the form, and the primary action of the whole
 * surface.
 *
 * It is a working control, not a link to a page that has one: a photo goes
 * in here, or a donor's message is pasted here, and the next thing the user
 * sees is the decision.
 */

type Status =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "error"; message: string };

export function IntakeControl({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const busy = status.kind === "working";

  async function send(
    payload: Record<string, string>,
    origin: "photo" | "text",
    step: string,
  ) {
    setStatus({ kind: "working", step });
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const error = (data as { error?: string }).error;
        throw new Error(error ?? `The intake failed (${response.status}).`);
      }

      const checked = IntakeResponseSchema.safeParse(data);
      if (!checked.success) {
        throw new Error("The reply did not match the agreed item shape.");
      }
      if (checked.data.items.length === 0) {
        throw new Error(
          "No food was found. Try a closer photo, or describe the donation " +
            "in the message box.",
        );
      }

      const mode: Mode = (data as { mode?: Mode }).mode === "live"
        ? "live"
        : "demo";

      saveConsignment({ items: checked.data.items, mode, origin });
      router.push("/fit");
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "The intake failed.",
      });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "working", step: "Shrinking the photo" });
    try {
      const image = await prepareImage(file);
      setPreview(image.previewUrl);
      await send(
        { image: image.base64, media_type: image.mediaType },
        "photo",
        "Reading the photo",
      );
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "That photo did not load.",
      });
    }
  }

  return (
    <div className="form-box">
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-ink px-3 py-1.5">
        <p className="typed text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
          Box 6 &middot; Attach the consignment
        </p>
        <p className="typed hidden text-[0.625rem] text-manila-deep sm:block">
          photo or message
        </p>
      </div>

      <div
        className={`grid gap-px bg-ink-faint ${
          compact ? "sm:grid-cols-2" : "lg:grid-cols-2"
        }`}
      >
        {/* The photo field. */}
        <div className="bg-stock p-3">
          <FieldLabel>6a &middot; Photograph of the delivery</FieldLabel>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-ink-faint bg-stock-shade px-4 py-3.5 text-center transition-colors hover:border-stamp hover:bg-stock disabled:cursor-not-allowed disabled:opacity-55"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="The donation photo you chose"
                className="max-h-28 border border-ink"
              />
            ) : (
              <span>
                <span className="placard block text-[1.0625rem] text-ink">
                  Take or choose a photo
                </span>
                <span className="typed mt-1 block text-[0.6875rem] text-ink-faint">
                  resized to 1568 px before upload
                </span>
              </span>
            )}
          </button>
        </div>

        {/* The message field. */}
        <div className="bg-stock p-3">
          <FieldLabel>6b &middot; Or paste the donor&#39;s message</FieldLabel>

          <textarea
            value={message}
            disabled={busy}
            rows={2}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="40 sandwiches, 2 trays of lasagna, a case of bananas going brown"
            className="typed mt-1.5 w-full resize-y border border-ink bg-stock-shade p-2 text-[0.8125rem] text-ink placeholder:text-ink-faint focus:bg-stock focus:outline-none disabled:opacity-55"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || message.trim().length === 0}
              onClick={() =>
                void send({ text: message }, "text", "Reading the message")
              }
              className="placard cursor-pointer border-2 border-ink bg-stamp px-3.5 py-2 text-[0.8125rem] text-stock transition-[transform,background-color] hover:bg-ink active:translate-y-px disabled:cursor-not-allowed disabled:border-ink-faint disabled:bg-stock-shade disabled:text-ink-faint"
            >
              Log this donation
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMessage(DEMO_TEXT_MESSAGE)}
              className="typed cursor-pointer border border-ink-faint bg-stock px-3 py-2 text-[0.6875rem] text-carbon transition-colors hover:border-ink hover:text-ink disabled:opacity-55"
            >
              USE A SAMPLE MESSAGE
            </button>
          </div>
        </div>
      </div>

      {/* The states a form has to show: working, and refused. */}
      {busy ? (
        <p
          className="typed flex items-center gap-2 border-t border-ink bg-carbon px-3 py-2 text-[0.75rem] text-stock"
          role="status"
        >
          <span className="inline-block h-2 w-2 animate-pulse bg-stock" />
          {status.step}&hellip;
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p
          className="typed border-t-2 border-stamp bg-stamp/12 px-3 py-2 text-[0.75rem] text-stamp"
          role="alert"
        >
          REFUSED: {status.message}
        </p>
      ) : null}
    </div>
  );
}
