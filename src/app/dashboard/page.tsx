import { redirect } from 'next/navigation';

// Customer account management lives in the mobile app. The web workspace is for staff.
export default function DashboardRedirect() {
  redirect('/admin');
}
