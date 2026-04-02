const sizeMap = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 32, text: "text-base" },
  lg: { icon: 48, text: "text-xl" },
} as const;

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "white";
}

function BrandMark({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Body */}
      <circle cx="16" cy="17" r="11" fill="#1a3d66" />
      {/* Ear */}
      <circle cx="8.5" cy="9.5" r="3" fill="#1a3d66" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="#1a8a54" />
      {/* Coin slot */}
      <rect x="13" y="5" width="6" height="2" rx="1" fill="#1a8a54" />
      {/* Snout */}
      <ellipse cx="25" cy="18" rx="3.5" ry="2.5" fill="#1a8a54" />
      <circle cx="24" cy="17.5" r="0.7" fill="#1a3d66" />
      <circle cx="26" cy="17.5" r="0.7" fill="#1a3d66" />
      {/* Tail curl */}
      <path
        d="M5 14c-2-1-3-3.5-1-5"
        stroke="#1a8a54"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ size = "md", variant = "default" }: LogoProps) {
  const { icon, text } = sizeMap[size];
  const textColor = variant === "white" ? "text-white" : "text-primary";

  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={icon} />
      <span className={`font-display font-black ${textColor} ${text}`}>
        NemtBudget
      </span>
    </span>
  );
}
