import Link from 'next/link';

export default function HowToAnalyzeYourBettingHistory() {
  return (
    <>
      <p>
        You know your record. Maybe you even know your win percentage. But if that&apos;s all
        you&apos;re looking at, you&apos;re flying blind, and it&apos;s costing you real money.
      </p>

      <p>
        Most sports bettors track exactly one thing: wins and losses. Maybe they glance at their
        sportsbook balance every couple of weeks. A few keep a spreadsheet. But almost nobody digs
        into the behavioral data that actually explains <em>why</em> their bankroll is moving in a
        given direction. And that gap (between what bettors track and what they should track) is
        where hundreds or thousands of dollars disappear every month.
      </p>

      <p>
        If you want to <strong>analyze your betting history</strong> in a way that actually changes
        your results, you need to go far beyond win/loss record. This guide walks you through exactly
        how to do that: which metrics matter, how to spot the patterns that are costing you, and how
        to turn raw data into actionable behavioral insight.
      </p>

      <h2>Why Win/Loss Record Is Nearly Useless</h2>

      <p>
        Let&apos;s say you went 55-45 last month. That&apos;s a 55% win rate. Sounds good, right?
        You&apos;re beating the 52.4% breakeven threshold at -110 odds.
      </p>

      <p>
        Except here&apos;s the problem: <strong>win rate tells you nothing about profitability</strong>.
        You could go 55-45 and still lose $1,200 if your 45 losses came on $200 stakes and your 55
        wins came on $50 stakes. You could go 45-55 and be up $3,000 if the sizing worked in reverse.
      </p>

      <p>
        Win/loss record flattens every bet into a binary outcome and strips away the context that
        actually matters: how much you risked, when you risked it, why you risked it, and what your
        emotional state was at the time. A bettor who goes 52% on disciplined, flat-sized straight
        bets is in an entirely different universe from a bettor who goes 52% while wildly varying
        their stakes based on gut feel, chasing losses with parlays, and doubling down on primetime
        games.
      </p>

      <p>
        Same win rate. Completely different outcomes. That&apos;s why we need better metrics.
      </p>

      <h2>The 5 Metrics That Actually Matter</h2>

      <p>
        These are the five numbers that separate bettors who understand their performance from
        bettors who are just guessing. Track all five, and you&apos;ll have a clearer picture of
        your betting behavior than 99% of recreational bettors.
      </p>

      <h3>1. ROI by Sport</h3>

      <p>
        Your overall ROI is a blended number that hides critical information. Most bettors are
        profitable in one or two sports and hemorrhaging money in the rest, but they never see it
        because they&apos;re looking at the aggregate.
      </p>

      <p>
        Here&apos;s a real example. A bettor comes in with an overall ROI of -8%. Looks like a
        consistent loser across the board. But when you break it down by sport:
      </p>

      <ul>
        <li><strong>NFL:</strong> +4.2% ROI on 120 bets ($2,016 profit)</li>
        <li><strong>NBA:</strong> -2.1% ROI on 85 bets ($714 loss)</li>
        <li><strong>MLB:</strong> -22.4% ROI on 95 bets ($4,256 loss)</li>
        <li><strong>NHL:</strong> -11.7% ROI on 40 bets ($936 loss)</li>
      </ul>

      <p>
        This bettor is actually a profitable NFL bettor. Their problem isn&apos;t betting. It&apos;s
        betting on sports where they have no edge. Cut the MLB and NHL bets entirely and their
        overall ROI flips positive. That insight is invisible if you only look at the aggregate number.
      </p>

      <p>
        <strong>How to calculate it:</strong> For each sport, sum all profits and losses, then divide
        by total amount risked. (Total P/L / Total Risked) x 100 = ROI%. Do this monthly and
        quarterly to spot trends.
      </p>

      <h3>2. Loss Chase Ratio</h3>

      <p>
        This is the single most revealing behavioral metric in sports betting, and almost nobody
        tracks it. Your loss chase ratio measures <strong>how much your stake increases after a
        loss compared to after a win</strong>.
      </p>

      <p>
        Here&apos;s how it works. Look at every bet you placed immediately after a losing bet. What
        was the average stake? Now look at every bet you placed immediately after a winning bet. What
        was the average stake? Divide the post-loss average by the post-win average.
      </p>

      <p>
        A ratio of 1.0 means you bet the same amount regardless of your last result. Perfect
        discipline. Most recreational bettors land between <strong>1.3 and 1.8</strong>, meaning
        they increase their stakes 30-80% after losses. Anything above 1.5 is a serious red flag.
      </p>

      <p>
        We&apos;ve seen bettors with loss chase ratios above 2.5, literally betting more than
        double after a loss. One bettor had a 58% win rate and still lost $4,700 over three months
        because his post-loss stakes averaged $340 versus $120 post-win. His wins were small and his
        losses were catastrophic.
      </p>

      <p>
        If you want to understand why your bankroll isn&apos;t growing despite decent picks, this
        number will likely tell you. We explored the neuroscience behind this pattern in{' '}
        <Link href="/blog/psychology-of-loss-chasing">The Psychology of Loss Chasing</Link>.
      </p>

      <h3>3. Bet Sizing Consistency</h3>

      <p>
        Beyond loss chasing, look at the overall distribution of your bet sizes. Calculate the{' '}
        <strong>standard deviation of your stakes</strong> and compare it to your average stake. A
        coefficient of variation (standard deviation divided by mean) above 0.5 suggests your sizing
        is driven by emotion rather than strategy.
      </p>

      <p>
        Here&apos;s what this looks like in practice. Bettor A averages $100 per bet with a standard
        deviation of $25. Their coefficient of variation is 0.25, tight, disciplined sizing. Bettor
        B also averages $100 per bet, but with a standard deviation of $120. Their CoV is 1.2,
        meaning they&apos;re bouncing between $10 bets and $500 bets with no consistent logic.
      </p>

      <p>
        Bettor B is almost certainly sizing based on how they feel about a game, not how much edge
        they have. Primetime games get the big bets. Tuesday unders get the small ones. The problem?{' '}
        <strong>Emotional conviction and actual edge are almost perfectly uncorrelated</strong> for
        recreational bettors.
      </p>

      <h3>4. Time-of-Day Patterns</h3>

      <p>
        This is the metric that surprises people the most. Group your bets by the hour they were
        placed and calculate ROI for each time window. You&apos;ll almost certainly find a pattern,
        and it probably looks something like this:
      </p>

      <ul>
        <li><strong>Morning (6am-12pm):</strong> +3.1% ROI. Bets placed with a clear head, often researched</li>
        <li><strong>Afternoon (12pm-6pm):</strong> +0.8% ROI. Neutral, moderate performance</li>
        <li><strong>Evening (6pm-10pm):</strong> -4.2% ROI. Primetime bias kicks in, larger stakes</li>
        <li><strong>Late night (10pm-2am):</strong> -18.6% ROI. Impulsive bets, often post-loss, often after drinking</li>
      </ul>

      <p>
        Those late-night bets are bankroll killers. They&apos;re placed when impulse control is
        lowest, emotional reactivity is highest, and the games available are often in leagues or
        markets the bettor doesn&apos;t follow closely. A bettor losing $400 a month might find that{' '}
        <strong>$350 of it comes from bets placed after 10pm</strong>.
      </p>

      <p>
        The fix is absurdly simple (stop betting after a certain hour) but you can&apos;t implement
        it if you never analyze the data in the first place.
      </p>

      <h3>5. Parlay vs. Straight Bet ROI</h3>

      <p>
        Separate your bets into two buckets: straight bets (singles) and parlays (including same-game
        parlays, teasers, and any multi-leg wagers). Calculate ROI for each.
      </p>

      <p>
        In nearly every dataset we&apos;ve analyzed, the gap is staggering. The typical recreational
        bettor shows something like:
      </p>

      <ul>
        <li><strong>Straight bet ROI:</strong> -3% to +2% (close to breakeven, sometimes profitable)</li>
        <li><strong>Parlay ROI:</strong> -25% to -45% (catastrophic)</li>
      </ul>

      <p>
        A bettor might have 200 straight bets at -1.5% ROI and 80 parlays at -32% ROI. The straight
        bets cost them $450. The parlays cost them $5,120. <strong>The parlays are doing 10x the
        damage despite being less than a third of the volume.</strong>
      </p>

      <p>
        For the full breakdown of why parlays destroy bankrolls, read our analysis:{' '}
        <Link href="/blog/parlay-addiction-the-real-math">The Real Math Behind Parlay Addiction</Link>.
      </p>

      <h2>Spotting Emotional Betting Patterns in Your Data</h2>

      <p>
        Beyond the five metrics above, there are behavioral signatures hidden in your betting history
        that reveal emotional decision-making. Here&apos;s what to look for.
      </p>

      <h3>The Revenge Bet Cluster</h3>

      <p>
        Look for sequences where you placed 3 or more bets within 30 minutes of a loss. These
        clusters are almost always revenge bets: rapid-fire wagers placed to &quot;get back to
        even&quot; while your brain is flooded with frustration. They tend to be poorly researched,
        oversized, and heavily skewed toward parlays (because you need a big payout to recover
        quickly).
      </p>

      <p>
        One pattern we see repeatedly: a bettor loses a $150 straight bet, then within 20 minutes
        places a $50 four-leg parlay. The parlay feels like a cheap shot at recovery (just $50!)
        but the expected value is abysmal. Over time, these revenge clusters can account for{' '}
        <strong>20-40% of total losses</strong> despite being a small fraction of total bets.
      </p>

      <h3>The Weekend Escalation</h3>

      <p>
        Compare your average stake Monday through Thursday versus Friday through Sunday. If the
        weekend average is more than 50% higher, you have a weekend escalation pattern. This is
        driven by increased emotional engagement (more games, social pressure, alcohol) and it
        systematically puts your biggest bets in the most emotionally compromised windows.
      </p>

      <h3>The Favorite Bias Signature</h3>

      <p>
        Tag each of your bets as favorite or underdog. Most recreational bettors lean heavily toward
        favorites, often 65-75% of their bets. The problem is that favorites are the most
        efficiently priced lines on the board because the public hammers them, which means the value
        tends to sit on the other side. A strong favorite bias doesn&apos;t guarantee losses, but it
        does mean you&apos;re consistently paying a premium.
      </p>

      <p>
        For a deeper dive into this and six other cognitive traps, see{' '}
        <Link href="/blog/cognitive-biases-destroying-your-bankroll">7 Cognitive Biases
        Destroying Your Bankroll</Link>.
      </p>

      <h2>Step-by-Step: Analyzing Your Own Betting History</h2>

      <p>
        Ready to actually do this? Here&apos;s the process, broken down into four steps.
      </p>

      <h3>Step 1: Export Your Data</h3>

      <p>
        Most major sportsbooks let you export your bet history, though they don&apos;t make it
        obvious. Here&apos;s where to find it on the major platforms:
      </p>

      <ul>
        <li><strong>DraftKings:</strong> Account &gt; My Bets &gt; Settled &gt; Download</li>
        <li><strong>FanDuel:</strong> Account &gt; Activity &gt; Transactions &gt; Export</li>
        <li><strong>BetMGM:</strong> My Bets &gt; History &gt; Download CSV</li>
        <li><strong>Caesars:</strong> Account &gt; Betting History &gt; Export</li>
      </ul>

      <p>
        If your book doesn&apos;t offer a direct export, you can usually copy and paste from the
        settled bets page into a spreadsheet. Tedious but doable. Go back at least 3 months. 6
        months is better. You need enough data for patterns to emerge.
      </p>

      <h3>Step 2: Organize Your Spreadsheet</h3>

      <p>
        Your export will probably be messy. Clean it up into these columns:
      </p>

      <ol>
        <li><strong>Date and time placed</strong> (not the game time, when you placed the bet)</li>
        <li><strong>Sport and league</strong></li>
        <li><strong>Bet type</strong> (straight, parlay, teaser, prop)</li>
        <li><strong>Odds</strong></li>
        <li><strong>Stake</strong></li>
        <li><strong>Result</strong> (W/L/Push)</li>
        <li><strong>Profit/Loss</strong></li>
        <li><strong>Running balance</strong></li>
      </ol>

      <p>
        If you can, add a column for the previous bet&apos;s result (W or L). This is what allows
        you to calculate loss chase ratio. You can do this with a simple formula that references the
        row above.
      </p>

      <h3>Step 3: Run the Numbers</h3>

      <p>
        With your data organized, calculate each of the five key metrics described above. For each
        one, write down the number and what it tells you. Be honest with yourself. This only works
        if you don&apos;t flinch from bad numbers.
      </p>

      <p>
        Here&apos;s a sample output from a real analysis (numbers anonymized):
      </p>

      <ul>
        <li>Overall ROI: -6.8%</li>
        <li>NFL ROI: +3.1% | NBA ROI: -4.2% | Parlays ROI: -34.7%</li>
        <li>Loss chase ratio: 1.62 (stakes jump 62% after losses)</li>
        <li>Bet sizing CoV: 0.89 (wildly inconsistent)</li>
        <li>Late night ROI (10pm+): -22.3%</li>
        <li>Favorite bet percentage: 71%</li>
      </ul>

      <p>
        This bettor&apos;s diagnosis is clear: cut parlays, cut late-night bets, cut NHL and NBA,
        and implement flat staking. Those four changes alone would likely flip their overall ROI
        positive without changing a single pick.
      </p>

      <h3>Step 4: Identify Your Top 3 Leaks</h3>

      <p>
        You&apos;ll find multiple issues. Don&apos;t try to fix everything at once. Rank your leaks
        by dollar impact and focus on the top three. For most bettors, the top three leaks account
        for <strong>80-90% of total losses</strong>. Fix those and the math changes dramatically.
      </p>

      <p>
        Common high-impact leaks in order of frequency:
      </p>

      <ol>
        <li>Parlay overallocation (most common, highest dollar impact)</li>
        <li>Loss chasing / post-loss stake increases</li>
        <li>Late-night impulsive betting</li>
        <li>Betting sports with no edge</li>
        <li>Weekend emotional escalation</li>
      </ol>

      <h2>The Faster Way: Let the Data Do the Work</h2>

      <p>
        Everything above works. It&apos;s also tedious. The spreadsheet setup takes an hour. Running
        the formulas takes another hour. Interpreting the results requires knowing what to look for.
        Most bettors start the process and abandon it halfway through.
      </p>

      <p>
        That&apos;s exactly why we built BetAutopsy.{' '}
        <strong>Upload your bet history and get a complete behavioral analysis in about 20
        seconds</strong>: all five key metrics, emotional pattern detection, sport-by-sport
        breakdowns, time-of-day analysis, and a personalized action plan. No spreadsheets. No
        formulas. Just the diagnosis.
      </p>

      <p>
        But whether you do it manually or use a tool, the important thing is to do it at all. The
        bettors who analyze their history improve. The ones who don&apos;t keep repeating the same
        expensive patterns.
      </p>

      <hr />

      <h2>The Bottom Line</h2>

      <p>
        Your betting history is a goldmine of behavioral data, if you know how to read it.
        This is the foundation of{' '}
        <Link href="/blog/what-is-behavioral-betting-analysis" className="text-scalpel hover:underline">
          behavioral betting analysis
        </Link>{' '}
        , looking beyond win/loss records to the patterns underneath.
        Below the surface are patterns of loss chasing, emotional sizing,
        time-based impulsivity, and sport-specific leaks that explain exactly where your money is
        going and why.
      </p>

      <p>
        The five metrics in this guide (ROI by sport, loss chase ratio, bet sizing consistency,
        time-of-day patterns, and parlay vs. straight bet ROI) will give you a clearer picture of
        your betting behavior than years of gut-feel self-assessment.
      </p>

      <p>
        If you recognized yourself in the patterns described above, you&apos;re not alone. We
        covered the deeper psychology behind these tendencies in{' '}
        <Link href="/blog/why-am-i-losing-at-sports-betting">Why Am I Losing at Sports
        Betting?</Link>. It&apos;s the companion piece to this guide.
      </p>

      <p>
        <strong>Stop looking at your record. Start analyzing your behavior.</strong> That&apos;s
        where the money is.
      </p>
    </>
  );
}
