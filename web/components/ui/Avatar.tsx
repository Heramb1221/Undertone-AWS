import Image from "next/image";

/**
 * Renders a deterministic DiceBear avatar from an Anonymous Identity seed.
 * Same seed always produces the same avatar — no photo upload, ever.
 * See docs/Design.md section 5 and docs/Architecture.md section 8a.
 */
export function Avatar({
  seed,
  size = 40,
  style = "lorelei",
}: {
  seed: string;
  size?: number;
  style?: "lorelei" | "notionists";
}) {
  const src = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-full"
      style={{ background: "var(--bg-elevated)" }}
      unoptimized
    />
  );
}
