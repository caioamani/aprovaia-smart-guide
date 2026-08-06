import avatar from "@/assets/elo-ia-avatar.png.asset.json";

/** Avatar oficial da Elo IA (pixel art) — usado em todo lugar que exibe a assistente. */
export function EloAvatar({ className = "size-8" }: { className?: string }) {
  return (
    <div
      className={`${className} relative rounded-full ring-1 ring-brand/30 bg-brand/10 grid place-items-center shrink-0 overflow-hidden`}
    >
      <img
        src={avatar.url}
        alt="Elo IA"
        className="absolute inset-0 size-full object-cover [image-rendering:pixelated]"
      />
    </div>
  );
}
