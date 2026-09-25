import { supabase } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/features/auth/utils/authRedirect';

export async function sendEmailOtp(email: string, returnTo?: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: getAuthRedirectUrl(returnTo),
    },
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });

  if (error) {
    throw error;
  }

  return data.session;
}
