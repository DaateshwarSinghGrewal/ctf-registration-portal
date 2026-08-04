import GradientText from './GradientText.jsx'

/**
 * The recurring section-heading pattern identified in the Figma audit:
 * a small amber eyebrow line, a large serif display title with an
 * optional gradient-accented word, and an optional supporting paragraph.
 * Used across "What is a CTF", "About the Game", "Demo Video", and
 * "Get in Touch".
 */
export default function SectionHeading({
  eyebrow,
  title,
  accentWord,
  accentVariant = 'crystal',
  description,
  align = 'left',
  id
}) {
  const alignmentClass = align === 'center' ? 'items-center text-center' : 'items-start text-left'

  return (
    <div className={`flex flex-col gap-6 ${alignmentClass}`} id={id}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}

      <h2 className="font-heading text-5xl leading-tight text-white sm:text-6xl">
        {title}{' '}
        {accentWord ? (
          <GradientText variant={accentVariant} as="span">
            {accentWord}
          </GradientText>
        ) : null}
      </h2>

      {description ? (
        <p className="max-w-2xl font-body text-xl leading-relaxed text-neutral-body sm:text-2xl">
          {description}
        </p>
      ) : null}
    </div>
  )
}