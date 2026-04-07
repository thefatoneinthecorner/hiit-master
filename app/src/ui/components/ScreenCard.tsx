type ScreenCardProps = {
  title: string;
  description: string;
  items?: readonly string[];
};

export function ScreenCard({ title, description, items = [] }: ScreenCardProps) {
  return (
    <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
      <h2 class="font-display text-3xl">{title}</h2>
      <p class="mt-3 max-w-prose text-sm leading-6 text-app-muted">{description}</p>
      {items.length > 0 ? (
        <ul class="mt-6 space-y-3 text-sm leading-6">
          {items.map((item) => (
            <li key={item} class="rounded-2xl bg-app-canvas px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
