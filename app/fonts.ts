import localFont from 'next/font/local';

export const inter = localFont({
  src: '../public/fonts/InterVariable.ttf',
  variable: '--font-inter',
  display: 'swap',
  weight: '300 900',
});

export const jetbrainsMono = localFont({
  src: [
    {
      path: '../public/fonts/JetBrainsMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/JetBrainsMono-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/JetBrainsMono-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/JetBrainsMono-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
});
