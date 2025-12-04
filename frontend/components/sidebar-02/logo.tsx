import Image from "next/image";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export const Logo = ({ collapsed, className }: LogoProps) => {
  if (collapsed) {
    return (
      <Image
        src="/sam-head-logo.png"
        alt="Samurai Insurance"
        width={40}
        height={40}
        className={className}
      />
    );
  }

  return (
    <Image
      src="/samurai-insurance-logo.png"
      alt="Samurai Insurance"
      width={160}
      height={40}
      className={className}
    />
  );
};
