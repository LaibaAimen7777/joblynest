import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import "../styles/PosterRequests.css";
import { useNavigate } from "react-router-dom";
import PosterLayout from "./PosterLayout";
import Loader from "../components/Loader";

const PosterRequests = ({ onCountChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const handleMessage = (req) => {
    navigate(`/messages/${req.id}`, { state: { request: req } });
  };

  const fetchRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("hire_requests")
      .select("*")
      .eq("poster_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setRequests(data || []);
      onCountChange?.(data?.length || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel("hire-requests-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hire_requests" },
        fetchRequests
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) return <Loader message="Loading your requests..." />;

  const visibleRequests = showAll ? requests : requests.slice(0, 3);

  return (
    <PosterLayout>
      <div className="poster-requests-container">
        <h2 className="poster-requests-title">Seeker Responses</h2>

        <div className="poster-requests-list">
          {visibleRequests.length === 0 ? (
            <p className="poster-requests-empty">No requests sent yet</p>
          ) : (
            visibleRequests.map((req) => (
              <div
                key={req.id}
                className={`poster-request-card status-${req.status}`}
              >
                <p>
                  <strong>Date:</strong> {req.date}
                </p>
                <p>
                  <strong>Slots:</strong> {req.slots?.join(", ")}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge ${req.status}`}>
                    {req.status.toUpperCase()}
                  </span>
                </p>
                {req.status === "accepted" && (
                  <div className="request-actions">
                    <button
                      className="message-btn"
                      onClick={() => handleMessage(req)}
                    >
                      Message
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {requests.length > 3 && (
          <button
            className="show-more-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show More (${requests.length - 3} more)`}
          </button>
        )}
      </div>
    </PosterLayout>
  );
};

export default PosterRequests;
