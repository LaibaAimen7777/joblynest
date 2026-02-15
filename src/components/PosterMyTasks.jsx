import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "../styles/PosterMyTasks.css";
import { useLocation } from "react-router-dom";
import PosterLayout from "./PosterLayout";
import Loader from "../components/Loader";

export default function PosterMyTasks({ skipLayout = false }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    taskId: null,
    loading: false,
    success: false,
    error: "",
  });

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get("payment_success");
    const failed = params.get("payment_failed");
    const taskId = params.get("task_id");

    if (!taskId) return;

    const clearParams = () => {
      navigate(window.location.pathname, { replace: true });
    };

    const handleSuccess = async () => {
      setPaymentModal({ taskId, loading: true, success: false, error: "" });
      try {
        const res = await fetch(
          `http://localhost:5000/api/complete-payment/${taskId}`,
          {
            method: "POST",
          }
        );


        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to complete payment");

        setPaymentModal({ taskId, loading: false, success: true, error: "" });

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        setPaymentModal({
          taskId,
          loading: false,
          success: false,
          error: err.message,
        });
      } finally {
        clearParams();
      }
    };

    const handleFail = () => {
      setPaymentModal({
        taskId,
        loading: false,
        success: false,
        error: "Payment cancelled or failed.",
      });
      clearParams();
    };

    if (success === "1") {
      handleSuccess();
    } else if (failed === "1") {
      handleFail();
    }
  }, [location.search]);

  const [highlightTaskId, setHighlightTaskId] = useState(
    location.state?.highlightTaskId || null
  );

  useEffect(() => {
    const handleHighlightEvent = (event) => {
      if (event.detail?.taskId) {
        setHighlightTaskId(event.detail.taskId);
      }
    };

    window.addEventListener("highlightPaymentPendingTask", handleHighlightEvent);
    return () => {
      window.removeEventListener(
        "highlightPaymentPendingTask",
        handleHighlightEvent
      );
    };
  }, []);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelConfirm, setCancelConfirm] = useState({
    show: false,
    taskId: null,
    loading: false,
    error: "",
  });
  const [cashPaymentModal, setCashPaymentModal] = useState({
    show: false,
    taskId: null,
    amount: null,
    numSlots: null,
    hourlyRate: null,
  });
  const isTaskExpired = (jobDate, slot) => {
    if (!jobDate || !slot) return false;

    const slotString = Array.isArray(slot) ? slot[0] : slot;
    const [start, end] = slotString.split("-").map((s) => s.trim());
    const endDateTime = new Date(`${jobDate} ${end}`);

    return new Date() > endDateTime;
  };
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true;

    if (statusFilter === "timedout") {
      const status = (task.status || "").toLowerCase();
      return status === "timed out";
    }

    if (statusFilter === "completed") {
      return task.payment && task.payment.status === "completed";
    }

    const status = (task.status || "").toLowerCase();
    return status === statusFilter;
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
 const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
if (userError || !user) {
  setLoading(false);
  return;
}

const res = await fetch(
  `http://localhost:5000/api/my-tasks/${user.id}`
);

let data;
try {
  data = await res.json();
} catch (e) {
  console.error(" Failed to parse JSON from /api/my-tasks:", e);
  throw new Error("Failed to fetch tasks (invalid JSON from server)");
}

console.log(" /api/my-tasks response:", res.status, data);

if (!res.ok) {
  throw new Error(
    data?.error || `Failed to fetch tasks (status ${res.status})`
  );
}

let ratingsMap = new Map();
try {
  const ratingsRes = await fetch(
    `http://localhost:5000/api/rating-reviews/by-reviewer/${user.id}`
  );
  if (ratingsRes.ok) {
    const ratingsJson = await ratingsRes.json();
    (ratingsJson.ratings || []).forEach((r) => {
      ratingsMap.set(r.task_id, r); 
    });
  }
} catch (e) {
  console.error("Failed to fetch ratings for poster:", e);
}

const enriched = await Promise.all(
  (data.tasks || []).map(async (task) => {
    try {
      const res2 = await fetch(
        `http://localhost:5000/api/hire-request-by-task/${task.task_id}`
      );
      const hrData = await res2.json();
      const hireRequest = res2.ok ? hrData.request : null;

      const res3 = await fetch(
        `http://localhost:5000/api/payment-by-task/${task.task_id}`
      );
      const payData = await res3.json();
      const payment = res3.ok ? payData.payment : null;

      const ratingReview = ratingsMap.get(task.task_id) || null;

      return { ...task, hireRequest, payment, ratingReview };
    } catch (err) {
      return { ...task, hireRequest: null, payment: null, ratingReview: null };
    }
  })
);

