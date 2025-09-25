/**
 * Centralized password validation utility
 * This matches Supabase's password validation requirements exactly
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const WEAK_PASSWORD_PATTERNS = [
  // Common passwords
  /^password/i, /^123456/, /^qwerty/i, /^abc123/i, /^admin/i, /^user/i, /^login/i, /^welcome/i,
  /^letmein/i, /^monkey/i, /^dragon/i, /^shadow/i, /^master/i, /^hello/i, /^freedom/i, /^whatever/i,
  /^football/i, /^baseball/i, /^superman/i, /^michael/i, /^jennifer/i, /^jordan/i, /^michelle/i,
  /^daniel/i, /^andrew/i, /^joshua/i, /^robert/i, /^jessica/i, /^charlie/i, /^soccer/i, /^blue/i,
  /^purple/i, /^orange/i, /^maggie/i, /^pepper/i, /^1q2w3e/i, /^zaq12wsx/i, /^xsw23edc/i,
  /^trustno1/i, /^000000/, /^1234567/, /^12345678/, /^123456789/, /^1234567890/, /^0987654321/,
  /^987654321/, /^87654321/, /^7654321/, /^654321/, /^54321/, /^4321/, /^321/,
  
  // Repeated characters (3 or more in a row)
  /(.)\1{2,}/,
  
  // Repeated patterns
  /^(.{1,6})\1+$/,
  
  // Sequential numbers
  /012|123|234|345|456|567|678|789|890|901|210|321|432|543|654|765|876|987|098/,
  
  // Sequential letters (forward and backward)
  /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|cba|dcb|edc|fed|gfe|hgf|ihg|jih|kji|lkj|mlk|nml|onm|pon|qpo|rqp|srq|tsr|uts|vut|wvu|xwv|yxw|zyx/i,
  
  // Common keyboard patterns
  /qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|qaz|wsx|edc|rfv|tgb|yhn|ujm|ik|ol|p/i,
  
  // Years (1900-2030)
  /19[0-9][0-9]|20[0-2][0-9]|203[0]/,
  
  // Months
  /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i,
  
  // Days
  /monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun/i,
  
  // Common words that might be in personal info
  /love|family|house|money|work/i,
];

export function validatePassword(password: string, personalInfo?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
}): PasswordValidationResult {
  const errors: string[] = [];
  
  // Basic requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check against weak patterns
  for (const pattern of WEAK_PASSWORD_PATTERNS) {
    if (pattern.test(password)) {
      errors.push('Password is known to be weak and easy to guess');
      break;
    }
  }
  
  // Check if password is too similar to personal info
  if (personalInfo) {
    const personalInfoPatterns = [
      personalInfo.firstName && new RegExp(personalInfo.firstName, 'i'),
      personalInfo.lastName && new RegExp(personalInfo.lastName, 'i'),
      personalInfo.email && new RegExp(personalInfo.email.split('@')[0], 'i'),
      personalInfo.companyName && new RegExp(personalInfo.companyName.replace(/\s+/g, ''), 'i')
    ].filter(Boolean).filter(pattern => pattern!.source.length > 2);
    
    for (const pattern of personalInfoPatterns) {
      if (pattern && pattern.test(password)) {
        errors.push('Password should not contain personal information');
        break;
      }
    }
  }
  
  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && 
        /\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong' | null): string {
  switch (strength) {
    case 'weak': return 'text-red-600';
    case 'medium': return 'text-yellow-600';
    case 'strong': return 'text-green-600';
    default: return 'text-gray-400';
  }
}