import avatar from "@/assets/elo-ia-avatar.png.asset.json";

/** Avatar oficial da Elo IA (pixel art) — usado em todo lugar que exibe a assistente. */
export function EloAvatar({ className = "size-12" }: { className?: string }) {
  return (
    <div
      className={`${className} relative rounded-full ring-2 ring-pink-300/70 bg-pink-100 shadow-md grid place-items-center shrink-0 overflow-hidden`}
    >
      <img
        src={avatar.url}
        alt="Elo IA"
        className="absolute inset-0 size-full object-cover object-center"
      />
    </div>
  );
}