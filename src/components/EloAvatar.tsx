import avatar from "@/assets/elo-ia-avatar.png.asset.json";

/** Avatar oficial da Elo IA (pixel art) — usado em todo lugar que exibe a assistente. */
export function EloAvatar({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src={avatar.url}
      alt="Elo IA"
      className={`${className} rounded-full ring-1 ring-brand/30 object-cover shrink-0 [image-rendering:pixelated]`}
    />
  );
}
