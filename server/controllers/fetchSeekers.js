import { supabase } from "../supabaseClient.js";



export const fetchSeekers = async (req, res) => {
  try {
    const { data: seekers, error } = await supabase
      .from("seeker")
      .select("*, profiles!inner(id, is_active)")
      .not("main_category", "is", null)
      .eq("profiles.is_active", true); 

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(seekers);
  } catch (error) {
    console.error("Fetch Seeker List error:", error.message);
    res.status(500).json({ error: error.message });
  }
};



export const fetchSeekerById = async (req, res) => {
  const { id } = req.params;
  
  try {

const { data: seeker, error: seekerError } = await supabase
  .from("seeker")
  .select("*")
  .eq("seeker_id", id)
  .single();

if (seekerError) throw seekerError;

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("first_name, last_name, gender, cnic_url, date_of_birth, phone")
  .eq("id", seeker.seeker_id)
  .single();

if (profileError) throw profileError;

res.json({ ...seeker, profile });

  } catch (error) {
    console.error("Fetch Seeker by ID error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
