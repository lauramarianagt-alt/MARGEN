import { useId } from 'react'

export default function BrandLogo({ name, tagline }) {
  const textureId = `masthead-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg className="brand__lockup" viewBox="0 0 300 94" aria-hidden="true">
      <defs>
        <pattern
          id={textureId}
          patternUnits="userSpaceOnUse"
          width="300"
          height="70"
        >
          <image
            href="/images/margen-masthead.webp"
            width="300"
            height="70"
            preserveAspectRatio="xMidYMid slice"
          />
          <rect width="300" height="70" fill="#000" opacity="0.45" />
        </pattern>
      </defs>
      <text
        className="brand__wordmark"
        x="0"
        y="65"
        fontSize="74"
        fontWeight="800"
        textLength="300"
        lengthAdjust="spacingAndGlyphs"
        fill={`url(#${textureId})`}
      >
        {name}
      </text>
      <text
        className="brand__tagline"
        x="0"
        y="91"
        fontSize="11.5"
        textLength="300"
        lengthAdjust="spacing"
      >
        {tagline.toUpperCase().replace(/\.$/, '')}
      </text>
    </svg>
  )
}
