import Image from "next/image";
export function TrainerPortrait({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`public-trainer-portrait relative isolate overflow-hidden ${className}`}
    >
      <Image
        src="/hero-desktop.png"
        alt="Nath Ramos, personal trainer"
        fill
        priority={priority}
        sizes="(max-width: 767px) 100vw, 48vw"
        className="object-cover"
        style={{ objectPosition: "83% center" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090b0c] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#090b0c] to-transparent" />
    </div>
  );
}
