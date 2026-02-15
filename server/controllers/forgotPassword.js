import { supabase } from "../supabaseClient.js";

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  console.log("Email: ",email);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    return res.status(400).json({ message: 'Email not found or profile error.' });
  }

  if (!profile.is_approved) {
    return res.status(403).json({
      message: 'Your registration is not approved yet. You cannot reset your password.',
    });
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/reset-password',
  });

  if (resetError) {
    return res.status(400).json({ message: resetError.message });
  }

  return res.status(200).json({
    message: 'If the email exists and is approved, a password reset link has been sent. For first time mail it might take a while.',
  });
};
