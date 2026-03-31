interface Page {
  title: string;
  url: string;
  description: string;
}

interface Props {
  pages: Page[];
}

export default function Sources({ pages }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {pages.map((p, i) => (
        <a
          key={i}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-md bg-[#0f0f1a] border border-[#1a1a2e] text-[#6483F0] no-underline transition-all hover:bg-[#1a1a2e] hover:border-[#6483F0]"
        >
          {p.title}
        </a>
      ))}
    </div>
  );
}
