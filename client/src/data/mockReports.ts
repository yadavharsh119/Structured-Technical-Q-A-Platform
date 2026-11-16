// MOCK DATA: replace with API later
import type { ReportReason } from '@structured-qa/shared';

export const REPORT_STATUSES = ['Open', 'Under Review', 'Resolved', 'Dismissed'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportContentType = 'Perspective' | 'Topic';

export interface ContentReport {
  id: string;
  contentType: ReportContentType;
  contentTitle: string;
  contentPreview: string;
  contentBody: string;
  contentAuthor: string;
  reason: ReportReason;
  reporterName: string;
  reportedDate: string;
  status: ReportStatus;
  reporterComments: string;
  autoFlagged: boolean;
  escalated: boolean;
  hidden: boolean;
}

export const INITIAL_REPORTS: ContentReport[] = [
  {
    id: 'r-1001',
    contentType: 'Perspective',
    contentTitle: 'Use a paid Discord community for architecture advice',
    contentPreview: 'Join my premium server for daily architecture tips and 1:1 mentoring…',
    contentBody:
      'Join my premium server for daily architecture tips and 1:1 mentoring. First 50 members get a discount. DM me for access and check out the affiliate links in my profile for the courses I recommend.',
    contentAuthor: 'growth_hacker_99',
    reason: 'Spam',
    reporterName: 'maya_chen',
    reportedDate: '2026-10-15',
    status: 'Open',
    reporterComments: 'Pure advertisement with affiliate links, no technical content.',
    autoFlagged: true,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1002',
    contentType: 'Perspective',
    contentTitle: 'JWT is always better than server-side sessions',
    contentPreview: 'Sessions are obsolete. JWT solves every scaling problem…',
    contentBody:
      'Proposed Solution: Sessions are obsolete. JWT solves every scaling problem and you should never store session state server-side.\n\nExplanation: Tokens are self-contained, so the server needs no storage at all and revocation is a non-issue.\n\nAdvantages: Stateless by definition.\n\nLimitations: None.',
    contentAuthor: 'token_fan',
    reason: 'Misleading/Incorrect',
    reporterName: 'jonas_weber',
    reportedDate: '2026-10-14',
    status: 'Open',
    reporterComments:
      'Claims revocation is a non-issue, which is the opposite of the accepted guidance on this topic.',
    autoFlagged: false,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1003',
    contentType: 'Topic',
    contentTitle: 'What is the best way to scale Node.js?',
    contentPreview: 'Duplicate of the existing "Caching Strategies for Read-Heavy APIs" topic…',
    contentBody:
      'What is the best way to scale Node.js? I want to know everything about scaling, clustering, and making it fast. Please answer with all the details you can think of.',
    contentAuthor: 'new_dev_2026',
    reason: 'Duplicate',
    reporterName: 'priya_nair',
    reportedDate: '2026-10-13',
    status: 'Open',
    reporterComments: 'Overlaps heavily with three existing topics and has no specific problem statement.',
    autoFlagged: false,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1004',
    contentType: 'Perspective',
    contentTitle: 'Zero-downtime migrations with expand and contract',
    contentPreview: 'Copied verbatim from the official PostgreSQL documentation…',
    contentBody:
      'Proposed Solution: Use the expand and contract pattern with online DDL operations.\n\nExplanation: This section reproduces several paragraphs from the official PostgreSQL documentation on table rewriting and lock levels without attribution.\n\nAdvantages: Avoids long locks.\n\nLimitations: Requires two deployments.',
    contentAuthor: 'copy_paste_dev',
    reason: 'Plagiarism',
    reporterName: 'david_kim',
    reportedDate: '2026-10-12',
    status: 'Under Review',
    reporterComments: 'Roughly half the explanation block matches the vendor documentation word for word.',
    autoFlagged: true,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1005',
    contentType: 'Topic',
    contentTitle: 'How do I get into someone else\'s network?',
    contentPreview: 'Asking how to access a network that does not belong to them…',
    contentBody:
      'How do I get into someone else\'s network without them knowing? I want to see what traffic they are sending and read their messages.',
    contentAuthor: 'anon_user_77',
    reason: 'Offensive/Abusive',
    reporterName: 'maya_chen',
    reportedDate: '2026-10-11',
    status: 'Open',
    reporterComments: 'Requests help with unauthorised access to a third party. Not a legitimate technical question.',
    autoFlagged: true,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1006',
    contentType: 'Perspective',
    contentTitle: 'Always use a message queue between services',
    contentPreview: 'Queues everywhere, even for two internal services…',
    contentBody:
      'Proposed Solution: Put a message queue between every pair of services, including internal ones.\n\nExplanation: Async messaging decouples everything and removes the need for synchronous error handling.\n\nAdvantages: Full decoupling.\n\nLimitations: Adds operational overhead.',
    contentAuthor: 'queue_everything',
    reason: 'Other',
    reporterName: 'jonas_weber',
    reportedDate: '2026-10-10',
    status: 'Open',
    reporterComments:
      'Not clearly spam or plagiarism, but the advice is presented as universal with no context on team size or traffic, which makes it likely to mislead junior readers.',
    autoFlagged: false,
    escalated: false,
    hidden: false,
  },
  {
    id: 'r-1007',
    contentType: 'Topic',
    contentTitle: 'React state management libraries compared',
    contentPreview: 'Topic title claimed a comparison but listed only one library…',
    contentBody:
      'React state management libraries compared: which one should you pick in 2026? This topic was published with a description covering a single library and no comparison criteria.',
    contentAuthor: 'react_guru',
    reason: 'Misleading/Incorrect',
    reporterName: 'priya_nair',
    reportedDate: '2026-10-06',
    status: 'Resolved',
    reporterComments: 'Title promises a comparison the body does not deliver.',
    autoFlagged: false,
    escalated: false,
    hidden: true,
  },
  {
    id: 'r-1008',
    contentType: 'Perspective',
    contentTitle: 'Microservices for a three person startup',
    contentPreview: 'Reported as a duplicate of an existing resilience perspective…',
    contentBody:
      'Proposed Solution: Split into microservices from day one so each team owns a service.\n\nExplanation: Independent deployment keeps velocity high even with a small team.\n\nAdvantages: Clear ownership.\n\nLimitations: More infrastructure to run.',
    contentAuthor: 'split_it_all',
    reason: 'Duplicate',
    reporterName: 'david_kim',
    reportedDate: '2026-10-02',
    status: 'Dismissed',
    reporterComments: 'Looks like the same argument already made in the resilience patterns topic.',
    autoFlagged: false,
    escalated: false,
    hidden: false,
  },
];
