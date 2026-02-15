import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "../styles/SeekerRequests.css";
import { useNavigate } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import supabase from "../supabaseClient.js";

const renderStars = (rating) => {
  if (!rating) return null;

  const stars = [];
  const rounded = Math.round(rating * 2) / 2; 
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded % 1 !== 0;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<FaStar key={i} />);
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(<FaStarHalfAlt key={i} />);
    } else {
      stars.push(<FaRegStar key={i} />);
    }
  }

  return stars;
};

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedPosterReviews, setSelectedPosterReviews] = useState([]);
  const [selectedPosterName, setSelectedPosterName] = useState("");
  const [processingTask, setProcessingTask] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showExtendTimeModal, setShowExtendTimeModal] = useState(false);
  const [selectedTaskForExtension, setSelectedTaskForExtension] = useState(null);
  const [availableHours, setAvailableHours] = useState(0);
  const [selectedExtensionHours, setSelectedExtensionHours] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTaskForCancel, setSelectedTaskForCancel] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
  const isAnyModalOpen =
    showCompletionModal || showExtendTimeModal || showCancelModal || showReviewsModal || !!modalMessage;

  document.body.classList.toggle("modal-open", isAnyModalOpen);

  return () => document.body.classList.remove("modal-open");
}, [showCompletionModal, showExtendTimeModal, showCancelModal, showReviewsModal, modalMessage]);

  useEffect(() => {
    if (!userId) return;

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from("hire_requests")
          .select(
            `
            id,
            status,
            date,
            slots,
            created_at,
            poster_id,
            task_id,
            task_status,
            task:task_id (
              description,
              geo_location,
              services:category_id (
                title
              )
            ),
            profiles:poster_id (
              first_name,
              last_name,
              is_active,
              gender,
              date_of_birth,
              phone,
              cnic_url
            )
          `
          )
          .eq("seeker_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching tasks:", error);
          setLoading(false);
          return;
        }

        const filtered = (data || []).filter((r) => r.profiles?.is_active);

        const posterIds = filtered.map((r) => r.poster_id);
        const { data: posters } = await supabase
          .from("poster")
          .select("poster_id, profile_picture")
          .in("poster_id", posterIds);

        const posterMap = {};
        (posters || []).forEach((p) => {
          posterMap[p.poster_id] = p.profile_picture;
        });

        let myRatingsMap = new Map();
        try {
          const ratingsRes = await fetch(
            `http://localhost:5000/api/rating-reviews/by-reviewer/${userId}`
          );
          if (ratingsRes.ok) {
            const ratingsJson = await ratingsRes.json();
            (ratingsJson.ratings || []).forEach((rr) => {
              myRatingsMap.set(rr.task_id, rr);
            });
          }
        } catch (e) {
          console.error("Failed to fetch ratings for seeker:", e);
        }

        let posterRatingsMap = {};
        let posterReviewsMap = {};
        if (posterIds.length > 0) {
          const { data: posterRatings, error: posterRatingsError } = await supabase
            .from("rating_reviews")
            .select("id, reviewed_user_id, rating, review, reviewer_id, created_at")
            .in("reviewed_user_id", posterIds)
            .order("created_at", { ascending: false });

          if (posterRatingsError) {
            console.error("Error fetching poster ratings:", posterRatingsError);
          } else if (posterRatings && posterRatings.length > 0) {
            const reviewerIds = [
              ...new Set(
                posterRatings
                  .map((r) => r.reviewer_id)
                  .filter((id) => !!id)
              ),
            ];

            let profilesById = {};
            let seekerPicsById = {};
            let posterPicsById = {};

            if (reviewerIds.length > 0) {
              const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, first_name, last_name")
                .in("id", reviewerIds);

              if (!profilesError && profilesData) {
                profilesById = profilesData.reduce((acc, p) => {
                  acc[p.id] = p;
                  return acc;
                }, {});
              }

              const { data: seekerPics, error: seekerPicsError } = await supabase
                .from("seeker")
                .select("seeker_id, profile_picture")
                .in("seeker_id", reviewerIds);

              if (!seekerPicsError && seekerPics) {
                seekerPicsById = seekerPics.reduce((acc, s) => {
                  acc[s.seeker_id] = s.profile_picture;
                  return acc;
                }, {});
              }

              const { data: posterPics, error: posterPicsError } = await supabase
                .from("poster")
                .select("poster_id, profile_picture")
                .in("poster_id", reviewerIds);

              if (!posterPicsError && posterPics) {
                posterPicsById = posterPics.reduce((acc, p) => {
                  acc[p.poster_id] = p.profile_picture;
                  return acc;
                }, {});
              }
            }

            const enrichedReviews = posterRatings.map((rr) => {
              const reviewerProfile = profilesById[rr.reviewer_id] || null;
              const reviewerName = reviewerProfile
                ? `${reviewerProfile.first_name || ""} ${reviewerProfile.last_name || ""}`.trim()
                : "Anonymous user";
              const reviewerProfilePicture =
                seekerPicsById[rr.reviewer_id] ||
                posterPicsById[rr.reviewer_id] ||
                null;

              return {
                ...rr,
                reviewerName,
                reviewerProfilePicture,
              };
            });

            enrichedReviews.forEach((rr) => {
              const uid = rr.reviewed_user_id;
              if (!posterRatingsMap[uid]) {
                posterRatingsMap[uid] = { sum: 0, count: 0 };
                posterReviewsMap[uid] = [];
              }
              posterRatingsMap[uid].sum += rr.rating;
              posterRatingsMap[uid].count += 1;
              posterReviewsMap[uid].push(rr);
            });
          }
        }

        const enrichedTasks = filtered.map((r) => {
          const ratingAgg = posterRatingsMap[r.poster_id];
          let posterRating = null;
          if (ratingAgg && ratingAgg.count > 0) {
            posterRating = {
              average: ratingAgg.sum / ratingAgg.count,
              count: ratingAgg.count,
            };
          }

          return {
            ...r,
            task_description: r.task?.description || "",
            task_category: r.task?.services?.title || "",
            task_location: r.task?.geo_location || "",
            poster_profile_picture: posterMap[r.poster_id] || null,
            ratingReview: myRatingsMap.get(r.task_id) || null,
            posterRating,
            posterReviews: posterReviewsMap[r.poster_id] || [],
          };
        });

        setTasks(enrichedTasks);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setLoading(false);
      }
    };

    fetchTasks();
  }, [userId]);


  useEffect(() => {
    if (!userId || !scheduleDate) return;

    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const { data, error } = await supabase
          .from("hire_requests")
          .select(
            `
            id,
            date,
            slots,
            task_id,
            task_status,
            task:task_id (
              description,
              main_category
            )
          `
          )
          .eq("seeker_id", userId)
          .eq("status", "accepted")
          .eq("date", scheduleDate)
          .order("slots", { ascending: true });

        if (error) {
          console.error("Error fetching schedule:", error);
          setScheduleTasks([]);
          setLoadingSchedule(false);
          return;
        }

        setScheduleTasks(data || []);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setScheduleTasks([]);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, [userId, scheduleDate]);

  const handleMessage = (req) => {
    navigate(`/messages/${req.id}`, { state: { request: req } });
  };

  const handleProvideRating = (req) => {
    navigate("/provide-rating", {
      state: {
        taskId: req.task_id,
        posterId: req.poster_id,
        posterName:
          `${req.profiles?.first_name || ""} ${
            req.profiles?.last_name || ""
          }`.trim() || "User",
        existingRating: req.ratingReview?.rating || null,
        existingReview: req.ratingReview?.review || "",
        returnTo: "/seeker-dashboard",
      },
    });
  };

  const handleViewPosterReviews = (req) => {
    setSelectedPosterReviews(req.posterReviews || []);
    setSelectedPosterName(
      `${req.profiles?.first_name || ""} ${
        req.profiles?.last_name || ""
      }`.trim() || "Poster"
    );
    setShowReviewsModal(true);
  };

  const handleReportComplaint = (req) => {
    navigate(`/report-complaint`, {
      state: {
        requestId: req.id,
        taskId: req.task_id,
        posterId: req.poster_id,
        posterName: `${req.profiles?.first_name || ""} ${req.profiles?.last_name || ""}`,
      },
    });
  };

 
  const has30MinutesPassed = (task) => {
    if (!task.date || !task.slots || task.slots.length === 0) return false;
    if (task.task_status?.toLowerCase() !== "current") return false;

    try {
      const firstSlot = Array.isArray(task.slots) ? task.slots[0] : task.slots;
      if (!firstSlot || typeof firstSlot !== "string") return false;

      const [startTime] = firstSlot.split("-");
      if (!startTime) return false;

  
      let dateStr = task.date;
      if (dateStr instanceof Date) {
        dateStr = dateStr.toISOString().split("T")[0];
      } else if (dateStr.includes("T")) {
        dateStr = dateStr.split("T")[0];
      }

      const slotStartDateTime = new Date(`${dateStr} ${startTime.trim()}`);
      if (isNaN(slotStartDateTime.getTime())) {
        console.error("Invalid date/time:", dateStr, startTime);
        return false;
      }

      const thirtyMinutesLater = new Date(slotStartDateTime.getTime() + 30 * 60 * 1000);
      const now = new Date();

      return now >= thirtyMinutesLater;
    } catch (error) {
      console.error("Error checking 30 minutes:", error);
      return false;
    }
  };

  const getNearestHour = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour;
  };

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const updateSlotsOnCompletion = (slots, taskDate, nearestHour) => {
    if (!slots || slots.length === 0) return slots;

    const slotsArray = Array.isArray(slots) ? [...slots] : [slots];
    if (slotsArray.length === 0) return slotsArray;

    const now = new Date();
    const nearestHourTime = formatTime(nearestHour);
    
    let dateStr = taskDate;
    if (dateStr instanceof Date) {
      dateStr = dateStr.toISOString().split("T")[0];
    } else if (dateStr && dateStr.includes("T")) {
      dateStr = dateStr.split("T")[0];
    }

    if (!dateStr) {
      console.error("Invalid date:", taskDate);
      return slotsArray;
    }

    let activeSlotIndex = -1;
    
    for (let i = 0; i < slotsArray.length; i++) {
      const slot = slotsArray[i];
      if (!slot || typeof slot !== "string") continue;
      
      const [startTime, endTime] = slot.split("-").map(s => s.trim());
      if (!startTime || !endTime) continue;

      try {

        const slotStart = new Date(`${dateStr} ${startTime}`);
        const slotEnd = new Date(`${dateStr} ${endTime}`);
        
        if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
          console.error("Invalid slot time:", startTime, endTime);
          continue;
        }


        if (now >= slotStart) {
          activeSlotIndex = i;
        } else {

          break;
        }
      } catch (error) {
        console.error("Error parsing slot:", error);
        continue;
      }
    }

  
    if (activeSlotIndex === -1) {
      console.warn("No active slot found, using first slot");
      activeSlotIndex = 0;
    }


    const activeSlot = slotsArray[activeSlotIndex];
    if (!activeSlot || typeof activeSlot !== "string") {
      console.error("Invalid active slot");
      return slotsArray;
    }

    const [startTime] = activeSlot.split("-").map(s => s.trim());
    if (!startTime) {
      console.error("Invalid start time in slot");
      return slotsArray;
    }

    
    const updatedSlot = `${startTime}-${nearestHourTime}`;

    const result = slotsArray.slice(0, activeSlotIndex + 1);
    result[activeSlotIndex] = updatedSlot;
    
    console.log("Updated slots:", {
      original: slotsArray,
      updated: result,
      activeSlotIndex,
      nearestHourTime
    });
    
    return result;
  };

  const handleCompleteTask = async (task) => {
    if (processingTask) return;

    try {
      setProcessingTask(task.id);

      const nearestHour = getNearestHour();
      const updatedSlots = updateSlotsOnCompletion(task.slots, task.date, nearestHour);

      const { data, error } = await supabase
        .from("hire_requests")
        .update({
          slots: updatedSlots,
        })
        .eq("id", task.id)
        .select();

      if (error) {
        console.error("Error updating slots:", error);
        setModalMessage("Failed to update task slots. Please try again.");
        setProcessingTask(null);
        return;
      }

      const { error: paymentError } = await supabase
        .from("payment")
        .update({ status: "pending" })
        .eq("task_id", task.task_id);

      if (paymentError) {
        console.error("Error updating payment status:", paymentError);
        console.warn("Slots updated but payment status update failed");
      }

    const { error: notifError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: task.poster_id, 
          message: `The seeker has completed the task.`,
          status: "TaskCompleted",
          read: false,
          related_id: task.task_id,
        },
      ]);

    if (notifError) {
      console.error("Poster notification error:", notifError.message);
    }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id
            ? { ...t, slots: updatedSlots }
            : t
        )
      );

      setModalMessage("Task slots updated successfully! Payment status set to pending.");
      setProcessingTask(null);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error completing task:", error);
      setModalMessage("An error occurred. Please try again.");
      setProcessingTask(null);
    }
  };

  const getLastSlotEndTime = (slots) => {
    if (!slots || slots.length === 0) return null;
    const slotsArray = Array.isArray(slots) ? slots : [slots];
    if (slotsArray.length === 0) return null;
    
    const lastSlot = slotsArray[slotsArray.length - 1];
    if (!lastSlot || typeof lastSlot !== "string") return null;
    
    const parts = lastSlot.split("-");
    if (parts.length !== 2) return null;
    
    return parts[1].trim();
  };

  const getFirstSlotStartTime = (slots) => {
    if (!slots || slots.length === 0) return null;
    const slotsArray = Array.isArray(slots) ? slots : [slots];
    if (slotsArray.length === 0) return null;
    
    const firstSlot = slotsArray[0];
    if (!firstSlot || typeof firstSlot !== "string") return null;
    
    const parts = firstSlot.split("-");
    if (parts.length !== 2) return null;
    
    return parts[0].trim();
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };


  const findNextTask = (currentTask, allTasks) => {
    const currentTaskDate = currentTask.date instanceof Date 
      ? currentTask.date.toISOString().split("T")[0]
      : (currentTask.date?.includes("T") ? currentTask.date.split("T")[0] : currentTask.date);
    
    const currentLastSlotEnd = getLastSlotEndTime(currentTask.slots);
    if (!currentLastSlotEnd) return null;

    const currentEndMinutes = timeToMinutes(currentLastSlotEnd);
    const currentDateObj = currentTaskDate ? new Date(currentTaskDate + "T00:00:00") : null;
    if (!currentDateObj || isNaN(currentDateObj.getTime())) return null;

    let nextTask = null;
    let minTimeDiff = Infinity;

    allTasks.forEach((task) => {
      if (task.id === currentTask.id) return;
      
      const taskStatus = (task.task_status || "").toLowerCase();
      if (!["current", "pending", "payment_pending"].includes(taskStatus)) return;

      const taskDate = task.date instanceof Date
        ? task.date.toISOString().split("T")[0]
        : (task.date?.includes("T") ? task.date.split("T")[0] : task.date);
      
      if (!taskDate) return;
      
      const taskFirstSlotStart = getFirstSlotStartTime(task.slots);
      if (!taskFirstSlotStart) return;

      const taskStartMinutes = timeToMinutes(taskFirstSlotStart);
      const taskDateObj = new Date(taskDate + "T00:00:00");
      if (isNaN(taskDateObj.getTime())) return;

      let timeDiff;
      if (taskDate === currentTaskDate) {
        if (taskStartMinutes > currentEndMinutes) {
          timeDiff = taskStartMinutes - currentEndMinutes;
        } else {
          return; 
        }
      } else if (taskDateObj > currentDateObj) {
        const hoursRemainingToday = (timeToMinutes("22:00") - currentEndMinutes) / 60;
        const daysDiff = Math.floor((taskDateObj - currentDateObj) / (1000 * 60 * 60 * 24));
        const hoursInTaskDay = taskStartMinutes / 60;
        timeDiff = hoursRemainingToday + (daysDiff - 1) * 24 + hoursInTaskDay;
      } else {
        return; 
      }

      if (timeDiff > 0 && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nextTask = task;
      }
    });

    return nextTask;
  };

  const calculateAvailableHours = (currentTask, allTasks) => {
    const currentLastSlotEnd = getLastSlotEndTime(currentTask.slots);
    if (!currentLastSlotEnd) return 0;

    const currentEndMinutes = timeToMinutes(currentLastSlotEnd);
    const maxEndMinutes = timeToMinutes("22:00");
    
    let maxAvailable = Math.floor((maxEndMinutes - currentEndMinutes) / 60);
    
    const nextTask = findNextTask(currentTask, allTasks);
    
    if (nextTask) {
      const currentTaskDate = currentTask.date instanceof Date
        ? currentTask.date.toISOString().split("T")[0]
        : (currentTask.date?.includes("T") ? currentTask.date.split("T")[0] : currentTask.date);
      
      const nextTaskDate = nextTask.date instanceof Date
        ? nextTask.date.toISOString().split("T")[0]
        : (nextTask.date?.includes("T") ? nextTask.date.split("T")[0] : nextTask.date);
      
      const nextTaskFirstSlotStart = getFirstSlotStartTime(nextTask.slots);
      if (nextTaskFirstSlotStart && currentTaskDate && nextTaskDate) {
        const nextStartMinutes = timeToMinutes(nextTaskFirstSlotStart);
        
        if (nextTaskDate === currentTaskDate) {
          const hoursUntilNext = Math.floor((nextStartMinutes - currentEndMinutes) / 60);
          maxAvailable = Math.min(maxAvailable, hoursUntilNext);
        }
      }
    }

    return Math.max(0, maxAvailable);
  };


  const generateExtendedSlots = (currentSlots, extensionHours) => {
    if (extensionHours <= 0) return currentSlots;
    
    const slotsArray = Array.isArray(currentSlots) ? [...currentSlots] : [currentSlots];
    if (slotsArray.length === 0) return currentSlots;
    
    const lastSlot = slotsArray[slotsArray.length - 1];
    if (!lastSlot || typeof lastSlot !== "string") return currentSlots;
    
    const [lastStart, lastEnd] = lastSlot.split("-").map(s => s.trim());
    if (!lastStart || !lastEnd) return currentSlots;
    
    let currentEndMinutes = timeToMinutes(lastEnd);
    const maxEndMinutes = timeToMinutes("22:00");
    const newSlots = [...slotsArray];
    
    for (let i = 0; i < extensionHours; i++) {
      const proposedEndMinutes = currentEndMinutes + 60;
      
      if (proposedEndMinutes > maxEndMinutes) {
    
        if (currentEndMinutes >= maxEndMinutes) {
          break;
        }
        const newStart = minutesToTime(currentEndMinutes);
        newSlots.push(`${newStart}-22:00`);
        break;
      }
      
      const newStart = minutesToTime(currentEndMinutes);
      currentEndMinutes = proposedEndMinutes;
      const newEnd = minutesToTime(currentEndMinutes);
      
      newSlots.push(`${newStart}-${newEnd}`);
    }
    
    return newSlots;
  };

  const handleExtendTime = async (task) => {
    if (processingTask) return;

    try {
      const available = calculateAvailableHours(task, tasks);
      
      if (available <= 0) {
        setModalMessage("No available time slots to extend. You may have a task scheduled immediately after or you've reached the maximum working hours (22:00).");
        return;
      }

      setSelectedTaskForExtension(task);
      setAvailableHours(available);
      setSelectedExtensionHours(0);
      setShowExtendTimeModal(true);
    } catch (error) {
      console.error("Error preparing extend time:", error);
      setModalMessage("An error occurred. Please try again.");
    }
  };

  const handleConfirmExtension = async () => {
    if (!selectedTaskForExtension || selectedExtensionHours <= 0 || processingTask) return;

    try {
      setProcessingTask(selectedTaskForExtension.id);

      const extendedSlots = generateExtendedSlots(
        selectedTaskForExtension.slots,
        selectedExtensionHours
      );

      const { data, error } = await supabase
        .from("hire_requests")
        .update({
          slots: extendedSlots,
        })
        .eq("id", selectedTaskForExtension.id)
        .select();

      if (error) {
        console.error("Error updating slots:", error);
        setModalMessage("Failed to extend task time. Please try again.");
        setProcessingTask(null);
        return;
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTaskForExtension.id
            ? { ...t, slots: extendedSlots }
            : t
        )
      );

      const { error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: selectedTaskForExtension.poster_id,
            message: `The seeker has extended the task by ${selectedExtensionHours} hour(s).`,
            status: "extension",
            read: false,
            related_id: selectedTaskForExtension.task_id,
          },
        ]);

      if (notifError) {
        console.error("Poster notification error:", notifError.message);
      }

      setModalMessage(`Task extended successfully! Added ${selectedExtensionHours} hour(s).`);
      setShowExtendTimeModal(false);
      setSelectedTaskForExtension(null);
      setSelectedExtensionHours(0);
      setProcessingTask(null);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error extending task:", error);
      setModalMessage("An error occurred. Please try again.");
      setProcessingTask(null);
    }
  };

  const handleCancelTask = (task) => {
    setSelectedTaskForCancel(task);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedTaskForCancel || processingTask) return;

    try {
      setProcessingTask(selectedTaskForCancel.id);

      const { error: taskError } = await supabase
        .from("task")
        .update({ seeker_id: null })
        .eq("task_id", selectedTaskForCancel.task_id)
        .eq("seeker_id", userId);

      if (taskError) {
        console.error("Error updating task:", taskError);
        setModalMessage("Failed to cancel task. Please try again.");
        setProcessingTask(null);
        return;
      }

      const { error: hireRequestError } = await supabase
        .from("hire_requests")
        .delete()
        .eq("id", selectedTaskForCancel.id);

      if (hireRequestError) {
        console.error("Error deleting hire request:", hireRequestError);
        setModalMessage("Failed to cancel task. Please try again.");
        setProcessingTask(null);
        return;
      }

      setTasks((prevTasks) =>
        prevTasks.filter((t) => t.id !== selectedTaskForCancel.id)
      );

      const { error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: selectedTaskForCancel.poster_id,
            message: `The seeker has cancelled the task.`,
            status: "cancel",
            read: false,
            related_id: selectedTaskForCancel.task_id,
          },
        ]);

      if (notifError) {
        console.error("Poster notification error:", notifError.message);
      }

      setModalMessage("Task cancelled successfully!");
      setShowCancelModal(false);
      setSelectedTaskForCancel(null);
      setProcessingTask(null);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error cancelling task:", error);
      setModalMessage("An error occurred. Please try again.");
      setProcessingTask(null);
    }
  };


  const handleScheduleRowClick = (scheduleTask) => {
    const taskStatus = (scheduleTask.task_status || "").toLowerCase();
    

    let targetTab = "current";
    if (taskStatus === "pending") {
      targetTab = "pending";
    } else if (taskStatus === "payment_pending") {
      targetTab = "payment_pending";
    } else if (taskStatus === "completed") {
      targetTab = "completed";
    } else {
      targetTab = "current";
    }

    setActiveTab(targetTab);

    setTimeout(() => {
      const element = document.getElementById(`task-${scheduleTask.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("highlighted-request");
        setTimeout(() => {
          element.classList.remove("highlighted-request");
        }, 3000);
      } else {
        setTimeout(() => {
          const retryElement = document.getElementById(`task-${scheduleTask.id}`);
          if (retryElement) {
            retryElement.scrollIntoView({ behavior: "smooth", block: "center" });
            retryElement.classList.add("highlighted-request");
            setTimeout(() => {
              retryElement.classList.remove("highlighted-request");
            }, 3000);
          }
        }, 500);
      }
    }, 500);
  };

  const Modal = ({ message, type = "info", onClose }) => {
    if (!message) return null;

    return (
      <div className="modal-overlay">
        <div
          className={`modal-content ${type === "error" ? "error-modal" : ""}`}
        >
          <div className="modal-left">
            {type === "error" ? "Error" : "Info"}
          </div>
          <div className="modal-right">
            <p>{message}</p>
            <div className="modal-buttons">
              <button className="allow-btn" onClick={onClose}>
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredTasks = tasks.filter((task) => {
    const taskStatus = (task.task_status || "").toLowerCase();
    return taskStatus === activeTab;
  });

  if (loading) {
    return (
      <div className="seeker-loader">
        <div className="loader-spinner"></div>
        <p>Loading your tasks...</p>

        <style>{`
      
        .loader-spinner {
          border: 6px solid #e0e0e0;
          border-top: 6px solid #036586;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          margin-left: 500px;
          margin-top: 200px;
          animation: spin 1s linear infinite;
        }
          .seeker-loader p {
          margin-left: 450px;
          }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .seeker-loader {
          height: 100vh;
          width:1000px;
          font-style: italic;
          font-size: 18px;
          color: #036586;
        }
      `}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .task-completion-options {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #036586;
          border-radius: 16px;
          padding: 24px;
          margin-top: 20px;
          box-shadow: 0 4px 20px rgba(3, 101, 134, 0.15);
        }

        .completion-options-header {
          margin-bottom: 20px;
          text-align: center;
        }

        .completion-options-title {
          font-size: 18px;
          font-weight: 700;
          color: #036586;
          margin: 0 0 8px 0;
        }

        .completion-options-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .completion-options-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .completion-options-buttons {
            grid-template-columns: 1fr;
          }
        }

        .completion-btn {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .completion-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: transparent;
          transition: all 0.3s ease;
        }

        .completion-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          border-color: #036586;
        }

        .completion-btn:hover::before {
          background: #036586;
        }

        .completion-btn:active {
          transform: translateY(0);
        }

        .completion-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .complete-btn:hover {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .complete-btn:hover::before {
          background: #10b981;
        }

        .extend-btn:hover {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .extend-btn:hover::before {
          background: #f59e0b;
        }

        .completion-btn-icon {
          font-size: 32px;
          flex-shrink: 0;
          line-height: 1;
        }

        .completion-btn-content {
          flex: 1;
        }

        .completion-btn-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }

        .completion-btn-description {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        .complete-btn .completion-btn-title {
          color: #059669;
        }

        .extend-btn .completion-btn-title {
          color: #d97706;
        }

        /* Completion Notice Styles (Cleaner) */
        .task-completion-notice {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }

        .completion-notice-content {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .completion-notice-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .completion-notice-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .completion-notice-text strong {
          font-size: 16px;
          color: #92400e;
        }

        .completion-notice-text span {
          font-size: 14px;
          color: #78350f;
        }

        .completion-notice-buttons {
          display: flex;
          gap: 12px;
        }

        .completion-notice-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .complete-notice-btn {
          background: #10b981;
          color: white;
        }

        .complete-notice-btn:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }

        .extend-notice-btn {
          background: #f59e0b;
          color: white;
        }

        .extend-notice-btn:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
        }

        .completion-notice-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Completion Confirmation Modal */
        .
        .completion-confirm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .completion-confirm-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .completion-confirm-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #64748b;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .completion-confirm-close:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .completion-confirm-body {
          padding: 24px;
        }

        .completion-confirm-message {
          font-size: 16px;
          color: #1e293b;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .completion-confirm-task-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .completion-confirm-task-info p {
          margin: 8px 0;
          font-size: 14px;
          color: #475569;
        }

        .completion-confirm-task-info strong {
          color: #1e293b;
          font-weight: 600;
        }

        .completion-confirm-note {
          margin-top: 12px !important;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 13px;
          color: #64748b;
          font-style: italic;
        }

        .completion-confirm-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .completion-confirm-btn-primary,
        .completion-confirm-btn-secondary {
          flex: 1;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .completion-confirm-btn-primary {
          background: #10b981;
          color: white;
          border: none;
        }

        .completion-confirm-btn-primary:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }

        .completion-confirm-btn-secondary {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .completion-confirm-btn-secondary:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #cbd5e1;
        }

        .completion-confirm-btn-primary:disabled,
        .completion-confirm-btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Extension Hours Selection Styles */
        .extension-hours-selection {
          margin-top: 20px;
        }

        .extension-hours-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .extension-hour-btn {
          padding: 14px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .extension-hour-btn:hover:not(:disabled) {
          border-color: #036586;
          background: #f0f9ff;
          transform: translateY(-1px);
        }

        .extension-hour-btn.selected {
          background: #036586;
          color: white;
          border-color: #036586;
        }

        .extension-hour-btn.selected:hover {
          background: #024a6b;
          border-color: #024a6b;
        }

        .extension-hour-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .extension-preview {
          background: #ecfdf5;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .extension-preview p {
          margin: 8px 0;
          font-size: 14px;
          color: #047857;
        }

        .extension-preview strong {
          color: #065f46;
          font-weight: 600;
        }

        /* Schedule Table Styles */
        .schedule-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .schedule-title {
          font-size: 20px;
          font-weight: 700;
          color: #036586;
          margin: 0;
        }

        .schedule-date-picker {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .schedule-date-label {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
        }

        .schedule-date-input {
          padding: 8px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .schedule-date-input:hover {
          border-color: #036586;
        }

        .schedule-date-input:focus {
          outline: none;
          border-color: #036586;
          box-shadow: 0 0 0 3px rgba(3, 101, 134, 0.1);
        }

        .schedule-loading,
        .schedule-empty {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
          font-size: 14px;
        }

        .schedule-table-container {
          overflow-x: auto;
        }

        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .schedule-table thead {
          background: linear-gradient(135deg, #036586 0%, #024a6b 100%);
          color: white;
        }

        .schedule-table th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .schedule-table tbody tr {
          border-bottom: 1px solid #e9ecef;
          transition: all 0.2s ease;
          cursor: pointer;
        }
.schedule-table tbody tr:hover {
  background: #f8f9fa;
  /* transform: translateX(2px);  REMOVE */
}


        .schedule-table tbody tr:last-child {
          border-bottom: none;
        }


        .schedule-table td {
          padding: 16px;
          color: #1e293b;
        }

        .schedule-time {
          font-weight: 600;
          color: #036586;
          white-space: nowrap;
        }

        .schedule-description {
          max-width: 400px;
          line-height: 1.5;
        }

        .schedule-category {
          color: #64748b;
        }

        .schedule-status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .schedule-status-badge.status-current {
          background: #dbeafe;
          color: #1e40af;
        }

        .schedule-status-badge.status-pending {
          background: #fffbeb;
          color: #f59e0b;
        }

        .schedule-status-badge.status-payment_pending {
          background: #fef3c7;
          color: #d97706;
        }

        .schedule-status-badge.status-completed {
          background: #ecfdf5;
          color: #059669;
        }

        @media (max-width: 768px) {
          .schedule-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .schedule-table-container {
            overflow-x: scroll;
          }

          .schedule-table {
            min-width: 600px;
          }

          .schedule-description {
            max-width: 200px;
          }
        }

        /* Cancel Button Styles */
        .seeker-request-btn-cancel {
          background-color: #dc2626;
          color: white;
          border: 2px solid #dc2626;
        }

        .seeker-request-btn-cancel:hover:not(:disabled) {
          background-color: #b91c1c;
          border-color: #b91c1c;
          transform: translateY(-1px);
        }

        .seeker-request-btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
      <style>{`
  /* ===== Cancel Task Modal (uses your existing classes) ===== */
  .completion-confirm-modal-overlay{
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 10000;
    backdrop-filter: blur(6px);
      overflow-y: auto;
  }

  .completion-confirm-modal{
    width: min(560px, 92vw);
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 22px 70px rgba(0,0,0,0.35);
    animation: modalPop 0.22s ease-out;
    padding-top:20px;
    margin-top:70px;
  }

  @keyframes modalPop {
    from { transform: translateY(10px) scale(0.98); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }

  .completion-confirm-header{
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
    border-bottom: 1px solid #f1f5f9;
  }

  .completion-confirm-header h3{
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #991b1b;
    letter-spacing: 0.2px;
  }

  .completion-confirm-close{
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #fecdd3;
    background: #fff;
    color: #991b1b;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: 0.2s ease;
  }
  .completion-confirm-close:hover{
    background: #fff1f2;
    transform: translateY(-1px);
  }

  .completion-confirm-body{
    padding: 20px 20px;
    margin-top:20px;
  }

  .completion-confirm-message{
    margin: 0 0 14px 0;
    font-size: 14px;
    color: #334155;
    line-height: 1.6;
  }

  .completion-confirm-task-info{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
  }

  .completion-confirm-task-info p{
    margin: 8px 0;
    font-size: 13px;
    color: #475569;
  }

  .completion-confirm-task-info strong{
    color: #0f172a;
    font-weight: 700;
  }

  .completion-confirm-note{
    margin-top: 12px !important;
    padding-top: 12px;
    border-top: 1px dashed #e2e8f0;
    color: #64748b;
    font-size: 12.5px;
    font-style: italic;
  }

  .completion-confirm-actions{
    padding: 16px 20px;
    display: flex;
    gap: 12px;
    border-top: 1px solid #f1f5f9;
    background: #ffffff;
  }

  .completion-confirm-btn-primary,
  .completion-confirm-btn-secondary{
    flex: 1;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s ease;
  }

  /* your cancel button is primary with inline backgroundColor; keep it, but refine hover */
  .completion-confirm-btn-primary{
    color: #fff;
    border: none;
    box-shadow: 0 10px 22px rgba(220, 38, 38, 0.25);
  }
  .completion-confirm-btn-primary:hover:not(:disabled){
    transform: translateY(-1px);
    filter: brightness(0.95);
  }

  .completion-confirm-btn-secondary{
    border: 1.5px solid #e2e8f0;
    background: #fff;
    color: #334155;
  }
  .completion-confirm-btn-secondary:hover:not(:disabled){
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }

  .completion-confirm-btn-primary:disabled,
  .completion-confirm-btn-secondary:disabled{
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    filter: none;
    box-shadow: none;
  }

  @media (max-width: 480px){
    .completion-confirm-actions{ flex-direction: column; }
  }
`}</style>

      <div className="seeker-requests-container">
        <div className="seeker-requests-header">
        <h2 className="seeker-requests-title">My Tasks</h2>
        <div className="seeker-requests-count">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="seeker-requests-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${activeTab === "current" ? "active" : ""}`}
            onClick={() => setActiveTab("current")}
          >
            Current
          </button>
          <button
            className={`filter-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${
              activeTab === "payment_pending" ? "active" : ""
            }`}
            onClick={() => setActiveTab("payment_pending")}
          >
            Payment Pending
          </button>
          <button
            className={`filter-btn ${
              activeTab === "completed" ? "active" : ""
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed
          </button>
          <button
            className={`filter-btn ${
              activeTab === "schedule" ? "active" : ""
            }`}
            onClick={() => setActiveTab("schedule")}
          >
            Schedule
          </button>
        </div>
      </div>

      {activeTab === "schedule" && (
        <div className="schedule-section">
          <div className="schedule-header">
            <h3 className="schedule-title">📅 My Schedule</h3>
            <div className="schedule-date-picker">
              <label htmlFor="schedule-date" className="schedule-date-label">
                Select Date:
              </label>
              <input
                type="date"
                id="schedule-date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="schedule-date-input"
              />
            </div>
          </div>

          {loadingSchedule ? (
            <div className="schedule-loading">
              <p>Loading schedule...</p>
            </div>
          ) : scheduleTasks.length === 0 ? (
            <div className="schedule-empty">
              <p>No booked tasks for this date.</p>
            </div>
          ) : (
            <div className="schedule-table-container">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Task Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleTasks.map((scheduleTask) => (
                    <tr
                      key={scheduleTask.id}
                      onClick={() => handleScheduleRowClick(scheduleTask)}
                      className="schedule-row"
                    >
                      <td className="schedule-time">
                        {Array.isArray(scheduleTask.slots)
                          ? scheduleTask.slots.join(", ")
                          : scheduleTask.slots}
                      </td>
                      <td className="schedule-description">
                        {scheduleTask.task?.description || "No description"}
                      </td>
                      <td className="schedule-status">
                        <span
                          className={`schedule-status-badge status-${(
                            scheduleTask.task_status || "current"
                          ).toLowerCase()}`}
                        >
                          {scheduleTask.task_status || "current"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab !== "schedule" && (
        <>
          {tasks.length === 0 || filteredTasks.length === 0 ? (
            <div className="seeker-requests-empty">
              <div className="seeker-requests-empty-icon"></div>
              <p style={{ color: "black" }}>No tasks found for this status.</p>
              <p style={{ color: "black" }} className="seeker-requests-empty-sub">
                Tasks with status "{activeTab}" will appear here.
              </p>
            </div>
          ) : (
        <div className="seeker-requests-list">
          {filteredTasks.map((r) => (
            <div
              key={r.id}
              id={`task-${r.id}`}
              className="seeker-request-card"
            >
              <div className="seeker-request-content">
                <div className="seeker-request-header">
                  <h3 className="seeker-request-poster">
                    Task from {r.profiles?.first_name}{" "}
                    {r.profiles?.last_name}
                  </h3>
                  <span className={`seeker-request-status status-${r.status}`}>
                    {r.status}
                  </span>
                </div>

                {activeTab === "current" &&
                    has30MinutesPassed(r) &&
                    r.task_status?.toLowerCase() === "current" && (
                      <div className="task-completion-notice">
                        <div className="completion-notice-content">
                          <div className="completion-notice-icon">⏰</div>
                          <div className="completion-notice-text">
                            <strong>30 minutes have passed since task start.</strong>
                            <span>Choose an action to proceed:</span>
                          </div>
                        </div>
                        <div className="completion-notice-buttons">
                          <button
                            onClick={() => {
                              setSelectedTaskForCompletion(r);
                              setShowCompletionModal(true);
                            }}
                            disabled={processingTask === r.id}
                            className="completion-notice-btn complete-notice-btn"
                          >
                            ✅ Complete Task
                          </button>
                          <button
                            onClick={() => handleExtendTime(r)}
                            disabled={processingTask === r.id}
                            className="completion-notice-btn extend-notice-btn"
                          >
                            ⏳ Extend Time
                          </button>
                        </div>
                      </div>
                    )}



                <div className="seeker-request-main-content">
                  <div className="task-details">
                    <h4 className="task-section-title">Task Details</h4>
                    <div className="task-details-grid">
                      <div className="task-detail-item">
                        <span className="detail-label">Date</span>
                        <span className="detail-value">{r.date}</span>
                      </div>

                      <div className="task-detail-item slots-item">
                        <span className="detail-label">Time Slots</span>
                        <div className="slots-container">
                          {Array.isArray(r.slots) ? (
                            r.slots.map((slot, idx) => (
                              <span key={idx} className="slot-pill">
                                {slot}
                              </span>
                            ))
                          ) : (
                            <span className="slot-pill">{r.slots}</span>
                          )}
                        </div>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">
                          {r.task_description}
                        </span>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Category</span>
                        <span className="category-badge">
                          {r.task_category}
                        </span>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">
                          {r.task_location || "Not specified"}
                        </span>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Task Status</span>
                        <span className="detail-value">
                          {r.task_status || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="poster-details">
                    <h4 className="poster-section-title">Poster Information</h4>

                    <div className="poster-profile-header">
                      <img
                        src={
                          r.poster_profile_picture ||
                          "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                        }
                        alt="Profile"
                        className="poster-profile-pic"
                      />
                      <div className="poster-name">
                        <div className="poster-full-name">
                          {r.profiles?.first_name} {r.profiles?.last_name}
                        </div>
                        <div className="poster-contact">
                          Click CNIC to verify identity
                        </div>
                      </div>
                    </div>

                    <div className="poster-info-grid">
                      <div className="poster-info-item">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value">
                          {r.profiles?.gender || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">Date of Birth</span>
                        <span className="detail-value">
                          {r.profiles?.date_of_birth || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">Phone #</span>
                        <span className="detail-value">
                          {r.profiles?.phone || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">CNIC Verification</span>
                        {r.profiles?.cnic_url ? (
                          <a
                            href={r.profiles.cnic_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cnic-link"
                          >
                            View CNIC
                          </a>
                        ) : (
                          <span className="detail-value">Not uploaded</span>
                        )}
                      </div>

                      <div className="poster-rating-summary">
                        <span className="detail-label">Rating</span>
                        {r.posterRating ? (
                          <>
                            <span className="detail-value">
                              {r.posterRating.average.toFixed(1)} / 5 (
                              {r.posterRating.count} review
                              {r.posterRating.count !== 1 ? "s" : ""})
                            </span>
                            <button
                              type="button"
                              className="poster-reviews-link"
                              onClick={() => handleViewPosterReviews(r)}
                            >
                              View reviews
                            </button>
                          </>
                        ) : (
                          <span className="detail-value">No ratings yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="seeker-request-actions">
                  

                  {r.status === "accepted" &&
                    activeTab === "current" &&
                    !has30MinutesPassed(r) && (
                      <div className="seeker-request-buttons">
                        <button
                          onClick={() => handleMessage(r)}
                          className="seeker-request-btn seeker-request-btn-message"
                        >
                          Message
                        </button>
                      </div>
                    )}
                  {r.status === "accepted" &&
                    activeTab === "pending" &&
                    r.task_status?.toLowerCase() === "pending" && (
                      <div className="seeker-request-buttons">
                        <button
                          onClick={() => handleMessage(r)}
                          className="seeker-request-btn seeker-request-btn-message"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => handleCancelTask(r)}
                          className="seeker-request-btn seeker-request-btn-cancel"
                          disabled={processingTask === r.id}
                        >
                          {processingTask === r.id ? "Processing..." : "Cancel Task"}
                        </button>
                      </div>
                    )}
                  {r.status === "accepted" &&
                    activeTab !== "current" &&
                    activeTab !== "pending" && (
                      <div className="seeker-request-buttons">
                        <button
                          onClick={() => handleMessage(r)}
                          className="seeker-request-btn seeker-request-btn-message"
                        >
                          Message
                        </button>
                      </div>
                    )}
                  {r.task_status === "completed" && (
                    <div className="seeker-request-buttons">
                      <p className="seeker-request-feedback-text">
                        This task is marked as completed.
                      </p>

                      <button
                        onClick={() => handleProvideRating(r)}
                        className="seeker-request-btn seeker-request-btn-rating"
                      >
                        {r.ratingReview
                          ? "Edit Rating & Review"
                          : "Provide Rating & Review"}
                      </button>

                      <button
                        onClick={() => handleReportComplaint(r)}
                        className="seeker-request-btn seeker-request-btn-complaint"
                      >
                        Report a complaint
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {showReviewsModal && (
        <div className="reviews-modal-overlay">
          <div className="reviews-modal-content">
            <h3>Reviews for {selectedPosterName}</h3>

            {selectedPosterReviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              <ul className="reviews-list">
                {selectedPosterReviews.map((rev) => {
                  const reviewerName = rev.reviewerName || "Anonymous user";
                  const reviewerAvatar =
                    rev.reviewerProfilePicture ||
                    "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";

                  return (
                    <li key={rev.id} className="review-item">
                      <div className="reviewer-header">
                        <img
                          src={reviewerAvatar}
                          alt={reviewerName}
                          className="reviewer-avatar"
                        />
                        <div className="reviewer-info">
                          <div className="reviewer-name">{reviewerName}</div>
                          <div className="review-rating-stars">
                            {renderStars(rev.rating)}
                            <span className="numeric-rating">{rev.rating}/5</span>
                          </div>
                        </div>
                      </div>

                      {rev.review && (
                        <p className="review-text">{rev.review}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              className="close-reviews-btn"
              onClick={() => setShowReviewsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Modal
        message={modalMessage}
        type={modalMessage.includes("conflict") || modalMessage.includes("error") || modalMessage.includes("Failed") ? "error" : "info"}
        onClose={() => setModalMessage("")}
      />

      {showCompletionModal && selectedTaskForCompletion && (
        <div className="completion-confirm-modal-overlay">
          <div className="completion-confirm-modal">
            <div className="completion-confirm-header">
              <h3>Complete Task</h3>
              <button
                className="completion-confirm-close"
                onClick={() => {
                  setShowCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="completion-confirm-body">
              <p className="completion-confirm-message">
                Are you sure you want to mark this task as completed?
              </p>
              <div className="completion-confirm-task-info">
                <p><strong>Task:</strong> {selectedTaskForCompletion.task_description}</p>
                <p><strong>Date:</strong> {selectedTaskForCompletion.date}</p>
                <p><strong>Current Slots:</strong> {
                  Array.isArray(selectedTaskForCompletion.slots)
                    ? selectedTaskForCompletion.slots.join(", ")
                    : selectedTaskForCompletion.slots
                }</p>
                <p className="completion-confirm-note">
                  The task end time will be updated to the nearest hour, and future slots will be removed.
                </p>
              </div>
            </div>
            <div className="completion-confirm-actions">
              <button
                className="completion-confirm-btn-primary"
                onClick={() => {
                  handleCompleteTask(selectedTaskForCompletion);
                  setShowCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                }}
                disabled={processingTask === selectedTaskForCompletion.id}
              >
                {processingTask === selectedTaskForCompletion.id ? "Processing..." : "Confirm & Complete"}
              </button>
              <button
                className="completion-confirm-btn-secondary"
                onClick={() => {
                  setShowCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                }}
                disabled={processingTask === selectedTaskForCompletion.id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtendTimeModal && selectedTaskForExtension && (
        <div className="completion-confirm-modal-overlay">
          <div className="completion-confirm-modal">
            <div className="completion-confirm-header">
              <h3>Extend Task Time</h3>
              <button
                className="completion-confirm-close"
                onClick={() => {
                  setShowExtendTimeModal(false);
                  setSelectedTaskForExtension(null);
                  setSelectedExtensionHours(0);
                }}
              >
                ×
              </button>
            </div>
            <div className="completion-confirm-body">
              <p className="completion-confirm-message">
                Select how many additional hours you want to extend this task:
              </p>
              <div className="completion-confirm-task-info">
                <p><strong>Task:</strong> {selectedTaskForExtension.task_description}</p>
                <p><strong>Date:</strong> {selectedTaskForExtension.date}</p>
                <p><strong>Current Slots:</strong> {
                  Array.isArray(selectedTaskForExtension.slots)
                    ? selectedTaskForExtension.slots.join(", ")
                    : selectedTaskForExtension.slots
                }</p>
                <p><strong>Available Hours:</strong> {availableHours} hour(s) until your next task or 22:00</p>
                <p className="completion-confirm-note">
                  You can extend this task by selecting additional hours. The new slots will be added after your current task ends.
                </p>
              </div>
              
              <div className="extension-hours-selection">
                <div className="extension-hours-grid">
                  {Array.from({ length: availableHours }, (_, i) => i + 1).map((hours) => (
                    <button
                      key={hours}
                      className={`extension-hour-btn ${
                        selectedExtensionHours === hours ? "selected" : ""
                      }`}
                      onClick={() => setSelectedExtensionHours(hours)}
                    >
                      {hours} {hours === 1 ? "Hour" : "Hours"}
                    </button>
                  ))}
                </div>
                {selectedExtensionHours > 0 && (
                  <div className="extension-preview">
                    <p><strong>New End Time:</strong> {
                      (() => {
                        const lastSlotEnd = getLastSlotEndTime(selectedTaskForExtension.slots);
                        if (lastSlotEnd) {
                          const endMinutes = timeToMinutes(lastSlotEnd);
                          const newEndMinutes = endMinutes + (selectedExtensionHours * 60);
                          return minutesToTime(newEndMinutes);
                        }
                        return "N/A";
                      })()
                    }</p>
                    <p><strong>New Slots:</strong> {
                      (() => {
                        const extended = generateExtendedSlots(
                          selectedTaskForExtension.slots,
                          selectedExtensionHours
                        );
                        return Array.isArray(extended) ? extended.join(", ") : extended;
                      })()
                    }</p>
                  </div>
                )}
              </div>
            </div>
            <div className="completion-confirm-actions">
              <button
                className="completion-confirm-btn-primary"
                onClick={handleConfirmExtension}
                disabled={processingTask === selectedTaskForExtension.id || selectedExtensionHours === 0}
              >
                {processingTask === selectedTaskForExtension.id ? "Processing..." : "Confirm Extension"}
              </button>
              <button
                className="completion-confirm-btn-secondary"
                onClick={() => {
                  setShowExtendTimeModal(false);
                  setSelectedTaskForExtension(null);
                  setSelectedExtensionHours(0);
                }}
                disabled={processingTask === selectedTaskForExtension.id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedTaskForCancel && (
        <div className="completion-confirm-modal-overlay">
          <div className="completion-confirm-modal">
            <div className="completion-confirm-header">
              <h3>Cancel Task</h3>
              <button
                className="completion-confirm-close"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedTaskForCancel(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="completion-confirm-body">
              <p className="completion-confirm-message">
                Are you sure you want to cancel this task? This action cannot be undone.
              </p>
              <div className="completion-confirm-task-info">
                <p><strong>Task:</strong> {selectedTaskForCancel.task_description}</p>
                <p><strong>Date:</strong> {selectedTaskForCancel.date}</p>
                <p><strong>Time Slots:</strong> {
                  Array.isArray(selectedTaskForCancel.slots)
                    ? selectedTaskForCancel.slots.join(", ")
                    : selectedTaskForCancel.slots
                }</p>
                <p className="completion-confirm-note">
                  Cancelling this task will remove it from your pending tasks and make it available for other seekers.
                </p>
              </div>
            </div>
            <div className="completion-confirm-actions">
              <button
                className="completion-confirm-btn-primary"
                onClick={handleConfirmCancel}
                disabled={processingTask === selectedTaskForCancel.id}
                style={{ backgroundColor: "#dc2626" }}
              >
                {processingTask === selectedTaskForCancel.id ? "Processing..." : "Yes, Cancel Task"}
              </button>
              <button
                className="completion-confirm-btn-secondary"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedTaskForCancel(null);
                }}
                disabled={processingTask === selectedTaskForCancel.id}
              >
                No, Keep Task
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default MyTasks;

