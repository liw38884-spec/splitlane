import Image from "next/image";
import Link from "next/link";

export function ProgramHeader() {
  return (
    <header className="program-topbar">
      <Link className="brand-lockup program-brand" href="/">
        <Image src="/splitlane-mark.png" alt="" width={34} height={34} priority />
        <span>SplitLane</span>
      </Link>
      <nav className="program-nav" aria-label="Program navigation">
        <Link href="/">Settlement app</Link>
        <Link href="/programs">Programs</Link>
      </nav>
    </header>
  );
}
