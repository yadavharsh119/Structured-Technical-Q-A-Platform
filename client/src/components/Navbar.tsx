import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canReview = user?.role === 'moderator' || user?.role === 'admin';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-3" data-testid="nav-home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 font-bold text-white">
            Q
          </div>
          <span className="text-lg font-semibold text-slate-900">Structured Technical Q&amp;A</span>
        </Link>
        <nav className="flex items-center space-x-4">
          {loading ? null : user ? (
            <>
              {canReview && (
                <Link
                  to="/review"
                  data-testid="nav-review"
                  className="text-sm font-medium text-slate-700 hover:text-primary-700"
                >
                  Review
                </Link>
              )}
              <span data-testid="nav-username" className="text-sm font-medium text-slate-900">
                {user.username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                data-testid="nav-logout"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="text-sm font-medium text-slate-700 hover:text-primary-700"
              >
                Login
              </Link>
              <Link
                to="/register"
                data-testid="nav-register"
                className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
