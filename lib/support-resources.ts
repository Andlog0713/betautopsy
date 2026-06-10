import type { SupportResource } from '@/types';

export const SUPPORT_PAGE_PATH = '/support';

export const PROBLEM_GAMBLING_HELPLINE = '1-800-MY-RESET';
export const PROBLEM_GAMBLING_HELPLINE_TEL = '18006973738';
export const PROBLEM_GAMBLING_CHAT_URL = 'https://www.ncpgambling.org/chat/';
export const PROBLEM_GAMBLING_HELP_BY_STATE_URL = 'https://www.ncpgambling.org/help-treatment/help-by-state/';
export const PROBLEM_GAMBLING_HOME_URL = 'https://www.ncpgambling.org/';

export const CRISIS_LIFELINE = '988';
export const CRISIS_LIFELINE_URL = 'https://988lifeline.org/';

export const RESPONSIBLE_GAMBLING_DISCLAIMER = `If you or someone you know may have a gambling problem, call or text ${PROBLEM_GAMBLING_HELPLINE}.`;
export const CRISIS_SUPPORT_DISCLAIMER = `If this feels urgent or unsafe, call or text ${CRISIS_LIFELINE} right now.`;

// Deterministic support footer appended server-side (never LLM-generated) to
// AI responses while a user is in Recovery Mode, so it cannot be jailbroken
// away by adversarial prompting. Plain text; safe to concatenate to any answer.
export const RECOVERY_SUPPORT_FOOTER = `\n\nRECOVERY MODE\nYou have Recovery Mode on. The control rules and cooldowns in your plan take priority over any single result. ${RESPONSIBLE_GAMBLING_DISCLAIMER} Free and confidential, 24/7. ${CRISIS_SUPPORT_DISCLAIMER}`;

export const SUPPORT_RESOURCES: SupportResource[] = [
  {
    label: 'National Problem Gambling Helpline',
    value: `Call or text ${PROBLEM_GAMBLING_HELPLINE}. Free and confidential, 24/7.`,
    href: `tel:${PROBLEM_GAMBLING_HELPLINE_TEL}`,
  },
  {
    label: 'Problem gambling chat',
    value: 'Start a confidential live chat through the National Council on Problem Gambling.',
    href: PROBLEM_GAMBLING_CHAT_URL,
  },
  {
    label: 'Help by state',
    value: 'Find local treatment, counseling, and peer-support options in your state.',
    href: PROBLEM_GAMBLING_HELP_BY_STATE_URL,
  },
  {
    label: '988 Suicide and Crisis Lifeline',
    value: `If this feels like a crisis or you need immediate emotional support, call or text ${CRISIS_LIFELINE}.`,
    href: CRISIS_LIFELINE_URL,
  },
];
