export default function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 002.7 2.7" />
        <path d="M9.9 4.2A10.4 10.4 0 0112 4c5.5 0 9 5 9 5a15.6 15.6 0 01-2.1 2.6" />
        <path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a9.8 9.8 0 004-.8" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}
