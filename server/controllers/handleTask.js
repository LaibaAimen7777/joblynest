import { supabase } from "../supabaseClient.js";
import { embedText } from "../utils/embedder.js"; 

export const createTask = async (req, res) => {
  console.log("here in backend for task");

  const {
    poster_id,
    geo_location,
    latitude,
    longitude,
    main_category,
    description,
    payment_type,
    category_id
  } = req.body;

  try {
    const descr_embedding = await embedText(description || "");


    const { data, error } = await supabase
      .from("task")
      .insert([
        {
          poster_id,
          seeker_id: null,
          geo_location,
          latitude,
          longitude,
          main_category,
          description,
          payment_type,
          category_id,

          descr_embedding: JSON.stringify(descr_embedding),
      
        },
      ])

      .select(
        "poster_id, main_category, description,task_id"

      );

    if (error) return res.status(500).json({ error: error.message });

    const newTaskId = data[0].task_id; 
    console.log("newTaskId",newTaskId);

    const { error: paymentError } = await supabase.from("payment").insert([
      {
        task_id: newTaskId, 
      },
    ]);

    if (paymentError) {
      console.error(" Payment insert failed:", paymentError.message);
      return res
        .status(500)
        .json({ error: "Task created but payment record failed" });
    }

    res.status(201).json({
      message: "Task and payment record created successfully",
      task_id: newTaskId, 
      task: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
};


export const getTasksByPoster = async (req, res) => {
  const { poster_id } = req.params;

  try {
    const { data, error } = await supabase
      .from("task")
      .select(
        `
    task_id,
    poster_id,
    seeker_id,
    created_at,
    geo_location,
    latitude,
    longitude,
    main_category,
    description,
    hire_requests(id, status, task_status), 
    seeker (
      seeker_id,
      profile_picture,
      profiles (
        first_name,
        last_name
      )
    )
  `
      )
      .eq("poster_id", poster_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const tasks = data.map((t) => {
      const latestHireRequest = t.hire_requests?.find((hr) =>
        ["pending", "accepted", "rejected", "timed out"].includes(
          hr.status?.toLowerCase().trim()
        )
      );

      return {

        task_id: t.task_id,
        main_category: t.main_category,
        description: t.description,
        created_at: t.created_at,
        status: latestHireRequest?.status || null,
         task_status: latestHireRequest?.task_status || null, 
        hire_request_id: latestHireRequest?.id || null,
        first_name: ["accepted", "pending"].includes(latestHireRequest?.status)
          ? t.seeker?.profiles?.first_name
          : null,
        last_name: ["accepted", "pending"].includes(latestHireRequest?.status)
          ? t.seeker?.profiles?.last_name
          : null,
        profile_picture: ["accepted", "pending"].includes(
          latestHireRequest?.status
        )
          ? t.seeker?.profile_picture
          : null,
      };
    });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
};


export const getHireRequestByTask = async (req, res) => {
  const { task_id } = req.params;
  console.log("task_id in getHireReq",task_id);

  try {
    const { data, error } = await supabase
      .from("hire_requests")
      .select(
        `
        id,
        task_id,
        poster_id,
        date,
        slots,
        seeker_id,
        status,
        created_at
      `
      )
      .eq("task_id", task_id)
      .order("created_at", { ascending: false }) 
      .limit(1) 
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Hire request not found" });

    res.json({ request: data });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
};
