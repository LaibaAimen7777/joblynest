import { supabase } from '../supabaseClient.js';

export const getApprovedUsers = async (req, res) => {
  try {

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', true)
      .eq('is_rejected', false)
      .eq('is_admin',false);


    if (profilesError) return res.status(500).json({ error: profilesError.message });

    
res.json(profiles);

  } catch (error) {
    console.error('Fetch Approved Profiles error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
