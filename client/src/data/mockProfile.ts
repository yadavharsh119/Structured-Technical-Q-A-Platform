// MOCK DATA: replace with API later
export interface UserProfile {
  bio: string;
  skills: string[];
  interests: string[];
}

export const MOCK_PROFILE: UserProfile = {
  bio: 'Full-stack engineer focused on building reliable distributed systems. I care deeply about clear technical writing and mentoring.',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'System Design'],
  interests: ['Security', 'Databases', 'Distributed Systems'],
};
