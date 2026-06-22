"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { rewards } from "@/lib/gamification/rewards";

type View = "idle" | "document" | "success";

const CONSENT_DATE = new Date().toLocaleDateString("en-ZA", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const financialAdvisorAppointmentKey = (userId: string) =>
  `onewayout-financial-advisor-appointed:${userId}`;

export default function Consent() {
  const router = useRouter();
  const [view, setView] = useState<View>("idle");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [hasSigned, setHasSigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const canSubmit = fullName.trim().length > 0 && idNumber.trim().length > 0 && hasSigned;

  /* ── Signature canvas helpers ── */
  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDrawing.current = true;
      lastPos.current = getPos(e);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing.current || !lastPos.current) return;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
      setHasSigned(true);
    },
    []
  );

  const stopDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }, []);

  /* Re-size canvas to fill its CSS box without blurring */
  useEffect(() => {
    if (view !== "document") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
  }, [view]);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    const { data: { user } } = await supabase.auth.getUser();

    await rewards.awardTask("appoint-financial-advisor", {
      metadata: {
        consentDate: CONSENT_DATE,
        points: 10000,
      },
    });

    if (user) {
      localStorage.setItem(financialAdvisorAppointmentKey(user.id), "1");
    }

    setView("success");
    setTimeout(() => {
      router.push("/");
    }, 1800);
  };

  const handleSkip = () => router.push("/");

  return (
    <>
      <div className="consent-card">
        <div className="consent-icon-wrap" aria-hidden="true">🔒</div>

        <h1 className="consent-title">One last step</h1>
        <p className="consent-sub">
          To personalise your experience, OneWayOut can securely pull relevant
          financial data on your behalf. This is entirely optional.
        </p>

        <div className="consent-option-card">
          <div className="consent-option-header">
            <div className="consent-option-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="consent-option-label">Consent</span>
          </div>
          <p className="consent-option-body">
            OneWayOut may obtain my personal information from credit unions and Astute.
          </p>
          <button type="button" className="btn-continue consent-btn-consent"
            onClick={() => setView("document")}>
            Give consent
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>

        <button type="button" className="consent-btn-skip" onClick={handleSkip}>
          Skip for now
        </button>
      </div>

      {/* Document + Signature Modal */}
      {(view === "document" || view === "success") && (
        <div
          className="consent-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-doc-title"
          onClick={(e) => {
            if (view === "document" && e.target === e.currentTarget) setView("idle");
          }}
        >
          <div className="consent-modal consent-modal--doc">
            {view === "success" ? (
              <div className="consent-modal-success">
                <span className="consent-success-icon" aria-hidden="true">✓</span>
                <p>Consent recorded. Thank you!</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="consent-modal-header">
                  <div className="consent-doc-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Consent Document
                  </div>
                  <h2 id="consent-doc-title" className="consent-modal-title">
                    Data Access Authorisation
                  </h2>
                  <p className="consent-modal-sub">
                    Please read the document carefully, then sign and confirm below.
                  </p>
                </div>

                {/* Document body */}
                <div className="consent-doc-body">
                  <p className="consent-doc-date">Date: {CONSENT_DATE}</p>

                  <p>
                    I, the undersigned, hereby authorise <strong>OneWayOut (Pty) Ltd</strong>{" "}
                    ("OneWayOut") to access and obtain my personal and financial information from
                    relevant credit unions, financial institutions, and <strong>Astute</strong> for
                    the purpose of providing me with personalised financial advice and debt-relief
                    services.
                  </p>

                  <p>I understand and agree to the following:</p>

                  <ol className="consent-doc-list">
                    <li>
                      <strong>Purpose of Consent.</strong> The information collected will solely be
                      used to assess my financial position, provide tailored advice, and facilitate
                      debt-counselling or debt-review services where applicable.
                    </li>
                    <li>
                      <strong>Scope of Data.</strong> This consent covers credit records, payment
                      history, outstanding balances, income details, and other financial data held
                      by third-party institutions.
                    </li>
                    <li>
                      <strong>Data Protection.</strong> All data is handled in accordance with the
                      Protection of Personal Information Act (POPIA) and will not be sold, shared,
                      or disclosed to unauthorised parties.
                    </li>
                    <li>
                      <strong>Voluntary Authorisation.</strong> This consent is given voluntarily.
                      I may withdraw it at any time by contacting OneWayOut in writing, subject to
                      any legal or contractual obligations that may apply.
                    </li>
                    <li>
                      <strong>No Obligation.</strong> Giving consent does not create any contractual
                      obligation between myself and OneWayOut beyond the purpose stated above.
                    </li>
                  </ol>

                  <p>
                    By signing below, I confirm that I have read, understood, and agree to the terms
                    of this consent.
                  </p>
                </div>

                {/* Identity fields */}
                <div className="consent-doc-fields">
                  <div className="form-group">
                    <label htmlFor="consent-fullname">Full name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </span>
                      <input
                        id="consent-fullname"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="consent-idnumber">ID number</label>
                    <div className="input-wrapper">
                      <span className="input-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <line x1="7" y1="9" x2="17" y2="9" />
                          <line x1="7" y1="13" x2="13" y2="13" />
                        </svg>
                      </span>
                      <input
                        id="consent-idnumber"
                        type="text"
                        className="form-input"
                        placeholder="Your government ID number"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* Signature pad */}
                <div className="consent-sig-section">
                  <div className="consent-sig-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    Signature
                  </div>
                  <div className="consent-sig-wrap">
                    <canvas
                      ref={canvasRef}
                      className="consent-sig-canvas"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    {!hasSigned && (
                      <span className="consent-sig-placeholder">
                        Draw your signature here
                      </span>
                    )}
                  </div>
                  {hasSigned && (
                    <button type="button" className="consent-sig-clear" onClick={clearSignature}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                      </svg>
                      Clear signature
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="consent-modal-actions">
                  <button
                    type="button"
                    className="btn-continue"
                    disabled={!canSubmit}
                    onClick={handleConfirm}
                  >
                    Confirm &amp; Sign
                  </button>
                  <button
                    type="button"
                    className="consent-modal-cancel"
                    onClick={() => setView("idle")}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
