'use client';

const logos = [
  { src: '/logo/DraftKings_id2MME-tA5_0.svg', alt: 'DraftKings', height: 18 },
  { src: '/logo/FanDuel_idG0G3cidS_0.svg', alt: 'FanDuel', height: 16 },
  { src: '/logo/BetMGM (1).svg', alt: 'BetMGM', height: 18 },
  { src: '/logo/Fanatics_idtnXwyo0R_0.svg', alt: 'Fanatics', height: 16 },
  { src: '/logo/Bet365_Logo_0.svg', alt: 'bet365', height: 16 },
  { src: '/logo/thescore.svg', alt: 'theScore', height: 16 },
  { src: '/logo/PrizePicks.svg', alt: 'PrizePicks', height: 16 },
  { src: '/logo/Underdog_idVMdZev2I_1.svg', alt: 'Underdog Fantasy', height: 22 },
  { src: '/logo/Pikkit_idQrBjcYGI_1.svg', alt: 'Pikkit', height: 16 },
  { src: '/logo/kalshi-logo.svg', alt: 'Kalshi', height: 18 },
  { src: '/logo/Hard_Rock_Bet.svg', alt: 'Hard Rock Bet', height: 22 },
  { src: '/logo/caesars-sportsbook-seeklogo-2.svg', alt: 'Caesars Sportsbook', height: 20 },
];

export default function LogoScroll() {
  // Render the logo set 4 times for seamless loop
  const allLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <>
      <style>{`
        @keyframes logo-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-track {
          display: flex;
          align-items: center;
          animation: logo-scroll 35s linear infinite;
          width: max-content;
          gap: 48px;
        }
        @media (max-width: 640px) {
          .logo-track {
            animation-duration: 35s;
            gap: 32px;
          }
        }
        .logo-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="logo-track">
        {allLogos.map((logo, i) => (
          <img
            key={`${logo.alt}-${i}`}
            src={logo.src}
            alt={logo.alt}
            style={{
              height: logo.height,
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.5,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </>
  );
}
