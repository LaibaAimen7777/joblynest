import { supabase } from "../supabaseClient.js";

export const handleProfileType = async (req, res) => {
  const { profileType } = req.body;
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  const token = authHeader.split(' ')[1];

  
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found.' });
  }

  const userId = user.id;

  try {
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ user_type: profileType })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user_type in profiles.' });
    }

    const targetTable = profileType === 'job_poster' ? 'poster' : 'seeker';
    const columnName = profileType === 'job_poster' ? 'poster_id' : 'seeker_id';

    const { error: insertError } = await supabase
      .from(targetTable)
      .insert([{ [columnName]: userId }]);

    if (insertError) {
      return res.status(500).json({ error: `Failed to insert user into ${targetTable} table.` });
    }

    return res.status(200).json({ message: 'Profile type saved successfully.' });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
