import type { ModerationReportReason, ReportStatus } from '@structured-qa/shared';

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export type QuestionStatus = 'pending' | 'approved' | 'rejected';

export interface Question {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  techStack: string | null;
  status: QuestionStatus;
  rejectionReason: string | null;
  topicId: string | null;
  createdAt: string;
  tags: string[];
  authorUsername?: string;
}

export type TopicStatus = 'published' | 'archived' | 'hidden';

export interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  isCurated: boolean;
  status: TopicStatus;
  createdAt: string;
  tags: string[];
}

export interface QuestionWithTopic {
  question: Question;
  topic: Topic;
}

export interface PerspectiveCodeSnippet {
  language: string;
  code: string;
}

export interface Perspective {
  id: string;
  topicId: string;
  authorUsername: string;
  authorTopCategory: string | null;
  proposedSolution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: PerspectiveCodeSnippet[];
  references: string[];
  upvoteCount: number;
  hasUpvoted: boolean;
  deletionRequestPending: boolean;
  createdAt: string;
}

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DeletionRequestPerspective {
  id: string;
  topicId: string;
  proposedSolution: string;
  explanation: string;
  authorUsername: string;
  deletedAt: string | null;
}

export interface DeletionRequest {
  id: string;
  perspectiveId: string;
  reason: string;
  status: DeletionRequestStatus;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  requester: {
    id: string;
    username: string;
  };
  decidedBy: {
    id: string;
    username: string;
  } | null;
  perspective: DeletionRequestPerspective;
}

export type PerspectiveSort = 'newest' | 'top';

export interface PerspectiveVoteState {
  upvoteCount: number;
  hasUpvoted: boolean;
}

export interface ReportedTopic {
  type: 'topic';
  id: string;
  title: string;
  slug: string;
  description: string;
  hidden: boolean;
}

export interface ReportedPerspective {
  type: 'perspective';
  id: string;
  topicId: string;
  proposedSolution: string;
  explanation: string;
  authorUsername: string;
  hidden: boolean;
}

export interface Report {
  id: string;
  reporter: {
    id: string;
    username: string;
  };
  targetType: 'topic' | 'perspective';
  targetId: string;
  reason: ModerationReportReason;
  comment: string | null;
  status: ReportStatus;
  createdAt: string;
  target: ReportedTopic | ReportedPerspective | null;
}
