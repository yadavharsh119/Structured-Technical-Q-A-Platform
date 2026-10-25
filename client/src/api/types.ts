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
  proposedSolution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: PerspectiveCodeSnippet[];
  references: string[];
  upvoteCount: number;
  hasUpvoted: boolean;
  createdAt: string;
}

export type PerspectiveSort = 'newest' | 'top';

export interface PerspectiveVoteState {
  upvoteCount: number;
  hasUpvoted: boolean;
}
