import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import LocationSelector from "./LocationSelector";
import supabase from "../supabaseClient.js";

const makeValueFromTitle = (title) =>
  title
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const SeekerProfileForm = ({ setSelectedView }) => {
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [payRate, setPayRate] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [hasExistingLocation, setHasExistingLocation] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

  const [cvFileName, setCvFileName] = useState("");
  const [paymentType, setPaymentType] = useState("");

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategoryOptions, setSubcategoryOptions] = useState([]);

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hadPayRateBefore, setHadPayRateBefore] = useState(false);

  const [showSubcategoryLimitModal, setShowSubcategoryLimitModal] =
    useState(false);

  const [isCustomCategoryConfirmed, setIsCustomCategoryConfirmed] =
    useState(false);

  const navigate = useNavigate();
  useEffect(() => {
    console.log("setSelectedView function received:", typeof setSelectedView);
  }, [setSelectedView]);

  const subcategorySelectStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: 44,
      backgroundColor: "#e8f3ff", 
      borderColor: "#ccc",
      boxShadow: "none",
      ":hover": { borderColor: "#bbb" },
    }),

    valueContainer: (provided) => ({
      ...provided,
      minHeight: 46,
      paddingTop: 4,
      paddingBottom: 4,
    }),

    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "#ffffff", 
      borderRadius: "8px",
      border: "1px solid #dce3f0",
      paddingLeft: "4px",
      paddingRight: "4px",
    }),

    multiValueLabel: (provided) => ({
      ...provided,
      color: "#000", 
      fontSize: "14px",
    }),

    multiValueRemove: (provided) => ({
      ...provided,
      color: "#333",
      ":hover": {
        backgroundColor: "#f5f5f5",
        color: "#d4171f",
      },
    }),

    option: (provided, state) => ({
      ...provided,
      paddingTop: 12,
      paddingBottom: 12,
      minHeight: 45,
      fontSize: 15,
      backgroundColor: state.isFocused ? "#d8eaff" : "#fff",
    }),
  };

  const customCategoryInputRef = useRef(null);

  const handleCustomCategoryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleConfirmCustomCategory(); 
    }
  };

  const handleCustomSubcategoryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAddCustomSubcategory();
    }
  };

  const spellCheckText = async (text) => {
    if (!text || !text.trim()) return "";

    try {
      const res = await fetch("http://localhost:5000/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      return data.corrected || text;
    } catch (err) {
      console.error("Spell check API error:", err);
      return text; 
    }
  };

  const OTHER_CATEGORY_ICON =
    "https://cdn-icons-png.flaticon.com/512/992/992651.png"; 

  const [locationModalClosed, setLocationModalClosed] = useState(false);
  const [locationData, setLocationData] = useState({
    coords: { lat: null, lon: null },
    geoLocation: "",
    confirmed: false,
  });
  const MIN_PAY_RATE = 500;
  const MAX_SUBCATEGORIES = 5;

 
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id, title, title_urdu, subcategories, subcategories_urdu, icon_url"
        )
        .order("title", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      let options =
        data?.map((row) => ({
          id: row.id,
          value: row.title,
          label: row.title,
          urduLabel: row.title_urdu || "",
          subcategories: row.subcategories || "",
          subcategoriesUrdu: row.subcategories_urdu || "",
          iconUrl: row.icon_url || null,
        })) || [];

      const otherIndex = options.findIndex(
        (opt) =>
          opt.value === "other" || opt.label.trim().toLowerCase() === "other"
      );

      if (otherIndex !== -1) {
        const [otherOption] = options.splice(otherIndex, 1);
        options.push(otherOption); 
      }

      setCategoryOptions(options);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not found:", userError);
        return;
      }

      const { data: seekerData, error: seekerError } = await supabase
        .from("seeker")
        .select("*")
        .eq("seeker_id", user.id)
        .single();

      if (seekerError) {
        console.error("Error fetching seeker data:", seekerError);
        return;
      }

      if (seekerData) {
        const userHasLocation = !!(seekerData.latitude && seekerData.longitude);
        setHasExistingLocation(userHasLocation); 
        setLocationData({
          coords: {
            lat: seekerData.latitude || null,
            lon: seekerData.longitude || null,
          },
          geoLocation: seekerData.geo_location || "",
          confirmed: userHasLocation,
        });


        if (seekerData.service_id) {
          const categoryObj = categoryOptions.find(
            (c) => c.id === seekerData.service_id
          );

          if (categoryObj) {
            setSelectedCategory(categoryObj);
            await handleCategoryChange(categoryObj);

            if (seekerData.selected_subcategory_ids && seekerData.selected_subcategory_ids.length > 0) {
              const { data: subcatData } = await supabase
                .from("service_subcategory_fk")
                .select("id, name")
                .in("id", seekerData.selected_subcategory_ids);

              if (subcatData) {
                const restored = subcatData.map((subcat) => ({
                  id: subcat.id,
                  value: subcat.id.toString(),
                  label: subcat.name,
                }));
                setSelectedSubcategories(restored);
              }
            }

            if (seekerData.custom_subcategories && seekerData.custom_subcategories.length > 0) {
              const customRestored = seekerData.custom_subcategories.map((custom) => ({
                id: null,
                value: custom,
                label: custom,
              }));
              setSelectedSubcategories((prev) => [...prev, ...customRestored]);
              setIsCustomSubcategory(true);
            }
          }
        } else if (seekerData.main_category) {
          const categoryObj = categoryOptions.find(
            (c) => c.value === seekerData.main_category
          );

          if (!categoryObj) {
            console.warn(
              "No matching category option for:",
              seekerData.main_category
            );
            if (seekerData.main_category === "other") {
              setIsCustomCategory(true);
              const restored = (seekerData.subcategories || []).map((slug) => ({
                value: slug,
                label: slug
                  .split("_")
                  .map((w) => w[0].toUpperCase() + w.slice(1))
                  .join(" "),
              }));
              setSelectedSubcategories(restored);
            }
            setLoading(false);
            return;
          }

          setSelectedCategory(categoryObj);

          if (seekerData.main_category === "other") {
            setIsCustomCategory(true);
            const restored = (seekerData.subcategories || []).map((slug) => ({
              value: slug,
              label: slug
                .split("_")
                .map((w) => w[0].toUpperCase() + w.slice(1))
                .join(" "),
            }));
            setSelectedSubcategories(restored);
            setLoading(false);
            return;
          }

          await handleCategoryChange(categoryObj);

          const restored = (seekerData.subcategories || []).map((sub) => ({
            value: sub,
            label: sub
              .split("_")
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(" "),
          }));

          setSelectedSubcategories(restored);
        }

        setDescription(seekerData.description || "");
        setPayRate(String(seekerData.pay_rate || ""));
        setPaymentType(seekerData.payment_type || "");

        if (seekerData.profile_picture) {
          setPreviewUrl(seekerData.profile_picture); 
        }

        if (seekerData.cv_document) {
          const fileName = seekerData.cv_document.split("/").pop();
          setCvFileName(fileName);
          setCvFile({ url: seekerData.cv_document }); 
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [categoryOptions]);
  useEffect(() => {
    console.log("📍 SeekerProfileForm Location Data:", {
      locationData,
      hasExistingLocation,
      loading,
    });
  }, [locationData, hasExistingLocation, loading]);
  const handleCategoryChange = async (selected) => {
    setSelectedCategory(selected);
    setSelectedSubcategories([]);
    setSubcategoryOptions([]);
    setCustomSubcategory("");
    setIsCustomSubcategory(false);

    if (!selected) {
      setIsCustomCategory(false);
      setCustomCategory("");
      return;
    }

    const isOtherCategory =
      selected.value === "other" ||
      selected.label.trim().toLowerCase() === "other";

    setIsCustomCategory(isOtherCategory);

    if (isOtherCategory) {
      setSubcategoryOptions([]);
      return;
    }

    if (selected.id) {
      const { data: subcatData, error: subcatError } = await supabase
        .from("service_subcategory_fk")
        .select("id, name")
        .eq("service_id", selected.id)
        .order("name", { ascending: true });

      if (subcatError) {
        console.error("Error fetching subcategories:", subcatError);
        const rawEn = selected.subcategories || "";
        const rawUr = selected.subcategoriesUrdu || "";
        const listEn = rawEn.split(";").map((s) => s.trim()).filter(Boolean) || [];
        const listUr = rawUr.split(";").map((s) => s.trim()).filter(Boolean) || [];
        const options = listEn.map((name, idx) => ({
          id: null, 
          value: makeValueFromTitle(name),
          label: name,
          urduLabel: listUr[idx] || "",
        }));

        setSubcategoryOptions(options);
        return;
      }

      const rawUr = selected.subcategoriesUrdu || "";
      const listUr = rawUr.split(";").map((s) => s.trim()).filter(Boolean) || [];

      const options = subcatData.map((subcat, idx) => ({
        id: subcat.id, 
        value: subcat.id.toString(), 
        label: subcat.name,
        urduLabel: listUr[idx] || "",
      }));


      setSubcategoryOptions(options);
    }
  };

  const handleSubcategoryChange = (selected) => {
  if (isCustomCategory) return; 

  const list = selected || [];

  if (list.length > MAX_SUBCATEGORIES) {
    setShowSubcategoryLimitModal(true);
    return;
  }

  setSelectedSubcategories(list.slice(0, MAX_SUBCATEGORIES));
};


  const handleConfirmCustomCategory = () => {
    if (selectedSubcategories.length >= 5) {
      setShowSubcategoryLimitModal(true);
      return;
    }


    const cleaned = customCategory.replace(/[^A-Za-z\s]/g, "");

    if (customCategoryInputRef.current) customCategoryInputRef.current.blur();

    setCustomCategory(cleaned);

    setSelectedCategory({
      value: makeValueFromTitle(cleaned),
      label: cleaned,
      urduLabel: "",
    });

    setIsCustomCategoryConfirmed(true);
  };

  const handleAddCustomSubcategory = () => {
    if (selectedSubcategories.length >= MAX_SUBCATEGORIES) {
      setShowSubcategoryLimitModal(true);
      return;
    }

    if (!customSubcategory.trim()) return;

    const cleaned = customSubcategory.replace(/[^A-Za-z\s]/g, "");

    setSelectedSubcategories((prev = []) => {
      const slug = makeValueFromTitle(cleaned);
      if (prev.some((opt) => opt.value === slug)) return prev;
      return [...prev, { value: slug, label: cleaned }];
    });

    setCustomSubcategory("");
  };

  const handleRemoveSubcategory = (value) => {
    setSelectedSubcategories((prev = []) =>
      prev.filter((opt) => opt.value !== value)
    );
  };

  const handleLocationConfirmed = (locationInfo) => {
    console.log("📍 Location confirmed called with:", locationInfo);
    setLocationData({
      coords: locationInfo.coords,
      geoLocation: locationInfo.geoLocation,
      confirmed: true,
    });
  };

  const handleLocationModalClose = (allowed, errorMessage) => {
    setLocationModalClosed(true);
    if (!allowed && errorMessage) {
      setError(errorMessage);
      setShowErrorModal(true);
    }
  };

  const updateCustomSubcategorySelection = (text) => {
    setSelectedSubcategories((prev = []) => {
      const base = prev.filter(
        (opt) =>
          opt.value !== "other_custom_subcategory" &&
          opt.value !== "custom_subcategory"
      );

      if (!text.trim()) return base;

      const customOption = {
        value: "custom_subcategory",
        label: text,
      };

      if (base.length >= 5) return base;

      return [...base, customOption];
    });
  };

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const isValid =
    locationData.geoLocation !== "" &&
    locationData.confirmed &&
    selectedCategory !== null &&
    selectedSubcategories.length > 0 &&
    wordCount <= 300 &&
    payRate.trim() !== "" &&
    !isNaN(parseFloat(payRate)) &&
    parseFloat(payRate) >= MIN_PAY_RATE &&
    paymentType !== "";

  useEffect(() => {
    console.log("Location Data Updated:", locationData);
  }, [locationData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    console.log("Validation check:", {
      geoLocation: locationData.geoLocation,
      confirmed: locationData.confirmed,
      selectedCategory: selectedCategory !== null,
      hasSubcategories: selectedSubcategories.length > 0,

      wordCountValid: wordCount <= 300,
      payRateValid:
        payRate.trim() !== "" &&
        !isNaN(parseFloat(payRate)) &&
        parseFloat(payRate) >= MIN_PAY_RATE,
      overallValid: isValid,
    });

    if (!isValid) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not found or error occurred", userError);
      return;
    }

    const { data: existingSeeker, error: existingSeekerError } = await supabase
      .from("seeker")
      .select("*")
      .eq("seeker_id", user.id)
      .single();

    if (!existingSeeker) {
      alert("You are not authorized to edit please login first");
      return;
    }
  
    setHadPayRateBefore(!!existingSeeker.pay_rate);

    let uploadedImageUrl = null;
    console.log("Selected file:", profileImageFile);

    if (profileImageFile && profileImageFile.name) {
      const fileExt = profileImageFile.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("seeker-profile-pictures")
        .upload(filePath, profileImageFile, {
          contentType: profileImageFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Image upload failed:", uploadError);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("seeker-profile-pictures")
          .getPublicUrl(filePath);
        uploadedImageUrl = publicUrlData.publicUrl;
      }
    } else {

      uploadedImageUrl = previewUrl || null;
    }

    let uploadedCvUrl = null;
    console.log("Uploaded cv", cvFile);

    if (cvFile && cvFile.name) {
      const fileExt = cvFile.name.split(".").pop();
      const fileName = `${user.id}_cv_${Date.now()}.${fileExt}`;
      const filePath = `cv-documents/${fileName}`;

      const { error: cvUploadError } = await supabase.storage
        .from("seeker-cv-documents")
        .upload(filePath, cvFile, {
          contentType: cvFile.type,
          upsert: true,
        });

      if (cvUploadError) {
        console.error("CV upload failed:", cvUploadError);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("seeker-cv-documents")
          .getPublicUrl(filePath);
        uploadedCvUrl = publicUrlData.publicUrl;
        console.log("CV uploaded to:", uploadedCvUrl);
      }
    } else {
     
      uploadedCvUrl = cvFile?.url || null;
    }

   
    let mainCategoryValue;
    let subcatsToSave = [];
    let serviceId = null;
    let selectedSubcategoryIds = [];
    let customSubcategories = [];

    if (selectedCategory && selectedCategory.id) {
      serviceId = selectedCategory.id;
    }

    if (isCustomCategory) {
      mainCategoryValue = "other";
      customSubcategories = selectedSubcategories
        .filter((s) => s.value !== "other_custom_subcategory")
        .map((s) => s.label || s.value);
      subcatsToSave = selectedSubcategories
        .filter((s) => s.value !== "other_custom_subcategory")
        .map((s) => makeValueFromTitle(s.label || s.value));
    } else {
     
      mainCategoryValue = selectedCategory.value;

      const selectedIds = selectedSubcategories
        .filter((s) => s.id !== null && s.value !== "other_custom_subcategory" && s.value !== "custom_subcategory")
        .map((s) => parseInt(s.value))
        .filter((id) => !isNaN(id));

      const customSubs = selectedSubcategories
        .filter((s) => s.value === "custom_subcategory" || (s.id === null && s.value !== "other_custom_subcategory"))
        .map((s) => s.label || s.value);

      if (isCustomSubcategory && customSubcategory.trim()) {
        customSubs.push(customSubcategory.trim());
      }

      selectedSubcategoryIds = selectedIds;
      customSubcategories = customSubs;

      if (selectedIds.length > 0) {
        
        const { data: subcatNames } = await supabase
          .from("service_subcategory_fk")
          .select("name")
          .in("id", selectedIds);
        
        const names = subcatNames?.map((s) => makeValueFromTitle(s.name)) || [];
        subcatsToSave = [...names, ...customSubs.map((s) => makeValueFromTitle(s))];
      } else {
        subcatsToSave = customSubs.map((s) => makeValueFromTitle(s));
      }
    }

    const payload = {
      geo_location: locationData.geoLocation,
      latitude: locationData.coords.lat,
      longitude: locationData.coords.lon,
      main_category: mainCategoryValue,
      subcategories: subcatsToSave, 
      description,
      profile_picture: uploadedImageUrl,
      pay_rate: payRate,
      cv_document: uploadedCvUrl || null,
      payment_type: paymentType,
    };

    console.log("Submitting form:", payload);
    console.log("seeker id", user.id);

    setPendingPayload(payload);
    setPendingUserId(user.id);

    const payloadWithoutDescription = {
      ...payload,
      description: "", 
    };

    const seekerUpdate = {
      ...payloadWithoutDescription,
      service_id: serviceId,
      selected_subcategory_ids: selectedSubcategoryIds.length > 0 ? selectedSubcategoryIds : null,
      custom_subcategories: customSubcategories.length > 0 ? customSubcategories : null,
    };

    const { data, error } = await supabase
      .from("seeker")
      .update(seekerUpdate)
      .eq("seeker_id", user.id);

    if (error) {
      console.error("Update failed:", error);
      setError("Failed to update profile. Please try again.");
      setShowErrorModal(true);
      return;
    }

   console.log("Update successful:", data);

setShowDescriptionModal(true);
setIsGeneratingDescription(true);

try {
  const response = await fetch(
    "http://localhost:5000/api/generate-description",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_category: mainCategoryValue,
        subcategories: subcatsToSave,
      }),
    }
  );

  const result = await response.json();

  if (result.description) {
    setGeneratedDescription(result.description);
  } else {
    throw new Error("No description generated");
  }
} catch (err) {
  console.error("Description generation failed:", err);

  const categoryText = mainCategoryValue
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const subcategoryTexts = subcatsToSave.map((sub) =>
    sub
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );

  const fallbackDesc = `Experienced professional specializing in ${categoryText.toLowerCase()} services with expertise in ${subcategoryTexts
    .join(", ")
    .toLowerCase()}.\nCommitted to delivering high-quality work and excellent customer service with attention to detail and reliability.`;

  setGeneratedDescription(fallbackDesc);
} finally {
  setIsGeneratingDescription(false);
}
  };
  const handleDescriptionApproval = async (approved) => {
    if (!approved) {
      setShowDescriptionModal(false);
      setGeneratedDescription("");
      setPendingPayload(null);
      setPendingUserId(null);
      return;
    }

    if (!pendingPayload || !pendingUserId) {
      console.error("Missing pending data");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("seeker")
        .update({ description: generatedDescription })
        .eq("seeker_id", pendingUserId);

      if (updateError) {
        console.error("Failed to update description:", updateError);
        setError("Failed to save description. Please try again.");
        setShowErrorModal(true);
        return;
      }

      await fetch("http://localhost:5000/api/seeker/update-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seeker_id: pendingUserId,
          description: generatedDescription,
        }),
      });

      setShowDescriptionModal(false);
      setShowSuccessModal(true);
      setGeneratedDescription("");
      setPendingPayload(null);
      setPendingUserId(null);
    } catch (err) {
      console.error("Error saving description:", err);
      setError("Failed to save description. Please try again.");
      setShowErrorModal(true);
    }
  };
  const canAddCustomSubcategory = customSubcategory.trim().length > 0;
  const hasReachedMaxSubcategories =
    selectedSubcategories.length >= MAX_SUBCATEGORIES;

  return (
    <>
      <style>
        {`

.page-container button {
  width: 160px;
  padding: 12px 20px;
  background-color: #113b72; 
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-family: 'Playfair Display', serif;
  transition: background-color 0.3s ease, transform 0.2s ease;
  margin: 0 auto;
  display: block;
  opacity: 1 !important; 
  backdrop-filter: none !important; 
}

.page-container button:disabled {
  background-color: #556c85ff; 
  color: #ffffff;
  cursor: not-allowed;
  opacity: 1 !important; 
  backdrop-filter: none !important;
}

 


.page-container button:hover:enabled {
  background-color: #0d2f5c;
  transform: scale(1.02);
}
.page-container button.allow-btn:hover {
  background-color: #22a235ff;
}
.page-container button.deny-btn:hover {
  background-color: #d60b15ff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  border-radius:10px;
}

.modal-content {
  display: flex;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  max-width: 550px;
  width: 90%;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
}

.modal-left {
  background-color: #f7f7f7;
  padding: 20px 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  color: #111;
  border-right: 1px solid #ddd;
}

.modal-right {
  padding: 20px;
  flex: 1;
}

.modal-right p {
  margin-bottom: 20px;
  font-size: 15px;
  color: #333;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-buttons button {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-family: 'Playfair Display', serif;
}

.description-modal-content {
  max-width: 600px !important;

}

.description-text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  white-space: pre-line;
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  font-family: 'Segoe UI', sans-serif;
}

.description-hint {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  font-style: italic;
  text-align: center;
}      .page-container{
      margin: 0;
        padding: 0;
      height: 100%;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
      }

.allow-btn {
  background-color: #11561b; /* dark green */
  color: white;
}

.allow-btn:hover {
  background-color: #1d7a29; /* brighter green */
}

.deny-btn {
  background-color: #a9060e; /* strong red */
  color: white;
}

.deny-btn:hover {
  background-color: #d4171f; /* brighter red */
}

.remove-btn {
width: 160px;
  padding: 12px 20px;
  background-color: #036586; 
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-family: 'Playfair Display', serif;
  transition: background-color 0.3s ease, transform 0.2s ease;
  margin: 0 auto;
  display: block;
  opacity: 1 !important; 
  backdrop-filter: none !important; 
}

___________________________________________
.page-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  
  background: #f4f6f8; /* light neutral background */
}

.form-container {
  display: flex;
  gap: 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  // padding: 20px;
  padding-left:20px;
  max-width: 1100px;
  // width: 95%;
  width:960px;
  margin-left:13px;
}

.form-wrapper {
  flex: 2;
}

.form-wrapper form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

form h2 {
margin-top:22px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 21px;
  color: #113b72;
   font-family: 'Segoe UI', sans-serif;
  // font-style: italic;
  // text-shadow: 2px 2px 3px white;
}

      label {
        display: block;
        margin-bottom: 10px;
        font-weight: semibold;
        color: black;
        font-size:15px;
      }

.form-wrapper label {
  font-weight: 600;
  margin-bottom: 10px;
}

.form-wrapper input,
.form-wrapper textarea,
.form-wrapper select {
  width: 96%;
  // margin-bottom: 11px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
  

.image-upload-container {
  // flex: 1;
  width:300px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  backdrop-filter: blur(12px);
  backdrop-filter: blur(4px);
  // border: 1px solid black;
  border-radius: 12px;
  padding: 20px;
  color: white;
  text-align: center;
}

.form-content{
  width:600px;
}

.upload-label {
  font-weight: 600;
  display: block;
  margin-bottom: 10px;
  color:black;
}

.custom-file-upload {
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
  background: #0e4c27;
  color: white;
  border-radius: 6px;
  margin-bottom:0px;
}

.hidden-file-input {
  display: none;
}

.file-name {
  display: block;
  // margin-top: 8px;
  font-size: 0.9rem;
  word-break: break-word;
  color:black;
  margin-bottom:40px;
}
  
@media (max-width: 500px) {
  .page-container {
    padding: 10px;
    width: 100%;
    overflow-x: hidden;
  }
  
  .form-container {
    flex-direction: column;
    width: 95%;
    margin-left: 0;
    padding: 15px;
    gap: 15px;
  }
  
  .form-wrapper {
    width: 100%;
  }
  
  .form-content {
    width: 100%;
  }
}

@media (max-width: 500px) {
  .form-wrapper input,
  .form-wrapper textarea,
  .form-wrapper select {
    width: 100%;
    padding: 10px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
  
  form h2 {
    font-size: 18px;
    margin-top: 10px;
  }
}

@media (max-width: 500px) {
  /* Update the modal positioning */
  .modal-content {
    width: 95%;
    margin: 0 auto;
    padding-top:40px;
  }
  
  /* For the category selection modal */
  div[style*="max-width: 650px"] {
    margin-left: 0 !important;
    width: 90% !important;
    max-height: 80vh !important;
    padding: 15px !important;
  }
  
  /* Adjust category items for mobile */
  div[style*="display: flex; flex-direction: row"] {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }
  
  /* Hide Urdu labels on very small screens if needed */
  div[style*="direction: rtl"] {
    font-size: 14px !important;
  }
}

@media (max-width: 500px) {
  .image-upload-container {
    width: 93%;
    margin-top: 20px;
    padding: 15px;
    margin-left:0px;
  }
  
  .image-upload-container img {
    width: 150px;
    height: 150px;
  }
}

@media (max-width: 500px) {
  .page-container button,
  .modal-buttons button,
  .remove-btn,
  .submit-btn {
    width: 100% !important;
    margin: 10px 0 !important;
  }
  
  .modal-buttons {
    flex-direction: column;
  }

  
}

@media (max-width: 500px) {
  /* Pay rate input */
  input[style*="width: 570px"] {
    width: 100% !important;
  }
  
  /* Payment type select */
  select[style*="width: 570px"] {
    width: 100% !important;
  }
  
  /* Subcategory input container */
  div[style*="display: flex; align-items: center; margin-top: 8px; gap: 8px"] {
    flex-direction: column;
    gap: 10px !important;
  }
  
  /* The add button inside subcategory */
  button[style*="+ Tap to add"],
  button[style*="+ Click here to add"] {
    width: 100% !important;
    margin-top: 5px !important;
  }
}

@media (max-width: 500px) {
  /* Pay rate input */
  input[style*="width: 570px"] {
    width: 100% !important;
  }
  
  /* Payment type select */
  select[style*="width: 570px"] {
    width: 100% !important;
  }
  
  /* Subcategory input container */
  div[style*="display: flex; align-items: center; margin-top: 8px; gap: 8px"] {
    flex-direction: column;
    gap: 10px !important;
  }
  
  /* The add button inside subcategory */
  button[style*="+ Tap to add"],
  button[style*="+ Click here to add"] {
    width: 100% !important;
    margin-top: 5px !important;
  }
}

@media (max-width: 500px) {
  /* Target the react-select container */
  .css-13cymwt-control,
  .css-t3ipsp-control {
    min-height: 50px !important; /* Better touch target */
  }
  
  .css-1d8n9bt {
    padding: 4px 8px !important;
  }
}

@media (max-width: 500px) {
  .tips {
    font-size: 12px;
    padding: 8px;
  }
  
  label {
    font-size: 14px;
    margin-bottom: 6px;
  }
  
  .custom-file-upload {
    padding: 10px 15px;
    width: 93%;
    text-align: center;
  }
}

@media (max-width: 500px) {
  .description-modal-content {
    max-width: 95% !important;
    width: 95% !important;
    margin: 10px;
    flex-direction: column;
    height: 700px;
    padding-top:80px;
    padding-bottom:50px;
  }
  
  .modal-left {
    padding: 15px;
    min-width: auto;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }
  
  .modal-right {
    padding: 15px;
  }
  
  .description-text {
    font-size: 14px !important;
    line-height: 1.6 !important;
    padding: 12px !important;
    max-height: 40vh;
    overflow-y: auto;
  }
  
  .description-hint {
    font-size: 13px !important;
    padding: 0 10px;
  }
  
  .modal-buttons {
    flex-direction: column !important;
    gap: 10px !important;
  }
  
  .modal-buttons button {
    width: 100% !important;
    margin: 0 !important;
    padding: 12px !important;
  }
}

        `}
      </style>
      <>

        {showDescriptionModal && (
          <div className="modal-overlay">
            <div className="modal-content description-modal-content">
              <div
                className="modal-left"
                style={{
                  backgroundColor: "#f0f7ff",
                  background:
                    "linear-gradient(135deg, #113b72 0%, #1f6bb5 100%)",
                  color: "#ffffff",
                }}
              >
                <h3 style={{ color: "#ffffff", margin: 0 }}>
                  ✨ Generated Description
                </h3>
              </div>
              <div className="modal-right">
                {isGeneratingDescription ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <p style={{ fontSize: "16px", color: "#666" }}>
                      Generating professional description...
                    </p>
                    <div
                      style={{
                        marginTop: "20px",
                        display: "inline-block",
                        width: "40px",
                        height: "40px",
                        border: "4px solid #f3f3f3",
                        borderTop: "4px solid #113b72",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  </div>
                ) : (
                  <>
                    <p className="description-text">{generatedDescription}</p>
                    <p className="description-hint">
                      Does this description look good? You can approve it or go
                      back to edit your categories.
                    </p>
                    <div className="modal-buttons">
                      <button
                        className="deny-btn"
                        onClick={() => handleDescriptionApproval(false)}
                        style={{ marginRight: "10px" }}
                      >
                        Edit Categories
                      </button>
                      <button
                        className="allow-btn"
                        onClick={() => handleDescriptionApproval(true)}
                      >
                        Looks Good ✓
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-left">
                <h3>Success</h3>
              </div>
              <div className="modal-right">
                <p>
                  Your profile has been updated successfully. <br />
                  You're being taken to the next step.
                </p>

                <div className="modal-buttons">
                  <button
                    className="allow-btn"
                    onClick={() => {
                      setShowSuccessModal(false);
                      if (typeof setSelectedView === "function") {
                        setSelectedView("availability");
                      }
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showErrorModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div
                className="modal-left"
                
              >
                <h3 style={{ color: "#a9060e" }}>Error</h3>
              </div>
              <div className="modal-right">
                <p>{error}</p>
                <div className="modal-buttons">
                  <button
                    className="deny-btn"
                    onClick={() => setShowErrorModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSubcategoryLimitModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-left">
                <h3 style={{ color: "#a9060e" }}>Limit Reached</h3>
              </div>

              <div className="modal-right">
                <p>
                  You have already selected 5 subcategories.
                  <br />
                  You can’t add more.
                </p>
                <div className="modal-buttons">
                  <button
                    className="deny-btn"
                    onClick={() => setShowSubcategoryLimitModal(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="page-container">
          <div className="form-container">
            <form className="form-content" onSubmit={handleSubmit}>
              <h2>Enter Your Skills Information</h2>

              <div>
                <label>Your Location:</label>
                <LocationSelector
                  onLocationConfirmed={handleLocationConfirmed}
                  initialCoords={locationData.coords}
                  initialGeoLocation={locationData.geoLocation}
                  onModalClose={handleLocationModalClose}
                  readOnly={false}
                  hasExistingLocation={hasExistingLocation}
                  isLoading={loading}
                />

                {formSubmitted && !locationData.confirmed && (
                  <p
                    style={{
                      color: "#d4171f",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    Please confirm your location to proceed.
                  </p>
                )}
                {formSubmitted &&
                  (!locationData.coords.lat || !locationData.coords.lon) && (
                    <p
                      style={{
                        color: "#d4171f",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      Please select a valid location.
                    </p>
                  )}
              <p className="tips">
            <strong>Tips:</strong> For best results, include street, area, and
            city in your address. Avoid abbreviations and ensure correct
            spelling. For hard-to-find locations, use nearby landmarks like
            shopping malls or major buildings.
          </p>
              </div>

              <div>
                <label>Your Job Category:</label>

                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    width: "100%",
                    border: "1px solid #ccc",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "#e8f3ff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "15px",
                    color: "#000",
                  }}
                >
                  <span
                    style={{
                      color: selectedCategory ? "#000" : "#666",
                    }}
                  >
                    {selectedCategory
                      ? selectedCategory.label
                      : "Tap to select a job category"}
                  </span>

                  <span style={{ fontSize: "18px", opacity: 0.7 }}>▼</span>
                </button>

                {showCategoryModal && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 9999,
                    }}
                  >
                    <div
                      style={{
                        width: "95%",
                        maxWidth: "650px",
                        maxHeight: "85vh",
                        overflowY: "auto",
                        background: "#fff",
                        marginLeft: "-280px",

                        borderRadius: "16px",
                        padding: "22px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          marginBottom: "16px",
                          paddingRight: "32px", 
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "20px",
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          Select Category
                        </h3>

                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(false)}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            fontSize: "30px",
                            cursor: "pointer",
                            lineHeight: 1,
                            color: "#000",
                          }}
                        >
                          ×
                        </button>
                      </div>

                      {categoryOptions.map((cat) => (
                        <div
                          key={cat.value}
                          onClick={() => {
                            handleCategoryChange(cat);
                            setShowCategoryModal(false);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            padding: "18px 12px",
                            borderBottom: "1px solid #eee",
                            cursor: "pointer",
                            transition: "0.2s",
                          }}
                        >
                          <div
                            style={{
                              minWidth: "55px",
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            {cat.iconUrl && (
                              <img
                                src={cat.iconUrl}
                                alt={cat.label}
                                style={{
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "6px",
                                  objectFit: "cover",
                                  marginLeft: "10px",
                                }}
                              />
                            )}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div
                              style={{ fontSize: "17px", fontWeight: "600" }}
                            >
                              {cat.label}
                            </div>
                          </div>

                       
                          <div
                            style={{
                              minWidth: "140px",
                              textAlign: "right",
                              fontSize: "17px",
                              color: "#444",
                              direction: "rtl",
                              unicodeBidi: "bidi-override",
                            }}
                          >
                            {cat.urduLabel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formSubmitted && !selectedCategory && (
                  <p>Please select a job category.</p>
                )}

              </div>
              
              <div>
                

                <div style={{ marginTop: "20px" }}>
                  <label>
                    {isCustomCategory
                      ? "Don't have a main category? Write down your top skills (5 at most):"
                      : "Subcategory (max 5):"}
                  </label>
                </div>

                {!selectedCategory ? (
                  <p style={{ fontSize: "12px", color: "#666" }}>
                    Select a main category first.
                  </p>
                ) : isCustomCategory ? (
               
                  <>
                   
                    {selectedSubcategories.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginBottom: "10px",
                        }}
                      >
                        {selectedSubcategories.map((opt) => (
                          <span
                            key={opt.value}
                            style={{
                              padding: "4px 6px",
                              borderRadius: "20px",
                              background: "#98ccedff",
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "#0b0b0cff",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                              border: "1px solid #dce3f0",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "1px",
                            }}
                          >
                            <span>{opt.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubcategory(opt.value)}
                              style={{
                                border: "none",
                                fontWeight: "700",
                                background: "transparent",
                                color: "#0e0e0eff",
                                cursor: "pointer",
                                fontSize: "20px",
                                lineHeight: 1,
                                padding: 0,
                                display: "flex",
                                alignItems: "left",
                                justifyContent: "center",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: "8px",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="text"
                  
                        placeholder={
                          hasReachedMaxSubcategories
                            ? "You already added 5 skills"
                            : "Type a skill and press the + button to add"
                        }
                        value={customSubcategory}
                        onChange={(e) => {
                          if (hasReachedMaxSubcategories) return; 
                          setCustomSubcategory(e.target.value);
                        }}
                        onKeyDown={handleCustomSubcategoryKeyDown}
                        disabled={hasReachedMaxSubcategories}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          backgroundColor: hasReachedMaxSubcategories
                            ? "#f0f0f0"
                            : "#e8f3ff",
                          color: hasReachedMaxSubcategories ? "#999" : "#000",
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleAddCustomSubcategory}
                        disabled={!canAddCustomSubcategory}
                        style={{
                          width: "auto", 
                          minWidth: "42px", 
                          height: "36px",
                          padding: "0 12px", 
                          borderRadius: "999px",
                          border: "none",
                          background: canAddCustomSubcategory
                            ? "linear-gradient(135deg, #113b72, #1f6bb5)"
                            : "#ccc",
                          color: "#fff",
                          fontSize: "15px", 
                          fontWeight: "500",
                          lineHeight: "1",
                          cursor: canAddCustomSubcategory
                            ? "pointer"
                            : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: canAddCustomSubcategory ? 1 : 0.6,
                          gap: "6px",
                          fontSize: "12px",
                        }}
                      >
                        
                        <span
                          style={{ fontSize: "11px", letterSpacing: "0.3px" }}
                        >
                          + Tap to add
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Select
                      isMulti
                      isDisabled={!selectedCategory}
                      options={subcategoryOptions}
                      value={selectedSubcategories}
                      onChange={handleSubcategoryChange}
                      placeholder="Select subcategories"
                      styles={subcategorySelectStyles}
                      formatOptionLabel={(option) => (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <span>{option.label}</span>

                          {option.urduLabel && (
                            <span
                              style={{
                                marginLeft: "24px",
                                fontSize: "0.9rem",
                                color: "#555",
                                direction: "rtl",
                                unicodeBidi: "bidi-override",
                              }}
                            >
                              {option.urduLabel}
                            </span>
                          )}
                        </div>
                      )}
                    />


                    {formSubmitted && selectedSubcategories.length > 5 && (
                      <p
                        style={{
                          color: "#d4171f",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        You can select up to 5 subcategories only.
                      </p>
                    )}

   
                    {formSubmitted &&
                      selectedCategory &&
                      selectedSubcategories.length === 0 && (
                        <p
                          style={{
                            color: "#d4171f",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {isCustomCategory
                            ? "Please add at least one skill."
                            : "Please select at least one subcategory."}
                        </p>
                      )}
                  </>
                )}
              </div>

              <div>
                <label>Your Expected Pay Rate:</label>
                <input
                  type="text"
                  value={payRate}
                  className="simple-input"
                  onChange={(e) => setPayRate(e.target.value)}
                  placeholder={
                    selectedCategory
                      ? `Minimum: ${MIN_PAY_RATE} PKR/hr`
                      : "e.g. 500 PKR/hr"
                  }
                  style={{
                    width: "570px",
                    padding: "12px 14px",
                    fontSize: "16px",
                    backgroundColor: "#e8f3ff",
                    color: "#000",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />

                {formSubmitted && payRate.trim() === "" && (
                  <p
                    style={{
                      color: "#d4171f",
                      fontSize: "16px",
                      marginTop: "4px",
                    }}
                  >
                    Pay rate is required.
                  </p>
                )}

                {formSubmitted &&
                  payRate.trim() !== "" &&
                  isNaN(parseFloat(payRate)) && (
                    <p
                      style={{
                        color: "#d4171f",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      Enter a valid number for pay rate.
                    </p>
                  )}

                {formSubmitted &&
                  !isNaN(parseFloat(payRate)) &&
                  parseFloat(payRate) < MIN_PAY_RATE && (
                    <p
                      style={{
                        color: "#d4171f",
                        fontSize: "16px",
                        marginTop: "4px",
                      }}
                    >
                      Minimum pay rate is {MIN_PAY_RATE} PKR/hr.
                    </p>
                  )}
              </div>

              <div>
                <label>Payment Option:</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  style={{
                    width: "600px",
                    padding: "12px 14px",
                    fontSize: "16px",
                    backgroundColor: "#e8f3ff",
                    color: "#000",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                >
                  <option value="">Select payment option</option>
                  <option value="Cash Payment">Cash Payment</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>

                {formSubmitted && paymentType === "" && (
                  <p
                    style={{
                      color: "#d4171f",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    Please select a payment option.
                  </p>
                )}
              </div>

           
            <button
  style={{ marginBottom: "15px", marginTop: "15px" }}
  type="submit"
  className="submit-btn"
  disabled={isGeneratingDescription}
>
  {isGeneratingDescription ? "Please wait..." : "Submit"}
</button>

            </form>
            <div className="image-upload-container">
              <img
                src={
                  previewUrl ||
                  "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                }
                alt="Profile Preview"
                style={{
                  width: "190px",
                  height: "190px",
                  objectFit: "cover",
                  borderRadius: "100px",
                  border: "1px solid #000",
                  marginTop: "10px",
                }}
              />

              <label className="upload-label">Upload Profile Picture:</label>

              <label htmlFor="profileImage" className="custom-file-upload">
                Choose File
              </label>

              <input
                id="profileImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setProfileImageFile(file);
                  if (file) setPreviewUrl(URL.createObjectURL(file));
                }}
                className="hidden-file-input"
              />
              
              <div
                style={{
                  marginTop: "25px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px", 
                }}
              >
                <label className="upload-label">Upload CV (optional):</label>

                <label
                  htmlFor="cvFile"
                  className="custom-file-upload"
                  style={{ marginBottom: "6px" }} 
                >
                  Choose File
                </label>

                <input
                  id="cvFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setCvFile(file);
                    if (file) {
                      setCvFileName(file.name);
                    }
                  }}
                  className="hidden-file-input"
                />

                
                {cvFile?.url && (
                  <button
                    type="button"
                    onClick={() => window.open(cvFile.url, "_blank")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      backgroundColor: "#113b72",
                      color: "#fff",
                      cursor: "pointer",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginTop: "4px",
                    }}
                  >
                    View CV
                  </button>
                )}

                
                {cvFile && !cvFile.url && (
                  <span className="file-name" style={{ marginTop: "4px" }}>
                    {cvFileName}
                  </span>
                )}

               
                {!cvFile && !cvFileName && (
                  <span className="file-name" style={{ marginTop: "4px" }}>
                    No file chosen
                  </span>
                )}

                
                {(cvFile || cvFileName) && (
                  <button
                    className="remove-btn"
                    type="button"
                    style={{ marginTop: "6px" }} 
                    onClick={async () => {
                      if (cvFile?.url) {
                        const path = cvFile.url.split(
                          "/seeker-cv-documents/"
                        )[1];
                        if (path) {
                          const { error: deleteError } = await supabase.storage
                            .from("seeker-cv-documents")
                            .remove([path]);
                          if (deleteError) {
                            console.error("Error deleting CV:", deleteError);
                            return;
                          }
                        }
                      }
                      setCvFile(null);
                      setCvFileName("");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    </>
  );
};

export default SeekerProfileForm;
