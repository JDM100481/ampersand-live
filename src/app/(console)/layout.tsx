import { AppShell } from '@/components/app-shell';
import { getSessionUser } from '@/lib/supabase-data';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <AppShell userEmail={user?.email}>{children}</AppShell>;
}
