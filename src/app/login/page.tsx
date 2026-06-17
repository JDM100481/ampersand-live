import { signInWithPassword } from '@/lib/actions';
import { isSupabaseConfigured } from '@/lib/env';
import { Card, SubmitButton } from '@/components/ui';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return <main className="flex min-h-screen items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-bold">Ampersand LIVE Admin Console</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in with Supabase Auth credentials.</p>
      {!isSupabaseConfigured() && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Supabase env vars are not configured yet. Add them to enable login.</p>}
      {searchParams.error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{searchParams.error}</p>}
      <form action={signInWithPassword} className="mt-6 space-y-4">
        <div><label>Email</label><input name="email" required type="email" /></div>
        <div><label>Password</label><input name="password" required type="password" /></div>
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </Card>
  </main>;
}
