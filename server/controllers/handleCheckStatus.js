
import { supabase } from "../supabaseClient.js";

export const handleCheckStatus = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cnic_url, is_approved, is_rejected, is_email_confirm, is_phone_confirm')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    return res.status(400).json({ message: 'Profile not found.' });
  }

  if (!profile.cnic_url && !profile.is_email_confirm && !profile.is_phone_confirm) {
    return res.status(400).json({ message: 'Profile not found.' });
  }

  if (!profile.cnic_url) {
    return res.status(200).json({
      status: 'missing_cnic',
      nextStep: 'set_cnic',
      message: 'Please upload your CNIC to continue.',
    });
  }

  if (profile.is_rejected) {
    return res.status(200).json({
      status: 'rejected',
      nextStep: 'show_status',
      message: 'Your registration request was rejected. Please provide valid credentials.',
    });
  }

  if (!profile.is_approved) {
    return res.status(200).json({
      status: 'pending',
      nextStep: 'show_status',
      message: 'Your registration request is awaiting approval.',
    });
  }

  return res.status(200).json({
    status: 'approved',
    nextStep: 'approved',
    message: 'Approved',
  });
};
