import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Explore articles on web development, programming tutorials, technology insights, and software engineering best practices.',
  openGraph: {
    title: 'Blog | Anas Al-Merstani',
    description: 'Explore articles on web development, programming tutorials, technology insights, and software engineering best practices.',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


