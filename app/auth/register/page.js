'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useForm } from '@/hooks/useForm';
import { validateRegister } from '@/lib/validators';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

const EXP_LEVELS = ['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];
const SKILL_OPTIONS = ['React', 'Node.js', 'Python', 'TypeScript', 'Next.js', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'GraphQL', 'Vue', 'Angular', 'DevOps', 'Testing', 'System Design'];

export default function RegisterPage() {
  const { register: registerUser, showToast } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    { name: '', username: '', email: '', password: '', confirmPassword: '', bio: '', experienceLevel: 'Junior', yearsExp: '' },
    validateRegister
  );

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    setServerError('');
    try {
      await registerUser({ ...data, skills: selectedSkills });
      showToast('Account created! Welcome to DevPerspective 🎉', 'success');
      router.push('/');
    } catch (err) {
      setServerError(err.message);
    }
  });

  const passwordStrength = () => {
    const p = values.password;
    if (!p) return { level: 0, label: '' };
    let score = 0;
    if (p.length >= 8)  score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return { level: score, label: labels[score] };
  };

  const strength = passwordStrength();

  return (
    <div className={styles.page}>
      <div className={styles.card + ' glass-card'}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>◈ DevPerspective</Link>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Join the structured knowledge community</p>
        </div>

        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className={styles.row}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="name" className={`form-input${errors.name ? ' error' : ''}`}
                value={values.name} onChange={handleChange} onBlur={handleBlur} placeholder="Jane Smith" />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input name="username" className={`form-input${errors.username ? ' error' : ''}`}
                value={values.username} onChange={handleChange} onBlur={handleBlur} placeholder="jane_dev" />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className={`form-input${errors.email ? ' error' : ''}`}
              value={values.email} onChange={handleChange} onBlur={handleBlur} placeholder="jane@example.com" />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className={styles.row}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className={`form-input${errors.password ? ' error' : ''}`}
                value={values.password} onChange={handleChange} onBlur={handleBlur} placeholder="Min 8 chars" />
              {values.password && (
                <div className={styles.strengthBar}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className={[styles.strengthSeg, i <= strength.level ? styles[`str${strength.level}`] : ''].join(' ')} />
                  ))}
                  <span className={styles.strengthLabel}>{strength.label}</span>
                </div>
              )}
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input name="confirmPassword" type="password" className={`form-input${errors.confirmPassword ? ' error' : ''}`}
                value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="Repeat password" />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio <span className={styles.optional}>(optional)</span></label>
            <textarea name="bio" className={`form-textarea${errors.bio ? ' error' : ''}`} rows={2}
              value={values.bio} onChange={handleChange} onBlur={handleBlur}
              placeholder="A brief intro about you and your dev background..." />
            <div className={`char-counter${values.bio.length > 280 ? ' warning' : ''}`}>{values.bio.length}/300</div>
            {errors.bio && <span className="form-error">{errors.bio}</span>}
          </div>

          <div className={styles.row}>
            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select name="experienceLevel" className="form-input" value={values.experienceLevel} onChange={handleChange}>
                {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input name="yearsExp" type="number" min="0" max="50" className="form-input"
                value={values.yearsExp} onChange={handleChange} placeholder="e.g. 3" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills <span className={styles.optional}>(select up to 8)</span></label>
            <div className={styles.skillsGrid}>
              {SKILL_OPTIONS.map(skill => (
                <button type="button" key={skill}
                  className={[styles.skillChip, selectedSkills.includes(skill) ? styles.skillActive : ''].join(' ')}
                  onClick={() => toggleSkill(skill)}
                  disabled={!selectedSkills.includes(skill) && selectedSkills.length >= 8}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Create Account
          </Button>
        </form>

        <p className={styles.switchLink}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
