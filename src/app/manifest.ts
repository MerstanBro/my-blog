import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Anas Al-Merstani - Portfolio & Blog',
    short_name: 'Anas Al-Merstani',
    description: 'Full-stack developer sharing insights on web development, programming, and technology.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#fbbf24',
    icons: [
      {
        src: '/square.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}


