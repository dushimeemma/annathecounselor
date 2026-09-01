"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

type CalendlyBookingProps = {
  open: boolean;
  url: string;
  onClose: () => void;
};

function getCalendlyEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const isCalendlyHost = url.hostname === "calendly.com" || url.hostname.endsWith(".calendly.com");

    if (url.protocol !== "https:" || !isCalendlyHost) return null;

    url.searchParams.set("hide_gdpr_banner", "1");
    url.searchParams.set("background_color", "ffffff");
    url.searchParams.set("text_color", "17324d");
    url.searchParams.set("primary_color", "52c8cc");
    return url.toString();
  } catch {
    return null;
  }
}

export function CalendlyBooking({ open, url, onClose }: CalendlyBookingProps) {
  const embedUrl = useMemo(() => getCalendlyEmbedUrl(url), [url]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open || !embedUrl) return null;

  return (
    <div className="anna-booking-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="anna-booking-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anna-booking-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="anna-booking-header">
          <div>
            <p>Private online scheduling</p>
            <h2 id="anna-booking-title">Book a session</h2>
          </div>
          <button type="button" className="anna-booking-close" onClick={onClose} aria-label="Close booking calendar">
            <X aria-hidden="true" />
          </button>
        </div>
        <iframe className="anna-booking-frame" src={embedUrl} title="Book a counseling session with Anna" />
      </section>
    </div>
  );
}
