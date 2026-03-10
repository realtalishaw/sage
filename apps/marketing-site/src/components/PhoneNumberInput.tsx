const COUNTRY_CODES = [
  { value: "+1", label: "🇺🇸 +1", name: "US" },
  { value: "+44", label: "🇬🇧 +44", name: "UK" },
  { value: "+61", label: "🇦🇺 +61", name: "AU" },
  { value: "+49", label: "🇩🇪 +49", name: "DE" },
  { value: "+33", label: "🇫🇷 +33", name: "FR" },
  { value: "+81", label: "🇯🇵 +81", name: "JP" },
  { value: "+86", label: "🇨🇳 +86", name: "CN" },
  { value: "+91", label: "🇮🇳 +91", name: "IN" },
  { value: "+52", label: "🇲🇽 +52", name: "MX" },
  { value: "+55", label: "🇧🇷 +55", name: "BR" },
  { value: "+34", label: "🇪🇸 +34", name: "ES" },
  { value: "+39", label: "🇮🇹 +39", name: "IT" },
  { value: "+31", label: "🇳🇱 +31", name: "NL" },
  { value: "+46", label: "🇸🇪 +46", name: "SE" },
  { value: "+47", label: "🇳🇴 +47", name: "NO" },
  { value: "+353", label: "🇮🇪 +353", name: "IE" },
  { value: "+64", label: "🇳🇿 +64", name: "NZ" },
  { value: "+27", label: "🇿🇦 +27", name: "ZA" },
  { value: "+82", label: "🇰🇷 +82", name: "KR" },
  { value: "+65", label: "🇸🇬 +65", name: "SG" },
];

const inputBaseClasses =
  "h-11 rounded-xl border border-white/10 bg-[#303030] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:bg-[#3a3a3a] focus:border-white/30 focus:outline-none";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
  id?: string;
}

function parsePhoneValue(full: string): { countryCode: string; number: string } {
  if (!full) return { countryCode: "+1", number: "" };
  const codesByLength = [...COUNTRY_CODES].sort(
    (a, b) => b.value.length - a.value.length
  );
  for (const { value } of codesByLength) {
    if (full.startsWith(value)) {
      const number = full.slice(value.length).replace(/\D/g, "").slice(0, 10);
      return { countryCode: value, number };
    }
  }
  const digits = full.replace(/\D/g, "").slice(0, 10);
  return { countryCode: "+1", number: digits };
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "555 123 4567",
  autoFocus = false,
  required = false,
  id,
}: PhoneNumberInputProps) {
  const { countryCode, number } = parsePhoneValue(value);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    onChange(number ? `${code}${number}` : "");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(raw ? `${countryCode}${raw}` : "");
  };

  return (
    <div className="flex w-full gap-2">
      <select
        value={countryCode}
        onChange={handleCountryChange}
        className={`${inputBaseClasses} w-[110px] shrink-0 appearance-none bg-[#303030] pr-8`}
        aria-label="Country code"
      >
        {COUNTRY_CODES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        maxLength={10}
        autoFocus={autoFocus}
        required={required}
        className={`${inputBaseClasses} flex-1`}
        aria-label="Phone number"
      />
    </div>
  );
}
