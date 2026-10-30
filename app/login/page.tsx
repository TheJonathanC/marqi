import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  denied: "That GitHub account isn't on the guest list.",
  state: "The sign-in link expired. Try again.",
  github: "GitHub didn't answer. Try again in a moment.",
  config: "Sign-in isn't configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="login">
      <div className="login-card">
        <div className="marquee">MARQI</div>
        <p>Your private picture palace for Prime Video, JioHotstar and Apple TV.</p>
        <Suspense fallback={<SignIn />}>
          <SignInWithParams searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignInWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return <SignIn next={next} error={error} />;
}

function SignIn({ next, error }: { next?: string; error?: string }) {
  const href = next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login";
  return (
    <>
      {error && <p className="error">{error}</p>}
      <a href={href} className="ticket">
        <span className="ticket-main">
          <small>Admit one</small>
          Sign in with GitHub
        </span>
        <span className="ticket-stub">Enter</span>
      </a>
    </>
  );
}
