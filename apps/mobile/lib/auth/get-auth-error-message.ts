export function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const clerkErr = (err as { errors: Array<{ code: string }> }).errors?.[0];
    switch (clerkErr?.code) {
      case 'form_identifier_not_found':
        return 'No account found. Check your email or sign up.';
      case 'form_password_incorrect':
        return 'Incorrect credentials. Please try again.';
      case 'too_many_requests':
        return 'Too many attempts. Please wait a moment.';
      case 'form_identifier_exists':
        return 'An account with this email already exists. Try signing in.';
      case 'form_code_incorrect':
      case 'verification_failed':
        return 'Incorrect verification code. Please try again.';
      case 'verification_expired':
        return 'That code expired. Request a new one.';
      case 'form_identifier_not_found_secondary':
      case 'strategy_for_user_invalid':
        return 'That sign-in method isn’t available for this account.';
      case 'form_param_format_invalid':
        return 'Please check the format and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
