type SeminarInfoProps = {
  title: string;
  date: string;
  topic: string;
  speakers?: string[] | string;
};

export default function SeminarInfo({
  title,
  date,
  topic,
  speakers = [],
}: SeminarInfoProps) {
  const speakerList = Array.isArray(speakers)
    ? speakers
    : speakers
      .split(',')
      .map((speaker) => speaker.trim())
      .filter(Boolean);

  const columns = Math.min(3, Math.max(1, speakerList.length));

  return (
    <section className="flex min-h-[70vh] flex-col px-8 py-6">
      {/* 상단 */}
      <div className="text-center">
        <h1 className="!text-8xl !font-extrabold leading-[0.95] tracking-tight !border-none">
          {title}
        </h1>

        <h2 className="mt-4 !text-5xl !border-none">
          {topic}
        </h2>

        <h3 className="mt-6 text-3xl !font-bold">
          {date}
        </h3>
      </div>

      {/* 하단 발표자 */}
      <div className="mt-auto">
        <h3 className="mb-1 text-xl !font-bold">
          발표자
        </h3>

        <div className="flex gap-5">
          {speakerList.map((speaker) => (
            <div key={speaker}>
              <h4 className="!m-0 !p-0 !text-3xl !font-normal !leading-none">
                {speaker}
              </h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}