interface Props {
  text: string;
  done: boolean;
}

export default function StatusLine({ text, done }: Props) {
  return (
    <div className={`flex items-center gap-2 text-sm py-1 ${done ? 'text-[#444]' : 'text-[#6483F0]'}`}>
      {done ? (
        <span>✓</span>
      ) : (
        <div className="w-3 h-3 border-2 border-[#2a2a4e] border-t-[#6483F0] rounded-full animate-spin" />
      )}
      <span>{text}</span>
    </div>
  );
}
