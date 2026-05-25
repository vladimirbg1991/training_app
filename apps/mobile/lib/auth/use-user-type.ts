import { useUser } from '@clerk/expo';
import { UserTypeSchema } from '@gym-app/domain';
import type { UserType } from '@gym-app/domain';

/**
 * Reads the user type from Clerk's unsafeMetadata.
 * Validates with Zod schema to stay in sync with the domain enum.
 *
 * Returns null if the user hasn't completed type selection yet
 * or if the stored value is invalid.
 */
export function useUserType(): UserType | null {
  const { user } = useUser();
  if (!user) return null;

  const result = UserTypeSchema.safeParse(user.unsafeMetadata?.userType);
  return result.success ? result.data : null;
}
