'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import styles from './Navbar.module.css';

export default function Navbar({ onSearch }) {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const navLinks = [
    { href: '/',        label: 'Home'   },
    { href: '/topics',  label: 'Topics' },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoText}>Dev<span className={styles.accent}>Perspective</span></span>
        </Link>

        {/* Search (desktop) */}
        <div className={styles.searchWrap}>
          <SearchBar onSearch={onSearch} />
        </div>

        {/* Nav Links */}
        <div className={`${styles.links} ${mobileMenu ? styles.mobileOpen : ''}`}>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[styles.navLink, pathname === href ? styles.active : ''].filter(Boolean).join(' ')}
              onClick={() => setMobileMenu(false)}
            >
              {label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link href="/questions/ask" onClick={() => setMobileMenu(false)}>
              <Button variant="primary" size="sm">+ Ask Question</Button>
            </Link>
          )}
        </div>

        {/* Right: Auth area */}
        <div className={styles.authArea}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <button
                className={styles.avatarBtn}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="User menu"
              >
                <Avatar
                  name={user.name}
                  color={user.avatarColor}
                  initials={user.avatarInitials}
                  size="sm"
                />
                <span className={styles.userName + ' hide-mobile'}>{user.name.split(' ')[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`hide-mobile ${menuOpen ? styles.chevronUp : ''}`}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
                  <div className={styles.dropdown} onClick={() => setMenuOpen(false)}>
                    <div className={styles.dropHeader}>
                      <Avatar name={user.name} color={user.avatarColor} initials={user.avatarInitials} size="md" />
                      <div>
                        <div className={styles.dropName}>{user.name}</div>
                        <div className={styles.dropUsername}>@{user.username}</div>
                      </div>
                    </div>
                    <div className={styles.dropDivider} />
                    <Link href={`/profile/${user.username}`} className={styles.dropItem}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      My Profile
                    </Link>
                    <Link href="/questions/ask" className={styles.dropItem}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                      Ask a Question
                    </Link>
                    <div className={styles.dropDivider} />
                    <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={logout}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.guestBtns}>
              <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/auth/register"><Button variant="primary" size="sm">Join Free</Button></Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button className={styles.hamburger} onClick={() => setMobileMenu(o => !o)} aria-label="Toggle menu">
            <span className={mobileMenu ? styles.barClose1 : styles.bar} />
            <span className={mobileMenu ? styles.barHide : styles.bar} />
            <span className={mobileMenu ? styles.barClose2 : styles.bar} />
          </button>
        </div>
      </div>
    </nav>
  );
}
