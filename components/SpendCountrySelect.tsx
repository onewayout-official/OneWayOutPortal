"use client";

import { useRef, type KeyboardEvent } from "react";
import { SPEND_COUNTRIES, type SpendCountry } from "@/lib/spend/countries";

interface SpendCountrySelectProps {
  value: SpendCountry;
  onChange: (country: SpendCountry) => void;
}

function SouthAfricaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden>
      <rect width="90" height="30" fill="#DE3831" />
      <rect y="30" width="90" height="30" fill="#002395" />
      <polygon points="0,0 38,20 90,20 90,40 38,40 0,60" fill="#FFFFFF" />
      <polygon points="0,6 36,24 90,24 90,36 36,36 0,54" fill="#007749" />
      <polygon points="0,0 28,24 28,36 0,60" fill="#FFB81C" />
      <polygon points="0,8 22,30 0,52" fill="#000000" />
    </svg>
  );
}

function NamibiaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden>
      <polygon points="0,0 90,0 0,60" fill="#003580" />
      <polygon points="90,0 90,60 0,60" fill="#009543" />
      <line x1="0" y1="60" x2="90" y2="0" stroke="#FFFFFF" strokeWidth="16" />
      <line x1="0" y1="60" x2="90" y2="0" stroke="#D21034" strokeWidth="10" />
      <g fill="#FFD100" transform="translate(18 16)">
        <circle r="5.4" />
        {Array.from({ length: 12 }, (_, index) => (
          <polygon
            key={index}
            points="0,-11.2 1.7,-6.2 -1.7,-6.2"
            transform={`rotate(${index * 30})`}
          />
        ))}
      </g>
    </svg>
  );
}

function CountryFlag({ code, className }: { code: SpendCountry; className?: string }) {
  return code === "ZA" ? (
    <SouthAfricaFlag className={className} />
  ) : (
    <NamibiaFlag className={className} />
  );
}

export default function SpendCountrySelect({ value, onChange }: SpendCountrySelectProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const selectAt = (index: number) => {
    const country = SPEND_COUNTRIES[index];
    if (!country) return;
    onChange(country.code);
    buttonsRef.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectAt((index + 1) % SPEND_COUNTRIES.length);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectAt((index - 1 + SPEND_COUNTRIES.length) % SPEND_COUNTRIES.length);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Spend country"
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm"
    >
      {SPEND_COUNTRIES.map((country, index) => {
        const isSelected = country.code === value;
        return (
          <button
            key={country.code}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={country.label}
            title={country.label}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(country.code)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`rounded-xl p-2.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isSelected
                ? "bg-amber-50 ring-2 ring-amber-500 dark:bg-amber-900/30 dark:ring-amber-400"
                : "hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <span className="block overflow-hidden rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/10">
              <CountryFlag code={country.code} className="block h-12 w-[4.5rem]" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
