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
        return 'Incorrect verification code. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
