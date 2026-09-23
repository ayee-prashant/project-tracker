"use client";
export function LoadError({message,retry}:{message:string;retry:()=>void}) {
  return <div role="alert" className="my-4 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800"><p>{message}</p><div className="mt-3 flex gap-4"><button type="button" className="font-semibold underline" onClick={retry}>Retry</button><a href="/auth/login?returnTo=%2Fdashboard" target="_top" className="font-semibold underline">Sign in again</a></div></div>;
}
