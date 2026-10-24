import { redirect } from 'next/navigation';

// No marketing landing page: visitors go straight to the admin dashboard login.
// Signed-in staff are sent to /admin by src/proxy.ts before this renders.
export default function Home() {
  redirect('/login');
}
