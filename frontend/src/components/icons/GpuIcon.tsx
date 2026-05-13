export default function GpuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -2 32 30"
      fill="currentColor"
      width="40"
      height="40"
    >
      {/* GPU card body */}
      <rect x="3" y="5" width="29" height="14" rx="2" />
      {/* Fan 1 - outer ring */}
      <circle
        cx="8"
        cy="12"
        r="4"
        fill="none"
        stroke="var(--mui-palette-background-paper)"
        strokeWidth="1.4"
      />
      {/* Fan 2 - outer ring */}
      <circle
        cx="17.5"
        cy="12"
        r="4"
        fill="none"
        stroke="var(--mui-palette-background-paper)"
        strokeWidth="1.4"
      />
      {/* Fan 3 - outer ring */}
      <circle
        cx="27"
        cy="12"
        r="4"
        fill="none"
        stroke="var(--mui-palette-background-paper)"
        strokeWidth="1.4"
      />
      {/* Metal bracket on left side */}
      <rect x="0" y="6" width="2" height="1" fill="currentColor" />
      <rect x="2" y="6" width="1" height="15" fill="currentColor" />
      {/* PCIe connector at bottom */}
      <rect x="7" y="19" width="11" height="2" fill="currentColor" />
      {/* Gold fingers on PCIe */}
      <rect
        x="8"
        y="19"
        width="1"
        height="2"
        fill="var(--mui-palette-background-paper)"
        opacity="0.7"
      />
      <rect
        x="10"
        y="19"
        width="1"
        height="2"
        fill="var(--mui-palette-background-paper)"
        opacity="0.7"
      />
      <rect
        x="12"
        y="19"
        width="1"
        height="2"
        fill="var(--mui-palette-background-paper)"
        opacity="0.7"
      />
      <rect
        x="14"
        y="19"
        width="1"
        height="2"
        fill="var(--mui-palette-background-paper)"
        opacity="0.7"
      />
      <rect
        x="16"
        y="19"
        width="1"
        height="2"
        fill="var(--mui-palette-background-paper)"
        opacity="0.7"
      />
    </svg>
  );
}
