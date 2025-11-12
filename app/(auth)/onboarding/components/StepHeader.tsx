export function StepHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-3">{title}</h1>
      <p className="text-text-secondary mb-6 leading-relaxed">{description}</p>
    </>
  );
}
