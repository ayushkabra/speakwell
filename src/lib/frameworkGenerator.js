export const FRAMEWORK_PRESETS = [
  {
    id: 'prep',
    icon: '📌',
    title: 'PREP Framework',
    subtitle: 'Point → Reason → Example → Point',
    bestFor: 'Impromptu Speech, Q&A, Opinions',
    hint: 'State your main point directly, back it up with a solid reason and real example, then wrap up cleanly.',
    steps: [
      {
        stepNum: 1,
        title: 'Point (State Your Core Thesis)',
        guide: 'State your key point or stance directly in 1–2 punchy sentences. (e.g. "I believe remote-first work produces higher quality output.")',
        suggestedSecs: 15,
      },
      {
        stepNum: 2,
        title: 'Reason (Why Do You Believe This?)',
        guide: 'Provide 1 or 2 strong reasons supporting your point. (e.g. "Because uninterrupted focus time reduces friction and allows deep work.")',
        suggestedSecs: 25,
      },
      {
        stepNum: 3,
        title: 'Example (Share a Concrete Story or Detail)',
        guide: 'Give a brief real-world example, project story, or data point. (e.g. "For instance, when our engineering team switched to async blocks, sprint delivery jumped 30%.")',
        suggestedSecs: 35,
      },
      {
        stepNum: 4,
        title: 'Point (Re-state Your Conclusion Takeaway)',
        guide: 'Re-state your core point with confidence to leave a memorable closing. (e.g. "That is why adopting flexible focus blocks will drive superior team execution.")',
        suggestedSecs: 15,
      },
    ],
  },
  {
    id: 'star',
    icon: '⭐',
    title: 'STAR Method',
    subtitle: 'Situation → Task → Action → Result',
    bestFor: 'Behavioral Interviews & Personal Stories',
    hint: 'Structure your past experiences so interviewers hear your leadership impact clearly.',
    steps: [
      {
        stepNum: 1,
        title: 'Situation (Set the Background)',
        guide: 'Set the context brief and clear. (e.g. "At my previous company, our main payment system crashed during Cyber Monday.")',
        suggestedSecs: 20,
      },
      {
        stepNum: 2,
        title: 'Task (Describe Your Specific Goal)',
        guide: 'Explain what needed to be solved and your responsibility. (e.g. "I was tasked with leading the emergency triage to restore service under 30 minutes.")',
        suggestedSecs: 15,
      },
      {
        stepNum: 3,
        title: 'Action (Detail What YOU Did)',
        guide: 'Focus on the specific actions YOU took to lead or execute. (e.g. "I isolated the DB lock, routed traffic to fallback nodes, and deployed a quick fix.")',
        suggestedSecs: 35,
      },
      {
        stepNum: 4,
        title: 'Result (Highlight the Positive Outcome)',
        guide: 'Quantify the final success and key lesson. (e.g. "System recovered in 18 minutes, saving $400k in transactions, and inspired our new failover policy.")',
        suggestedSecs: 20,
      },
    ],
  },
  {
    id: 'what_so_what',
    icon: '🎯',
    title: 'What? So What? Now What?',
    subtitle: 'Status → Impact → Next Action',
    bestFor: 'Executive Updates & Briefings',
    hint: 'Perfect for status updates, board meetings, and team alignment syncs.',
    steps: [
      {
        stepNum: 1,
        title: 'What? (State the Facts / Update)',
        guide: 'Summarize the core update or observation in 1 sentence. (e.g. "Our quarterly user retention dropped by 4% in Q2.")',
        suggestedSecs: 15,
      },
      {
        stepNum: 2,
        title: 'So What? (Why Does This Matter?)',
        guide: 'Explain the impact, implications, and underlying cause. (e.g. "This matters because drop-off is concentrated in onboarding step 3, reducing LTV.")',
        suggestedSecs: 25,
      },
      {
        stepNum: 3,
        title: 'Now What? (Propose Next Action Steps)',
        guide: 'State the exact next steps or solution you recommend. (e.g. "We are launching a 2-step simplified onboarding experiment starting next Tuesday.")',
        suggestedSecs: 20,
      },
    ],
  },
  {
    id: 'problem_solution',
    icon: '💡',
    title: 'Problem - Solution - Impact',
    subtitle: 'Pain Point → Solution → Measurable ROI',
    bestFor: 'Client Proposals, Sales & Product Pitches',
    hint: 'Hook your audience with a real problem before presenting your solution and ROI.',
    steps: [
      {
        stepNum: 1,
        title: 'The Problem (Identify the Real Pain)',
        guide: 'Highlight the frustration or inefficiency your audience faces. (e.g. "Teams waste 6 hours a week trying to manually format status reports.")',
        suggestedSecs: 20,
      },
      {
        stepNum: 2,
        title: 'Our Solution (Present the Fix)',
        guide: 'Introduce your product or proposal clearly. (e.g. "Speakwell automatically transforms raw speech into executive-ready status scripts in seconds.")',
        suggestedSecs: 25,
      },
      {
        stepNum: 3,
        title: 'The Impact (Show the Measurable Value)',
        guide: 'Conclude with quantifiable time saved or value gained. (e.g. "This recovers 250 hours a year per manager while keeping communication razor-sharp.")',
        suggestedSecs: 20,
      },
    ],
  },
];

export function getFrameworkById(id) {
  return FRAMEWORK_PRESETS.find((f) => f.id === id) || FRAMEWORK_PRESETS[0];
}
