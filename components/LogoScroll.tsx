'use client';

const logos = [
  { src: '/logo/DraftKings_id2MME-tA5_0.svg', alt: 'DraftKings', width: 90 },
  { src: '/logo/FanDuel_idG0G3cidS_0.svg', alt: 'FanDuel', width: 90 },
  { src: '/logo/BetMGM (1).svg', alt: 'BetMGM', width: 90 },
  { src: '/logo/Fanatics_idtnXwyo0R_0.svg', alt: 'Fanatics', width: 80 },
  { src: '/logo/Bet365_Logo_0.svg', alt: 'bet365', width: 70 },
  { src: '/logo/PrizePicks.svg', alt: 'PrizePicks', width: 90 },
  { src: '/logo/Underdog_idVMdZev2I_1.svg', alt: 'Underdog Fantasy', width: 28 },
  { src: '/logo/Pikkit_idQrBjcYGI_1.svg', alt: 'Pikkit', width: 70 },
  { src: '/logo/kalshi-logo.svg', alt: 'Kalshi', width: 60 },
  { src: '/logo/Hard_Rock_Bet.svg', alt: 'Hard Rock Bet', width: 95 },
  { src: '/logo/caesars-sportsbook-seeklogo-2.svg', alt: 'Caesars Sportsbook', width: 130 },
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
          animation: logo-scroll 80s linear infinite;
          width: max-content;
          gap: 48px;
        }
        @media (max-width: 640px) {
          .logo-track {
            animation-duration: 20s;
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
              width: logo.width,
              height: 'auto',
              maxHeight: 24,
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
