import { chatGPTSignInPath, getChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { authConfigured, getAuth0 } from "../../lib/auth0";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo = "/dashboard" } = await searchParams;
  const user = await getChatGPTUser();
  if (user) redirect("/dashboard");
  const configured = authConfigured();
  const session = configured ? await getAuth0()!.getSession() : null;
  return <main className="grid min-h-screen place-items-center bg-[#071d33] px-5 py-12 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl">
      <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#2f6fed] font-black">PT</div>
      <p className="text-sm font-semibold uppercase tracking-[.16em] text-[#76a9ff]">Project Tracker</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Track delivery with clarity</h1>
      <p className="mt-3 leading-7 text-slate-300">Projects, tickets, ownership and delivery dates in one place.</p>
      {!configured ? <div role="status" className="mt-7 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6"><strong>Sign-in setup is pending.</strong><p>The portal is installed. Your administrator needs to connect the identity provider before accounts and projects become available.</p></div>
      : session ? <div className="mt-7 text-sm leading-6"><p>Verify your email address, then sign out and sign in again to refresh your account.</p><a className="mt-4 block underline" href={chatGPTSignOutPath()}>Sign out</a></div>
      : <><a href={chatGPTSignInPath(returnTo)} className="mt-7 block rounded-xl bg-white px-4 py-3 text-center font-bold text-[#0d3b66]">Log in</a><a href={`${chatGPTSignInPath("/profile")}&screen_hint=signup`} className="mt-3 block rounded-xl border border-white/20 px-4 py-3 text-center font-bold">Sign up and create profile</a><p className="mt-5 text-center text-xs leading-5 text-slate-400">Sign-in is handled securely by the identity provider. Verify your email to access the portal.</p></>}
    </section>
  </main>;
}
