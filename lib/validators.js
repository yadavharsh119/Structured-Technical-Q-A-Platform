// lib/validators.js — Frontend validation functions

/**
 * Validates email format
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Please enter a valid email address';
  return null;
}

/**
 * Validates password strength
 */
export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

/**
 * Validates password confirmation
 */
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}

/**
 * Validates a required text field
 */
export function validateRequired(value, fieldName = 'This field') {
  if (!value || !String(value).trim()) return `${fieldName} is required`;
  return null;
}

/**
 * Validates username format
 */
export function validateUsername(username) {
  if (!username || !username.trim()) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}

/**
 * Validates display name
 */
export function validateName(name) {
  if (!name || !name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 60) return 'Name must be 60 characters or less';
  return null;
}

/**
 * Validates a bio (optional but bounded)
 */
export function validateBio(bio) {
  if (bio && bio.length > 300) return 'Bio must be 300 characters or less';
  return null;
}

/**
 * Validates question form data
 * @param {Object} data - { title, context, topics, type }
 */
export function validateQuestion(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Question title is required';
  } else if (data.title.trim().length < 20) {
    errors.title = `Title is too short — at least 20 characters needed (currently ${data.title.trim().length})`;
  } else if (data.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or less';
  }

  if (!data.context || !data.context.trim()) {
    errors.context = 'Context is required — help others understand your situation';
  } else if (data.context.trim().length < 50) {
    errors.context = `Context is too short — at least 50 characters needed (currently ${data.context.trim().length})`;
  } else if (data.context.trim().length > 2000) {
    errors.context = 'Context must be 2000 characters or less';
  }

  if (!data.topics || data.topics.length === 0) {
    errors.topics = 'Please select at least one topic';
  } else if (data.topics.length > 5) {
    errors.topics = 'You can select up to 5 topics';
  }

  if (!data.type) {
    errors.type = 'Please select a question type';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a structured perspective
 * @param {Object} data - { background, experience, whatWorked, whatDidntWork, advice }
 */
export function validatePerspective(data) {
  const errors = {};

  const fields = [
    { key: 'background',     label: 'Your Background',    min: 50,  max: 800  },
    { key: 'experience',     label: 'Your Experience',    min: 80,  max: 1500 },
    { key: 'whatWorked',     label: 'What Worked',        min: 60,  max: 1000 },
    { key: 'whatDidntWork',  label: "What Didn't Work",   min: 40,  max: 1000 },
    { key: 'advice',         label: 'Your Advice',        min: 40,  max: 800  },
  ];

  fields.forEach(({ key, label, min, max }) => {
    const value = data[key];
    if (!value || !value.trim()) {
      errors[key] = `${label} is required`;
    } else if (value.trim().length < min) {
      errors[key] = `${label} needs at least ${min} characters (currently ${value.trim().length})`;
    } else if (value.trim().length > max) {
      errors[key] = `${label} must be ${max} characters or less`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the registration form
 */
export function validateRegister(data) {
  const errors = {};

  const nameErr     = validateName(data.name);
  const usernameErr = validateUsername(data.username);
  const emailErr    = validateEmail(data.email);
  const passErr     = validatePassword(data.password);
  const confirmErr  = validateConfirmPassword(data.password, data.confirmPassword);
  const bioErr      = validateBio(data.bio);

  if (nameErr)     errors.name = nameErr;
  if (usernameErr) errors.username = usernameErr;
  if (emailErr)    errors.email = emailErr;
  if (passErr)     errors.password = passErr;
  if (confirmErr)  errors.confirmPassword = confirmErr;
  if (bioErr)      errors.bio = bioErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the login form
 */
export function validateLogin(data) {
  const errors = {};

  const emailErr = validateEmail(data.email);
  if (emailErr) errors.email = emailErr;
  if (!data.password) errors.password = 'Password is required';

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
