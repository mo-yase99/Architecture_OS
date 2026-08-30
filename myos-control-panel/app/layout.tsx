import './globals.css';

export const metadata = { title: 'MYOS Control Panel', description: 'Mohamed Yasser Personal Operating System' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" dir="ltr"><body>{children}</body></html>;
}
