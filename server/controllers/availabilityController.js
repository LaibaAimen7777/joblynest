
import { supabase } from '../supabaseClient.js';


function getWeekday(date) {
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  return days[date.getDay()];
}


function expandWeeklyPattern(weeklyPattern) {
  const today = new Date();
  const next7 = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dateStr = d.toISOString().split("T")[0];
    const weekday = getWeekday(d);

    next7[dateStr] = weeklyPattern[weekday] || [];
  }

  return next7;
}


export const getAvailability = async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from("seeker")
    .select("availability")  
    .eq("seeker_id", userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const weeklyPattern = data?.availability || {};
  const expanded = expandWeeklyPattern(weeklyPattern);

  res.json({ availability: expanded });
};

export const saveAvailability = async (req, res) => {
  const { userId, availability } = req.body;


  if (!userId || !availability)
    return res.status(400).json({ error: "Missing userId or availability." });

  const { error } = await supabase
    .from("seeker")
    .update({ availability }) 
    .eq("seeker_id", userId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Weekly availability saved successfully." });
};