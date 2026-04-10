import localFont from 'next/font/local';

export const jakarta = localFont({
  src: '../public/fonts/PlusJakartaSans-VariableFont_wght.ttf',
  variable: '--font-jakarta',
  display: 'swap',
  weight: '400 800',
});

export const ibmPlexMono = localFont({
  src: [
    {
      path: '../public/fonts/IBMPlexMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/IBMPlexMono-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
});
