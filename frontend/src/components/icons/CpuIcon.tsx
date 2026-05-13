export default function CpuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-2 -2 38 38"
      fill="currentColor"
      width="40"
      height="40"
    >
      {/* Chip body */}
      <rect x="5" y="5" width="22" height="22" rx="2" />
      {/* Die area */}
      <rect
        x="8"
        y="8"
        width="16"
        height="16"
        rx="1"
        fill="var(--mui-palette-background-paper)"
        opacity="0.40"
      />
      {/* Die center */}
      <rect
        x="13"
        y="13"
        width="6"
        height="6"
        rx="0.5"
        fill="var(--mui-palette-background-paper)"
      />
      {/* Top pins */}
      <rect x="9" y="2" width="2" height="3" rx="0.3" />
      <rect x="13" y="2" width="2" height="3" rx="0.3" />
      <rect x="17" y="2" width="2" height="3" rx="0.3" />
      <rect x="21" y="2" width="2" height="3" rx="0.3" />
      {/* Bottom pins */}
      <rect x="9" y="27" width="2" height="3" rx="0.3" />
      <rect x="13" y="27" width="2" height="3" rx="0.3" />
      <rect x="17" y="27" width="2" height="3" rx="0.3" />
      <rect x="21" y="27" width="2" height="3" rx="0.3" />
      {/* Left pins */}
      <rect x="2" y="9" width="3" height="2" rx="0.3" />
      <rect x="2" y="13" width="3" height="2" rx="0.3" />
      <rect x="2" y="17" width="3" height="2" rx="0.3" />
      <rect x="2" y="21" width="3" height="2" rx="0.3" />
      {/* Right pins */}
      <rect x="27" y="9" width="3" height="2" rx="0.3" />
      <rect x="27" y="13" width="3" height="2" rx="0.3" />
      <rect x="27" y="17" width="3" height="2" rx="0.3" />
      <rect x="27" y="21" width="3" height="2" rx="0.3" />
    </svg>
  );
}
