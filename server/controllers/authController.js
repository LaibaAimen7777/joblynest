import { supabase } from "../supabaseClient.js";
import fullCleanup from "../utils/authCleanup.js";


export const registerUser = async (fields, files, res) => {


  try {
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const password = Array.isArray(fields.password)
      ? fields.password[0]
      : fields.password;
    const firstName = Array.isArray(fields.firstName)
      ? fields.firstName[0]
      : fields.firstName;
    const lastName = Array.isArray(fields.lastName)
      ? fields.lastName[0]
      : fields.lastName;
    const userType = Array.isArray(fields.userType)
      ? fields.userType[0]
      : fields.userType;
    const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ error: "Provide a valid phone number with country code." });
    }

    await fullCleanup(email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, 
        email_confirm: true, 
      },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      is_phone_confirm: false,
      user_type: userType,
      is_approved: false,
      is_rejected: false,
    });

    if (insertError) throw insertError;

    res
      .status(201)
      .json({
        message: "Registered successfully. Proceed to OTP verification.",
      });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
};
