
import { supabase } from '../supabaseClient.js';

const fullCleanup = async (email) => {
  // 1. Find user in auth table
  const { data: users } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email);

  // 2. Delete from auth
  if (users?.length > 0) {
    await supabase.auth.admin.deleteUser(users[0].id);
  }

  // 3. Delete from profiles
  await supabase
    .from('profiles')
    .delete()
    .eq('email', email);

  // 4. Wait for cache clearance
  await new Promise(resolve => setTimeout(resolve, 2000));
};

export default fullCleanup;