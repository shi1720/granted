"use client";
import Link from "next/link";
export default function ErrorPage({reset}:{reset:()=>void}) { return <main className="mx-auto max-w-xl px-5 py-24"><h1 className="font-display text-4xl text-pine-950">Let&apos;s try that again</h1><p className="my-5 text-ink-soft">This view could not load. Your saved work is still in this browser.</p><button onClick={reset} className="btn-primary">Try again</button><Link href="/" className="btn-secondary ml-3">Home</Link></main>; }
