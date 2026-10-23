import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="empty-state">
      <h1>Page not found</h1>
      <Link href="/">Return to SPECTRE</Link>
    </main>
  );
}
