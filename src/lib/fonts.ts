import { Instrument_Sans } from 'next/font/google';

/** Site-wide UI type. Demo surfaces opt out with `font-system`. */
export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
