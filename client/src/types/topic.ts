import type { SearchTopic } from './search';

export interface SourceQuestion {
  id?: string;
  title: string;
  askedBy: string;
  link?: string;
}

export interface TopicDetail extends SearchTopic {
  sourceQuestion: SourceQuestion | null;
  sourceQuestions?: SourceQuestion[];
}

export interface CodeSnippet {
  language: string;
  code: string;
}

export interface PerspectiveReference {
  label: string;
  url: string;
}

export interface Perspective {
  id: string;
  topicSlug: string;
  author: string | null;
  authorTopDomain: string | null;
  solution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: CodeSnippet[];
  references: PerspectiveReference[];
  upvotes: number;
  createdAt: string;
}

export type PerspectiveSort = 'upvotes' | 'newest';

export interface PerspectiveQuery {
  slug: string;
  sort: PerspectiveSort;
  onlyWithCode: boolean;
  page: number;
  pageSize: number;
}

export interface PerspectivePage {
  items: Perspective[];
  total: number;
  page: number;
  pageSize: number;
}