console.log("enriched", enriched);
setTasks(enriched);


      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    if (highlightTaskId && tasks.length > 0) {
      const scrollToTask = () => {
        const el = document.getElementById(`task-${highlightTaskId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("just-scrolled");
          setTimeout(() => el.classList.remove("just-scrolled"), 3000);
          return true;
        }
        return false;
      };

      setTimeout(() => {
        if (!scrollToTask()) {
          setTimeout(() => {
            if (!scrollToTask()) {
              setTimeout(scrollToTask, 500);
            }
          }, 500);
        }
      }, 300);
    }
  }, [highlightTaskId, tasks]);

  if (loading) {
    return <Loader message="Loading your Tasks..." />;
  }

  if (error) return <p>Error: {error}</p>;

  const handlePending = async (task_id) => {
    try {
      console.log("➡️ Sending to backend:", { task_id });
      const res = await fetch("http://localhost:5000/api/handlePending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to handle pending task");
      }

      navigate(`/recommendations/${task_id}`);
    } catch (err) {
      console.error("Error handling pending task:", err.message);
      alert(" Failed to process. Please try again.");
    }
  };

  const handleReportComplaint = (task) => {
    navigate("/report-complaint", {
      state: {
        taskId: task.task_id,
        seekerId: task.hireRequest?.seeker_id, 
        seekerName:
          task.first_name && task.last_name
            ? `${task.first_name} ${task.last_name}`
            : null,
      },
    });
  };
   
      
  const handleProvideRating = (task) => {
  navigate("/provide-rating", {
    state: {
      taskId: task.task_id,
      seekerId: task.hireRequest?.seeker_id || null,
      seekerName:
        task.first_name && task.last_name
          ? `${task.first_name} ${task.last_name}`
          : null,
      existingRating: task.ratingReview?.rating || null,
      existingReview: task.ratingReview?.review || "",
    },
  });
};

  const handleCancelSeeker = async (task_id) => {
    setCancelConfirm({ show: false, taskId: null, loading: false, error: "" });
    try {
      setCancelConfirm({ show: false, taskId: task_id, loading: true, error: "" });
      const res = await fetch("http://localhost:5000/api/cancel-seeker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel seeker");
      }

      window.location.reload();
    } catch (err) {
      console.error("Error canceling seeker:", err.message);
      setCancelConfirm({
        show: false,
        taskId: null,
        loading: false,
        error: err.message,
      });
      alert("Failed to cancel seeker. Please try again.");
    }
  };




  const content = (
    <div
      style={{
        backgroundColor: "#d6edf8ff",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
        <div className="posterTasks-container">
          <h2 className="posterTasks-heading">My Tasks</h2>
        </div>
        <div className="status-buttons">
          {[
            "all",
            "pending",
            "accepted",
            "rejected",
            "timedout",
            "completed",
          ].map((status) => {
            const labelMap = {
              all: "All",
              pending: "Pending",
              accepted: "Accepted",
              rejected: "Rejected",
              timedout: "Timed Out",
              completed: "Completed",
            };

            return (
              <button
                key={status}
                className={`status-btn ${status} ${
                  statusFilter === status ? "active" : ""
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {labelMap[status]}
              </button>
            );
          })}
        </div>

        {filteredTasks.length === 0 ? (
          <p className="posterTasks-empty">No tasks for this status.</p>
        ) : (
          <ul className="posterTasks-list">
            {filteredTasks.map((task) => (
              <li
                key={task.task_id}
                id={`task-${task.task_id}`}
                className={`posterTasks-card ${
                  highlightTaskId === task.task_id ? "highlighted-task" : ""
                }`}
              >
                <h3>{task.main_category}</h3>
                <p>{task.description}</p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(task.created_at).toLocaleDateString()}
                </p>

                {!task.first_name &&
                  task.payment?.status !== "completed" &&
                  (task.status || "").toLowerCase() !== "accepted" &&
                  (task.status || "").toLowerCase() !== "rejected" && (
                    <button
                      className="tap-to-select-btn"
                      onClick={() => handlePending(task.task_id)}
                    >
                      {task.status?.toLowerCase() === "timed out"
                        ? "Seeker did not respond (tap to select another seeker)"
                        : "No seeker selected (tap to select)"}
                    </button>
                  )}

                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`posterTasks-status ${
                      task.payment?.status === "completed"
                        ? "completed"
                        : task.status?.toLowerCase().replace(/\s/g, "-")
                    }`}
                  >
                    {task.payment?.status === "completed"
                      ? "Completed"
                      : task.status || "No Hire Request"}
                  </span>
                </p>

                {task.first_name &&
                  ["accepted", "pending"].includes(
                    task.status?.toLowerCase()
                  ) && (
                    <p>
                      <strong>Seeker:</strong>{" "}
                      {task.profile_picture && (
                        <img
                          src={task.profile_picture}
                          alt="Seeker"
                          className="posterTasks-avatar"
                        />
                      )}
                      {task.first_name} {task.last_name}
                    </p>
                  )}

                {!task.first_name &&
                  task.payment?.status !== "completed" &&
                  (task.status || "").toLowerCase() !== "accepted" &&
                  (task.status || "").toLowerCase() !== "rejected" && (
                    <p className="tap-to-select">
                      {task.status?.toLowerCase() === "timed out"
                        ? "Seeker did not respond"
                        : "No seeker selected"}
                    </p>
                  )}
                
                {!["rejected", "timed out", "timedout", "cancelled"].includes(
                  (task.status || "").toLowerCase()
                ) && (
                  <>
                    {task.hireRequest?.date && (
                      <p>
                        <strong>Task Date:</strong> {task.hireRequest.date}
                      </p>
                    )}

                    {task.hireRequest?.slots?.length > 0 && (
                      <p>
                        <strong>Time Slot:</strong>{" "}
                        {Array.isArray(task.hireRequest.slots)
                          ? task.hireRequest.slots.join(", ")
                          : task.hireRequest.slots}
                      </p>
                    )}
{task.payment?.status === "completed" && (
  <>
    <p
      className="payment-completed-text"
      style={{ marginTop: "8px" }}
    >
      ✅ Payment completed for this task.
    </p>

  <button
  className="posterTasks-btn rating-btn"
  onClick={(e) => {
    e.stopPropagation();
    handleProvideRating(task);
  }}
  style={{ marginTop: "8px" }}
>
  {task.ratingReview ? "Edit Rating & Review" : "Provide Rating & Reviews"}
</button>


    <button
      className="posterTasks-btn complaint-btn"
      onClick={(e) => {
        e.stopPropagation();
        handleReportComplaint(task);
      }}
      style={{ marginTop: "8px" }} 
    >
      Report Complaint
    </button>
  </>
)}


                  </>
                )}

                {["pending", "cancelled", "rejected"].includes(
                  task.status?.toLowerCase()
                ) && (
                  <button
                    className="posterTasks-btn hire-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask({ task_id: task.task_id });
                      setShowConfirm(true);
                    }}
                    
                  >
                    Hire Another Seeker for this Task
                  </button>
                )}
                {task.first_name &&
                  task.status?.toLowerCase() === "accepted" && (
                    <>
                      <button
                        className="posterTasks-btn message-btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(
                              `http://localhost:5000/api/hire-request-by-task/${task.task_id}`
                            );
                            const data = await res.json();

                            if (!res.ok)
                              throw new Error(
                                data.error || "Failed to fetch hire request"
                              );

                            const hireRequest = data.request;

                            navigate(`/messages/${hireRequest.id}`, {
                              state: { request: hireRequest },
                            });
                          } catch (err) {
                            console.error(
                              "Error fetching hire request:",
                              err.message
                            );
                            alert("Failed to open chat. Please try again.");
                          }
                        }}
                      >
                        Message Seeker
                      </button>
                      {task.task_status?.toLowerCase() === "pending" && (
                        <button
                          className="posterTasks-btn cancel-seeker-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelConfirm({
                              show: true,
                              taskId: task.task_id,
                              loading: false,
                              error: "",
                            });
                          }}
                        >
                          Cancel This Seeker
                        </button>
                      )}
                    </>
                  )}
                
                {task.payment?.status === "pending" && (
                  <button
                    className="posterTasks-btn payment-btn"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        setPaymentModal({
                          taskId: task.task_id,
                          loading: true,
                          success: false,
                          error: "",
                        });

                        const paymentDetailsRes = await fetch(
                          `http://localhost:5000/api/payment-details/${task.task_id}`
                        );

                        if (!paymentDetailsRes.ok) {
                          const errorData = await paymentDetailsRes.json();
                          throw new Error(
                            errorData.error || "Failed to fetch payment details"
                          );
                        }

                        const paymentDetails = await paymentDetailsRes.json();

                        if (paymentDetails.paymentType === "Cash Payment") {
                          setCashPaymentModal({
                            show: true,
                            taskId: task.task_id,
                            amount: paymentDetails.totalPayment,
                            numSlots: paymentDetails.numSlots,
                            hourlyRate: paymentDetails.hourlyRate,
                          });
                          setPaymentModal({
                            taskId: null,
                            loading: false,
                            success: false,
                            error: "",
                          });
                        } else {
                          const res = await fetch(
                            "http://localhost:5000/api/create-checkout-session",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ task_id: task.task_id }),
                            }
                          );

                          const data = await res.json();
                          if (!res.ok)
                            throw new Error(
                              data.error ||
                                "Failed to create checkout session"
                            );

                          window.location.href = data.url;
                        }
                      } catch (err) {
                        setPaymentModal({
                          taskId: task.task_id,
                          loading: false,
                          success: false,
                          error: err.message,
                        });
                      }
                    }}
                    disabled={paymentModal.loading}
                  >
                    {paymentModal.loading ? "Processing..." : "Proceed to Payment"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {showConfirm && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h3>Are you sure you want to choose another seeker?</h3>
              <div className="confirm-buttons">
                <button
                  className="yes-btn"
                  onClick={() => {
                    handlePending(selectedTask.task_id);
                    setShowConfirm(false);
                  }}
                >
                  Yes
                </button>
                <button
                  className="no-btn"
                  onClick={() => setShowConfirm(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
        {paymentModal.taskId && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              {paymentModal.loading && <p>Processing payment...</p>}
              {paymentModal.success && (
                <>
                  <h3>✅ Payment Completed!</h3>
                  <p>
                    Your payment for Task #{paymentModal.taskId} has been
                    recorded.
                  </p>
                  <button
                    className="yes-btn"
                    onClick={() =>
                      setPaymentModal({
                        taskId: null,
                        loading: false,
                        success: false,
                        error: "",
                      })
                    }
                  >
                    Close
                  </button>
                </>
              )}
              {paymentModal.error && (
                <>
                  <h3> Payment Failed</h3>
                  <p>{paymentModal.error}</p>
                  <button
                    className="yes-btn"
                    onClick={() =>
                      setPaymentModal({
                        taskId: null,
                        loading: false,
                        success: false,
                        error: "",
                      })
                    }
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        
        {cancelConfirm.show && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h3>Cancel This Seeker?</h3>
              <p>
                Are you sure you want to cancel this seeker for this task? This will allow you to hire another seeker.
              </p>
              <div className="confirm-buttons">
                <button
                  className="yes-btn"
                  onClick={() => handleCancelSeeker(cancelConfirm.taskId)}
                  disabled={cancelConfirm.loading}
                >
                  {cancelConfirm.loading ? "Cancelling..." : "Yes, Cancel Seeker"}
                </button>
                <button
                  className="no-btn"
                  onClick={() =>
                    setCancelConfirm({
                      show: false,
                      taskId: null,
                      loading: false,
                      error: "",
                    })
                  }
                  disabled={cancelConfirm.loading}
                >
                  No, Keep Seeker
                </button>
              </div>
            </div>
          </div>
        )}

        {cashPaymentModal.show && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h3>💰 Cash Payment Required</h3>
              <div className="payment-details">
                <p>
                  <strong>Hourly Rate:</strong> PKR {" "}
                  {cashPaymentModal.hourlyRate?.toFixed(2)}
                </p>
                <p>
                  <strong>Number of Hours/Slots:</strong>{" "}
                  {cashPaymentModal.numSlots}
                </p>
                <p style={{ borderTop: "1px solid #ddd", paddingTop: "10px", marginTop: "10px" }}>
                  <strong>Total Payment:</strong> PKR {cashPaymentModal.hourlyRate?.toFixed(2)} × {cashPaymentModal.numSlots} = <span style={{ fontSize: "18px", color: "#2ecc71" }}>PKR {cashPaymentModal.amount?.toFixed(2)}</span>
                </p>
              </div>
              <p style={{ marginTop: "15px", fontWeight: "500" }}>
                Please pay the amount <strong>directly to the seeker</strong> in cash.
                Once you have completed the payment, click the button below to mark the task as completed.
              </p>
              <div className="confirm-buttons">
                <button
                  className="yes-btn"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `http://localhost:5000/api/complete-payment/${cashPaymentModal.taskId}`,
                        { method: "POST" }
                      );
                      if (!res.ok) throw new Error("Failed to complete payment");
                      setCashPaymentModal({
                        show: false,
                        taskId: null,
                        amount: null,
                        numSlots: null,
                        hourlyRate: null,
                      });
                      window.location.reload();
                    } catch (err) {
                      alert("Failed to mark task as completed. Please try again.");
                    }
                  }}
                >
                  ✓ I've Paid the Seeker
                </button>
                <button
                  className="no-btn"
                  onClick={() =>
                    setCashPaymentModal({
                      show: false,
                      taskId: null,
                      amount: null,
                      numSlots: null,
                      hourlyRate: null,
                    })
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  if (skipLayout) {
    return content;
  }

  return <PosterLayout>{content}</PosterLayout>;
}
