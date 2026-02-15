import React, { useState, useEffect } from "react";
import "../styles/AvailabilityForm.css";
import supabase from "../supabaseClient";

const startHour = 8;
const endHour = 22;

const times = Array.from(
  { length: endHour - startHour + 1 },
  (_, i) => `${(startHour + i).toString().padStart(2, "0")}:00`
);

const getNext7Days = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const AvailabilityForm = ({ setSelectedView, isProfileIncomplete }) => {
  const [availability, setAvailability] = useState({});
  const [selectedDay, setSelectedDay] = useState(getNext7Days()[0]);
  const [userId, setUserId] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");
  const [nextView, setNextView] = useState(null);

  const showModal = (msg, type = "success") => {
    setModalMessage(msg);
    setModalType(type);
  };

  const closeModal = () => {
    setModalMessage("");
    setModalType("success");
  };

  const getUserIdFromSupabase = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      showModal("Unable to fetch user.", "error");
      return null;
    }
    return user.id;
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      const id = await getUserIdFromSupabase();
      if (!id) return;

      setUserId(id);

      try {
        const response = await fetch(
          `http://localhost:5000/api/availability/${id}`
        );
        const data = await response.json();

        const defaultAvailability = {};
        getNext7Days().forEach((day) => {
          defaultAvailability[day] = [];
        });

        if (data.availability) {
          const merged = { ...defaultAvailability, ...data.availability };
          setAvailability(merged);
        } else {
          setAvailability(defaultAvailability);
        }
      } catch (error) {
        showModal("Error fetching availability:", "error");
      }
    };

    fetchAvailability();
  }, []);

  const addSlot = () => {
    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;

    if (!start || !end || start >= end) {
      showModal("Invalid: Check time ranges.", "error");
      return;
    }

    const earliest = "08:00";
    const latest = "22:00";
    if (start < earliest || end > latest) {
      showModal("Please select time between 08:00 and 22:00.", "error");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const newSlot = { start, end };
    const daySlots = availability[selectedDay] || [];

    const toMinutes = (t) => {
      if (!t || !t.includes(":")) return null;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const newStartMin = toMinutes(start);
    const newEndMin = toMinutes(end);

    const overlap = daySlots.some((slot) => {
      const slotStartMin = toMinutes(slot.start);
      const slotEndMin = toMinutes(slot.end);

      if (slotStartMin === null || slotEndMin === null) return false;

      return newStartMin < slotEndMin && newEndMin > slotStartMin;
    });

    if (overlap) {
      showModal("Overlap with existing slot.", "error");
      return;
    }

    const updated = [...daySlots, newSlot].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    setAvailability({ ...availability, [selectedDay]: updated });
  };

  const removeSlot = (index) => {
    const updated = [...(availability[selectedDay] || [])];
    updated.splice(index, 1);
    setAvailability({ ...availability, [selectedDay]: updated });
  };

  const saveAvailability = async () => {
    if (!userId) {
      showModal("User not found.", "error");
      return;
    }

    const weeklyPattern = {};
    Object.keys(availability).forEach((dateStr) => {
      const d = new Date(dateStr);
      const weekday = d
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      weeklyPattern[weekday] = availability[dateStr];
    });

    const allEmpty = Object.values(weeklyPattern).every(
      (daySlots) => daySlots.length === 0
    );
    if (allEmpty) {
      showModal(
        "Error: You must select at least one time slot before saving.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, availability: weeklyPattern }),
      });

      const data = await response.json();

      if (!data.message) {
        showModal("Failed to save availability.", "error");
        return;
      }

      const { data: seekerRow, error: seekerError } = await supabase
        .from("seeker")
        .select("pay_rate")
        .eq("seeker_id", userId)
        .single();

      const hasPayRate = seekerRow && seekerRow.pay_rate;

      if (!hasPayRate) {
        showModal(
          "Availability saved. Please complete your profile details next.",
          "success"
        );
        setNextView("editProfile");
      } else {
        showModal(
          "Availability saved. Your profile and availability are now updated.",
          "success"
        );
        setNextView("profile");
      }
    } catch (err) {
      console.error(err);
      showModal("Failed to save availability.", "error");
    }
  };

  const handleModalOk = () => {
    closeModal();

    if (nextView && typeof setSelectedView === "function") {
      setSelectedView(nextView);
      setNextView(null);
    }
  };

  return (
    <>
      {modalMessage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-left">
              <h3
                style={{
                  color: modalType === "error" ? "#e74c3c" : "#0a632fff",
                  marginBottom: "12px",
                }}
              >
                {modalType === "error" ? "Error" : "Success"}
              </h3>
            </div>
            <div className="modal-right">
              <p>{modalMessage}</p>
              <div className="modal-buttons">
                <button className="allow-btn" onClick={handleModalOk}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          width: "1100px",
          paddingTop: "0px",
          paddingBottom: "60px",
          display: "flex",
          justifyContent: "center",
          alignItems: "start",
          background: "rgba(255, 255, 255, 0.15)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="availability-container">
          <div className="availability-card">
            <h2>
              Set Availability{" "}
              <span className="italic-text">(Next 7 Days)</span>
            </h2>
            <div className="calendar-days">
              {getNext7Days().map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={selectedDay === day ? "active-day" : ""}
                >
                  {new Date(day).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </button>
              ))}
            </div>

            <div className="slot-form">
              <select id="startTime">
                <option value="">Start</option>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select id="endTime">
                <option value="">End</option>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <button className="add-btn" onClick={addSlot}>
                + Add Slot
              </button>
            </div>

            <div className="slots">
              {(availability[selectedDay] || []).map((slot, i) => (
                <div key={i} className="slot">
                  {slot.start} - {slot.end}
                  <button onClick={() => removeSlot(i)}>✕</button>
                </div>
              ))}
            </div>

            <button className="save-btn" onClick={saveAvailability}>
              Save Availability
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AvailabilityForm;
