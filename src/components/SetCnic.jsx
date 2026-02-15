import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "../styles/VerificationFlow.css";

const formatDateToYMD = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
};

const SetCnic = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cnicUrl, setCnicUrl] = useState("");
  const [cnicFile, setCnicFile] = useState(null);
  const [cnicPreview, setCnicPreview] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [status, setStatus] = useState({
    type: "info",
    message:
      location.state?.message ||
      "Please provide your CNIC details so we can verify your account.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setStatus({
          type: "error",
          message: "Please log in again to continue.",
        });
        setLoadingProfile(false);
        return;
      }

      setUserEmail(user.email);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("cnic_url, gender, date_of_birth, is_rejected, is_approved")
        .ilike("email", user.email)
        .single();

      if (!profileError && profile) {
        const savedUrl = profile.cnic_url || "";
        setCnicUrl(savedUrl);
        setCnicPreview(savedUrl);
        setGender(profile.gender || "");
        setDateOfBirth(formatDateToYMD(profile.date_of_birth));

        const derivedStatus = profile.is_rejected
          ? "rejected"
          : !profile.cnic_url
          ? "missing_cnic"
          : profile.is_approved
          ? "approved"
          : "pending";

        const editable = derivedStatus === "missing_cnic" || derivedStatus === "rejected";
        setCanEdit(editable);

        if (!editable) {
          setStatus({
            type: "info",
            message:
              derivedStatus === "approved"
                ? "Your CNIC has already been approved."
                : "Your CNIC is under review. You can only submit again if it is rejected.",
          });
        }
      }

      setLoadingProfile(false);
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (cnicPreview && cnicPreview.startsWith("blob:")) {
        URL.revokeObjectURL(cnicPreview);
      }
    };
  }, [cnicPreview]);

  const handleFileChange = (event) => {
    if (!canEdit || loadingProfile) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      setCnicFile(null);
      setCnicPreview(cnicUrl);
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setStatus({
        type: "error",
        message: "Please upload an image file (JPG or PNG).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus({
        type: "error",
        message: "Image must be smaller than 5MB.",
      });
      return;
    }

    if (cnicPreview && cnicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(cnicPreview);
    }

    setStatus({ type: "", message: "" });
    setCnicFile(file);
    setCnicPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      return;
    }
    setStatus({ type: "", message: "" });

    if (!cnicFile && !cnicUrl.trim()) {
      setStatus({
        type: "error",
        message: "Please upload the front side image of your CNIC.",
      });
      return;
    }

    if (!gender) {
      setStatus({
        type: "error",
        message: "Please select your gender.",
      });
      return;
    }

    if (!dateOfBirth) {
      setStatus({
        type: "error",
        message: "Please provide your date of birth.",
      });
      return;
    }

    const formattedDob = formatDateToYMD(dateOfBirth);
    const dobDate = new Date(formattedDob);
    const today = new Date();
    if (Number.isNaN(dobDate.getTime()) || dobDate > today) {
      setStatus({
        type: "error",
        message: "Please enter a valid date of birth.",
      });
      return;
    }

    if (!userEmail) {
      setStatus({
        type: "error",
        message: "Missing user session. Please log in again.",
      });
      return;
    }

    setSubmitting(true);

    let finalCnicUrl = cnicUrl.trim();

    if (cnicFile) {
      const fileExt = cnicFile.name?.split(".").pop() || "jpg";
      const filePath = `cnic-front/${userEmail}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cnic-uploads")
        .upload(filePath, cnicFile, {
          contentType: cnicFile.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        setStatus({
          type: "error",
          message:
            uploadError.message ||
            "We couldn't upload your CNIC image. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("cnic-uploads")
        .getPublicUrl(filePath);

      finalCnicUrl = publicUrlData?.publicUrl || "";
    }

    if (!finalCnicUrl) {
      setStatus({
        type: "error",
        message: "Could not determine uploaded CNIC URL. Please retry.",
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        cnic_url: finalCnicUrl,
        gender,
        date_of_birth: formattedDob,
        is_rejected: false,
      })
      .ilike("email", userEmail);

    if (error) {
      setStatus({
        type: "error",
        message: error.message || "Could not update CNIC. Please try again.",
      });
      setSubmitting(false);
      return;
    }

    setCnicUrl(finalCnicUrl);

    try {
      const res = await fetch(
        `http://localhost:5000/api/check-status?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const payload = await res.json();

      navigate("/show_status", {
        state: {
          message:
            payload.message ||
            "Thanks! Your CNIC has been submitted for review.",
          status: payload.status || "pending",
        },
      });
    } catch (err) {
      setStatus({
        type: "success",
        message:
          "CNIC details saved. We will update you via email once reviewed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verification-page">
      <div className="verification-card">
        <h1 className="verification-title">Upload CNIC Details</h1>
        <p className="verification-subtitle">
          We use this information to verify every applicant. Upload a clear photo
          of the front side of your CNIC so our team can review it.
        </p>

        {status.message && (
          <div className={`verification-alert ${status.type || "info"}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="verification-two-column">
            <div className="verification-section">
              <p className="verification-section-title">Personal Details</p>
              <div className="verification-grid">
                <div className="verification-field">
                  <label className="verification-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="verification-select"
                    disabled={loadingProfile || submitting || !canEdit}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    
                  </select>
                </div>
                <div className="verification-field">
                  <label className="verification-label">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="verification-input"
                    disabled={loadingProfile || submitting || !canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="verification-section verification-section--cnic">
              <p className="verification-section-title">CNIC Front Image</p>
              <p className="verification-helper">
                Upload a clear JPG or PNG (max 5MB). Existing uploads will be replaced.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="verification-file-input"
                disabled={loadingProfile || submitting || !canEdit}
              />
              {cnicPreview && (
                <div className="verification-preview">
                  <p className="verification-preview-title">Preview</p>
                  <img src={cnicPreview} alt="CNIC front preview" />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loadingProfile || !canEdit}
            className="verification-primary-btn"
          >
            {submitting ? "Saving..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetCnic;

