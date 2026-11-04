import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { PLATFORM_NAME } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';

const SECTION_LINKS = [
  { label: 'How it works', hash: '#how-it-works' },
  { label: 'Compare', hash: '#compare' },
  { label: 'Expert Fingerprint', hash: '#expert-fingerprint' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const onLanding = pathname === '/';
  const sectionHref = (hash: string) => (onLanding ? hash : `/${hash}`);
  const canReview = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const [navSearch, setNavSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = navSearch.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/search');
    }
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  const topicsClass = (mobile: boolean) =>
    pathname === '/topics' || pathname.startsWith('/topics/')
      ? `${mobile ? 'block' : ''} text-sm font-medium text-ink underline decoration-black decoration-2 underline-offset-8`
      : `${mobile ? 'block' : ''} text-sm font-medium text-secondary hover:text-black`;

  const pageClass = (path: string, mobile: boolean) =>
    pathname === path
      ? `${mobile ? 'block' : ''} text-sm font-medium text-ink underline decoration-black decoration-2 underline-offset-8`
      : `${mobile ? 'block' : ''} text-sm font-medium text-secondary hover:text-black`;

  const sectionClass = (mobile: boolean) =>
    `${mobile ? 'block' : ''} text-sm font-medium text-secondary hover:text-black`;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2" aria-label={`${PLATFORM_NAME} home`} data-testid="nav-home">
          <span className="inline-block h-5 w-5 bg-black" aria-hidden="true" />
          <span className="text-base font-semibold text-ink">{PLATFORM_NAME}</span>
        </Link>
        <ul className="hidden items-center gap-8 md:flex">
          <li>
            <Link to="/topics" aria-current={pathname === '/topics' || pathname.startsWith('/topics/') ? 'page' : undefined} className={topicsClass(false)}>
              Topics
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link to="/questions/new" data-testid="nav-ask-question" className={pageClass('/questions/new', false)}>
                  Ask Question
                </Link>
              </li>
              <li>
                <Link to="/questions/mine" data-testid="nav-my-questions" className={pageClass('/questions/mine', false)}>
                  My Questions
                </Link>
              </li>
            </>
          )}
          {SECTION_LINKS.map((l) => (
            <li key={l.hash}>
              <a href={sectionHref(l.hash)} className={sectionClass(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <form
          role="search"
          onSubmit={handleSearch}
          className="relative hidden md:block w-44 lg:w-56"
        >
          <label htmlFor="nav-search-input" className="sr-only">
            Search topics
          </label>
          <input
            id="nav-search-input"
            type="search"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Search topics..."
            data-testid="nav-search-input"
            className="h-9 w-full rounded-lg border border-line bg-tint/40 pl-8 pr-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:bg-white focus:outline-none"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden="true" />
        </form>
        <div className="hidden items-center gap-5 md:flex">
          {user ? (
            <div className="flex items-center gap-4">
              {canReview && (
                <Link
                  to="/admin/questions"
                  data-testid="nav-review"
                  className={`text-sm font-medium ${pathname === '/admin/questions' ? 'text-ink font-semibold' : 'text-secondary hover:text-black'}`}
                >
                  Review
                </Link>
              )}
              {canReview && (
                <Link
                  to="/moderation"
                  data-testid="nav-moderation"
                  className={`text-sm font-medium ${pathname === '/moderation' ? 'text-ink font-semibold' : 'text-secondary hover:text-black'}`}
                >
                  Moderation
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin/users"
                  data-testid="nav-admin-users"
                  className={pageClass('/admin/users', false)}
                >
                  Users
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin/audit-logs"
                  data-testid="nav-admin-audit-logs"
                  className={pageClass('/admin/audit-logs', false)}
                >
                  Audit Logs
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin/deletion-requests"
                  data-testid="nav-deletion-requests"
                  className={`text-sm font-medium ${pathname === '/admin/deletion-requests' ? 'text-ink font-semibold' : 'text-secondary hover:text-black'}`}
                >
                  Deletion Requests
                </Link>
              )}
              <Link
                to={`/users/${encodeURIComponent(user.id)}`}
                data-testid="nav-username"
                className="text-sm font-semibold text-ink hover:underline"
              >
                @{user.username}
              </Link>
              <Link
                to="/settings"
                data-testid="nav-settings"
                className={pageClass('/settings', false)}
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                data-testid="nav-logout"
                className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-secondary hover:bg-tint hover:text-black"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="text-sm font-medium text-secondary hover:text-black"
              >
                Log in
              </Link>
              <Link
                to="/register"
                data-testid="nav-register"
                className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>
      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-white px-6 py-4 md:hidden">
          <form
            role="search"
            onSubmit={(e) => {
              handleSearch(e);
              setOpen(false);
            }}
            className="relative mb-4"
          >
            <label htmlFor="nav-search-input-mobile" className="sr-only">
              Search topics
            </label>
            <input
              id="nav-search-input-mobile"
              type="search"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search topics..."
              data-testid="nav-search-input-mobile"
              className="h-10 w-full rounded-lg border border-line bg-tint/40 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:bg-white focus:outline-none"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          </form>
          <ul className="space-y-3">
            <li>
              <Link to="/topics" aria-current={pathname === '/topics' || pathname.startsWith('/topics/') ? 'page' : undefined} className={topicsClass(true)}>
                Topics
              </Link>
            </li>
            {user && (
              <>
                <li>
                  <Link
                    to="/questions/new"
                    onClick={() => setOpen(false)}
                    data-testid="nav-ask-question-mobile"
                    className={pageClass('/questions/new', true)}
                  >
                    Ask Question
                  </Link>
                </li>
                <li>
                  <Link
                    to="/questions/mine"
                    onClick={() => setOpen(false)}
                    data-testid="nav-my-questions-mobile"
                    className={pageClass('/questions/mine', true)}
                  >
                    My Questions
                  </Link>
                </li>
              </>
            )}
            {SECTION_LINKS.map((l) => (
              <li key={l.hash}>
                <a href={sectionHref(l.hash)} className={sectionClass(true)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/users/${encodeURIComponent(user.id)}`}
                      onClick={() => setOpen(false)}
                      data-testid="nav-username-mobile"
                      className="text-sm font-semibold text-ink hover:underline"
                    >
                      @{user.username}
                    </Link>
                    {canReview && (
                      <Link
                        to="/admin/questions"
                        onClick={() => setOpen(false)}
                        data-testid="nav-review-mobile"
                        className={`text-sm font-medium ${pathname === '/admin/questions' ? 'text-ink font-semibold' : 'text-secondary hover:text-black'}`}
                      >
                        Review
                      </Link>
                    )}
                    {canReview && (
                      <Link
                        to="/moderation"
                        onClick={() => setOpen(false)}
                        data-testid="nav-moderation-mobile"
                        className={`text-sm font-medium ${pathname === '/moderation' ? 'text-ink font-semibold' : 'text-secondary hover:text-black'}`}
                      >
                        Moderation
                      </Link>
                    )}
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    data-testid="nav-settings-mobile"
                    className={pageClass('/settings', true)}
                  >
                    Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      onClick={() => setOpen(false)}
                      data-testid="nav-admin-users-mobile"
                      className={pageClass('/admin/users', true)}
                    >
                      Users
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/audit-logs"
                      onClick={() => setOpen(false)}
                      data-testid="nav-admin-audit-logs-mobile"
                      className={pageClass('/admin/audit-logs', true)}
                    >
                      Audit Logs
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/deletion-requests"
                      onClick={() => setOpen(false)}
                      data-testid="nav-deletion-requests-mobile"
                      className={pageClass('/admin/deletion-requests', true)}
                    >
                      Deletion Requests
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="nav-logout-mobile"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-white py-2 text-sm font-medium text-secondary hover:bg-tint hover:text-black"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    data-testid="nav-login-mobile"
                    className="text-sm font-medium text-secondary hover:text-black"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    data-testid="nav-register-mobile"
                    className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
