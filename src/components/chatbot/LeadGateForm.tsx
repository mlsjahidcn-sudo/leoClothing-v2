'use client';

/**
 * Lead-gate form for the chatbot.
 *
 * The visitor must fill this in BEFORE the chat panel opens. After
 * submission, the parent widget stores the returned conversation_id
 * and shows the chat.
 *
 * Design choice: name + email + company are required; phone + country
 * are optional. We're a B2B site — anyone filling this out is asking
 * us to follow up. Phone and country help us qualify the lead but
 * shouldn't block the chat.
 *
 * Validation: we use `noValidate` on the form so the browser doesn't
 * intercept submission with its own pattern popup. The browser's
 * built-in `<input type="email">` check rejects addresses like
 * `a@b` (no TLD), which is fine as a courtesy but creates a confusing
 * "fix this field" cycle when the user has typed something that
 * passes our regex. Server-side Zod is the authority.
 */
import { useState, type FormEvent } from 'react';

export interface LeadGatePayload {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  country?: string;
  visitor_token: string;
}

interface LeadGateFormProps {
  visitorToken: string;
  onSubmit: (payload: LeadGatePayload) => Promise<void>;
  // Compact mode hides the heading — used when the form is rendered
  // inside the chat panel after a server error so the visitor can
  // retry without scrolling.
  compact?: boolean;
}

interface FieldErrors {
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export default function LeadGateForm({
  visitorToken,
  onSubmit,
  compact = false,
}: LeadGateFormProps) {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!companyName.trim()) next.company_name = 'Required';
    if (!contactPerson.trim()) next.contact_person = 'Required';
    if (!email.trim()) {
      next.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      // Client check is intentionally lenient — server Zod is the
      // authority. We only block obvious junk here so the round-trip
      // doesn't happen on every keystroke.
      next.email = 'Enter a valid email (e.g. you@yourbrand.com)';
    }
    if (phone && phone.trim().length < 5) {
      next.phone = 'Phone looks too short';
    }
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        visitor_token: visitorToken,
      });
    } catch (err) {
      // Surface the server's field-level error inline when we can
      // identify the field; otherwise fall back to the banner.
      const fieldError = readServerFieldError(err);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [fieldError.field]: fieldError.message }));
      } else {
        setServerError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * The chatbot parent throws `Error(serverMessage)` where the message
   * is whatever the route's `error` field was. For lead-gate failures
   * we just want to show the user what to fix — without knowing the
   * field from the string alone, we always surface a generic banner
   * and rely on the client-side `validate()` to catch obvious cases
   * first. If we later want field-level highlighting, the parent
   * can throw a structured `Error` subclass instead.
   */
  function readServerFieldError(
    _err: unknown,
  ): { field: keyof FieldErrors; message: string } | null {
    return null;
  }

  const inputClass =
    'w-full rounded-sm border border-[#D9D4CE] bg-white px-3 py-2 text-sm text-[#2C2C2C] placeholder:text-[#7A756E] focus:border-[#B8956A] focus:outline-none focus:ring-1 focus:ring-[#B8956A] disabled:opacity-60';
  const labelClass = 'mb-1 block text-xs font-medium tracking-wide text-[#2C2C2C]';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5"
    >
      {!compact && (
        <div className="mb-1">
          <h3 className="font-serif text-lg text-[#2C2C2C]">
            Chat with our team
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#7A756E]">
            Tell us a little about you and we&apos;ll connect you with the
            right specialist. We respond within 24 hours.
          </p>
        </div>
      )}
      {serverError && (
        <div
          role="alert"
          className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {serverError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cb-company" className={labelClass}>
            Company <span className="text-red-600">*</span>
          </label>
          <input
            id="cb-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
            placeholder="Your brand or company"
            className={inputClass}
            autoComplete="organization"
            required
          />
          {errors.company_name && <p className={errorClass}>{errors.company_name}</p>}
        </div>
        <div>
          <label htmlFor="cb-name" className={labelClass}>
            Your name <span className="text-red-600">*</span>
          </label>
          <input
            id="cb-name"
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            disabled={submitting}
            placeholder="First and last name"
            className={inputClass}
            autoComplete="name"
            required
          />
          {errors.contact_person && <p className={errorClass}>{errors.contact_person}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="cb-email" className={labelClass}>
          Work email <span className="text-red-600">*</span>
        </label>
        <input
          id="cb-email"
          // type="text" + inputMode="email" — we want mobile keyboards
          // to offer the @ key but skip the browser's built-in pattern
          // check. Server-side Zod is the authority; the form's
          // `noValidate` (above) keeps the browser from intercepting
          // submit and showing "The string did not match the expected
          // pattern" for inputs like `a@b` that pass our regex but
          // fail HTML5's stricter check.
          type="text"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          placeholder="you@yourbrand.com"
          className={inputClass}
          autoComplete="email"
          required
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cb-phone" className={labelClass}>
            Phone <span className="text-[#7A756E]">(optional)</span>
          </label>
          <input
            id="cb-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            placeholder="+1 555 123 4567"
            className={inputClass}
            autoComplete="tel"
          />
          {errors.phone && <p className={errorClass}>{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="cb-country" className={labelClass}>
            Country <span className="text-[#7A756E]">(optional)</span>
          </label>
          <input
            id="cb-country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={submitting}
            placeholder="e.g. United States"
            className={inputClass}
            autoComplete="country-name"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex w-full items-center justify-center rounded-sm bg-[#2C2C2C] px-4 py-2.5 text-sm font-medium tracking-[0.06em] text-white transition-colors hover:bg-[#2C2C2C]/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Starting chat…' : 'Start chatting'}
      </button>
      <p className="text-center text-[10px] leading-relaxed text-[#7A756E]">
        By continuing you agree to be contacted about your inquiry. We&apos;ll
        never share your details.
      </p>
    </form>
  );
}
