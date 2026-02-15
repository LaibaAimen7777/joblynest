
import { supabase } from "../supabaseClient.js";
import jwt from "jsonwebtoken";


const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

export const handleAdminLogin = async (req, res) => {
  const { username, password } = req.body;

  const { data: admin, error: fetchError } = await supabase
    .from('admin')
    .select('id, email')
    .eq('username', username)
    .single();

  if (fetchError || !admin) {
    return res.status(404).json({ message: 'Admin not found.' });
  }


  const { data: session, error: authError } = await supabase.auth.signInWithPassword({
    email: admin.email,
    password,
  });

  if (authError || !session?.user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = generateJWT({ adminId: admin.id });

  console.log("Admin logged in, id:", admin.id);

  return res.status(200).json({
    message: 'Login successful',
    token, 
  });
};


