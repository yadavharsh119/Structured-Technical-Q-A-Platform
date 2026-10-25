interface Props {
  kicker: string;
  title: string;
  id?: string;
}

export function SectionHeading({ kicker, title, id }: Props) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-muted">{kicker}</p>
      {id ? (
        <h2
          id={id}
          className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
        >
          {title}
        </h2>
      ) : (
        <h2 className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
          {title}
        </h2>
      )}
    </div>
  );
}
