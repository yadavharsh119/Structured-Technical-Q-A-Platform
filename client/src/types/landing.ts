export interface Topic {
  slug: string;
  title: string;
  category: string;
  description: string;
  perspectiveCount: number;
}

export interface HeroPerspective {
  id: string;
  author: string;
  initials: string;
  snippet: string;
  timestamp: string;
  upvotes: number;
  active?: boolean;
}

export interface TemplateBlock {
  heading: string;
  text: string;
}

export interface HeroDetail {
  author: string;
  initials: string;
  topicTitle: string;
  blocks: TemplateBlock[];
}

export interface ComparisonColumn {
  id: string;
  label: string;
  solution: string;
  advantages: string[];
  limitations: string[];
  author: string;
  upvotes: number;
}

export interface ComparisonTable {
  topicTitle: string;
  lead: string;
  columns: [ComparisonColumn, ComparisonColumn];
}

export interface FingerprintDomain {
  domain: string;
  perspectives: number;
  upvotes: number;
}

export interface HowStep {
  title: string;
  description: string;
}

export interface FactItem {
  label: string;
  icon: 'globe' | 'template' | 'columns' | 'login';
}
