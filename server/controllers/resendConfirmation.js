import { supabase } from "../supabaseClient.js";

export const resendConfirmation=async(req,res)=>{
    const {email}=req.body;
    const {error}=await supabase.auth.resend({
        type: 'signup',
        email: email,
    });

    if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ message: 'Confirmation email resent' });

} 