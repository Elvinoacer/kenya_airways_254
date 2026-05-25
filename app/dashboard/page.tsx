import { redirect } from 'next/navigation';
import { getProfileInfo } from '../actions/auth-actions';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const profileInfo = await getProfileInfo();

  if (!profileInfo) {
    redirect('/login');
  }

  // Cast because SQLite types are 1/0 for booleans, getProfileInfo already maps user boolean fields but let's double check.
  // The object returned by getProfileInfo is already structured and converted for client consumption.
  return <DashboardClient initialData={profileInfo as any} />;
}
